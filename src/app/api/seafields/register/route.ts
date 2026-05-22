import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase-service";
import { escapeHtml } from "@/lib/html-escape";
import { sendTemplated } from "@/lib/email/send";
import { forwardRegistrationToGHL } from "@/lib/ghl";
import { z } from "zod";

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30).nullable().optional(),
  lots_selected: z
    .array(z.string().regex(/^L\d{1,3}$/))
    .min(1, "Please select at least one lot"),
  interest_type: z.string().max(100).nullable().optional(),
  price_preferences: z.record(z.string(), z.string()).optional(),
  dwelling_preferences: z
    .record(
      z.string().regex(/^L\d{1,3}$/),
      z.object({
        primary: z.string().max(50).nullable().optional(),
        secondary: z.string().max(50).nullable().optional(),
      }),
    )
    .optional(),
  // Location
  suburb: z.string().max(100).nullable().optional(),
  postcode: z.string().max(4).nullable().optional(),
  // Buyer profile
  buyer_type: z.string().max(50).nullable().optional(),
  buyer_profile: z.string().max(50).nullable().optional(),
  current_housing: z.string().max(50).nullable().optional(),
  purchase_timeline: z.string().max(50).nullable().optional(),
  finance_status: z.string().max(50).nullable().optional(),
  how_heard: z.string().max(50).nullable().optional(),
  // Referrer
  referrer_type: z.string().max(50).nullable().optional(),
  referrer_name: z.string().max(200).nullable().optional(),
  referrer_company: z.string().max(200).nullable().optional(),
  referrer_contact: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "You must acknowledge this is a registration of interest only",
    }),
  }),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createSupabaseService();

  // F2KSFLDS-8: server-side Stage-1 launch gate. The seafields_public_lots
  // view filters out non-public stages; we additionally require the lot
  // to live in the public bucket and to belong to a stage that is open
  // for registration. Reserved (but public-bucket) lots are allowed so
  // backup_list registrations can be recorded for future release flows.
  const lotNumbers = d.lots_selected.map((l) => parseInt(l.slice(1), 10));
  const { data: viewRows, error: viewErr } = await (supabase
    .from("seafields_public_lots") as any)
    .select(
      "lot_number, status, allocation_bucket, is_open_for_registration, stage_id",
    )
    .in("lot_number", lotNumbers);

  if (viewErr) {
    console.error("Seafields registration lot-lookup error:", viewErr);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }

  type ViewRow = {
    lot_number: number;
    status: string;
    allocation_bucket: string | null;
    is_open_for_registration: boolean;
    stage_id: string | null;
  };
  const viewByNumber = new Map<number, ViewRow>(
    ((viewRows as ViewRow[]) || []).map((r) => [r.lot_number, r]),
  );

  for (const n of lotNumbers) {
    const r = viewByNumber.get(n);
    if (!r) {
      return NextResponse.json(
        { error: `Lot ${n} is not available for registration.` },
        { status: 400 },
      );
    }
    if (r.allocation_bucket !== "public" || !r.is_open_for_registration) {
      return NextResponse.json(
        { error: `Lot ${n} is not open for public registration yet.` },
        { status: 400 },
      );
    }
    if (r.status === "sold" || r.status === "withheld") {
      return NextResponse.json(
        { error: `Lot ${n} is not available.` },
        { status: 400 },
      );
    }
  }

  const { data: insertedReg, error } = await (supabase.from("seafields_registrations") as any)
    .insert({
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      phone: d.phone ?? null,
      lots_selected: d.lots_selected,
      interest_type: d.interest_type ?? null,
      price_preferences: d.price_preferences ?? {},
      dwelling_preferences: d.dwelling_preferences ?? {},
      suburb: d.suburb ?? null,
      postcode: d.postcode ?? null,
      buyer_type: d.buyer_type ?? null,
      buyer_profile: d.buyer_profile ?? null,
      current_housing: d.current_housing ?? null,
      purchase_timeline: d.purchase_timeline ?? null,
      finance_status: d.finance_status ?? null,
      how_heard: d.how_heard ?? null,
      referrer_type: d.referrer_type ?? null,
      referrer_name: d.referrer_name ?? null,
      referrer_company: d.referrer_company ?? null,
      referrer_contact: d.referrer_contact ?? null,
      notes: d.notes ?? null,
      consent: true,
      source: "web-roi",
    } as never)
    .select("id")
    .single();

  if (error || !insertedReg?.id) {
    console.error("Seafields registration insert error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }

  const registrationId: string = insertedReg.id;

  // F2KSFLDS-8: dual-write into the registration_lots join table. One row
  // per (registration × lot). registration_type is derived from the lot's
  // current status — Reserved lots become 'backup_list', everything else
  // is 'primary'. stage_at_registration_id captures which stage the lot
  // was in at the moment of submission so later price-protection emails
  // can fan out correctly.
  const joinRows = lotNumbers.map((lotNumber) => {
    const row = viewByNumber.get(lotNumber)!;
    const isReserved = row.status === "reserved";
    return {
      registration_id: registrationId,
      lot_number: lotNumber,
      registration_type: isReserved ? "backup_list" : "primary",
      status: "active",
      stage_at_registration_id: row.stage_id,
    };
  });

  if (joinRows.length > 0) {
    const { error: joinErr } = await (supabase.from("seafields_registration_lots") as any)
      .upsert(joinRows, { onConflict: "registration_id,lot_number", ignoreDuplicates: true });
    if (joinErr) {
      console.error("Seafields registration_lots dual-write error:", joinErr);
      // Non-fatal: the registration row itself succeeded. Migration 0004's
      // back-fill (or a future repair pass) can reconcile gaps. Don't fail
      // the user-facing submission.
    }
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_id: null,
    actor_email: d.email,
    action: "seafields_roi_submitted",
    entity_type: "seafields_registration",
    entity_id: null,
    details: {
      name: `${d.first_name} ${d.last_name}`,
      lots: d.lots_selected,
      interest_type: d.interest_type,
      price_preferences: d.price_preferences,
      dwelling_preferences: d.dwelling_preferences,
      location: d.suburb ? `${d.suburb} ${d.postcode || ""}`.trim() : null,
      buyer_type: d.buyer_type,
      buyer_profile: d.buyer_profile,
      referrer: d.referrer_name ? `${d.referrer_name} (${d.referrer_type})` : null,
    },
  });

  // Email notification via Resend
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // lot IDs match /^L\d{1,3}$/ (validated by Zod) — safe to interpolate,
    // but we still escape for defense in depth.
    const lotList = d.lots_selected
      .map((l) => escapeHtml(l.replace("L", "Lot ")))
      .join(", ");
    const priceRows = d.price_preferences
      ? Object.entries(d.price_preferences)
          .map(
            ([lid, range]) =>
              `<tr><td style="padding:2px 12px;color:#666">${escapeHtml(lid.replace("L", "Lot "))}</td><td style="padding:2px 12px">${escapeHtml(range)}</td></tr>`
          )
          .join("")
      : "";
    const dwellingRows = d.dwelling_preferences
      ? Object.entries(d.dwelling_preferences)
          .filter(([, dw]) => dw && (dw.primary || dw.secondary))
          .map(
            ([lid, dw]) =>
              `<tr><td style="padding:2px 12px;color:#666">${escapeHtml(lid.replace("L", "Lot "))}</td><td style="padding:2px 12px">${escapeHtml(dw.primary || "—")}</td><td style="padding:2px 12px">${escapeHtml(dw.secondary || "—")}</td></tr>`
          )
          .join("")
      : "";
    const referrerRow =
      d.referrer_name
        ? `<tr><td style="padding:4px 12px;color:#666">Referrer</td><td style="padding:4px 12px">${escapeHtml(d.referrer_name)}${d.referrer_company ? ` — ${escapeHtml(d.referrer_company)}` : ""}${d.referrer_contact ? ` (${escapeHtml(d.referrer_contact)})` : ""} [${escapeHtml(d.referrer_type)}]</td></tr>`
        : "";
    // Pre-escape every user-controlled field used in the HTML template below.
    const e = {
      first_name: escapeHtml(d.first_name),
      last_name: escapeHtml(d.last_name),
      email: escapeHtml(d.email),
      emailHref: encodeURIComponent(d.email),
      phone: escapeHtml(d.phone),
      suburb: escapeHtml(d.suburb),
      postcode: escapeHtml(d.postcode),
      interest_type: escapeHtml(d.interest_type),
      buyer_type: escapeHtml(d.buyer_type),
      buyer_profile: escapeHtml(d.buyer_profile),
      current_housing: escapeHtml(d.current_housing),
      purchase_timeline: escapeHtml(d.purchase_timeline),
      finance_status: escapeHtml(d.finance_status),
      how_heard: escapeHtml(d.how_heard),
      notes: escapeHtml(d.notes),
    };

    // Admin notification
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Seafields Estate <onboarding@resend.dev>",
      to: [
        "dennis@factory2key.com.au",
        "uwe@factory2key.com.au",
        "barryh@hld.com.au",
      ],
      subject: `Seafields ROI: ${d.first_name} ${d.last_name} — ${d.lots_selected.map((l) => l.replace("L", "Lot ")).join(", ")}`,
      html: `
        <h2 style="color:#1A2744;font-family:sans-serif">New Seafields Estate Registration</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:4px 12px;color:#666">Name</td><td style="padding:4px 12px;font-weight:bold">${e.first_name} ${e.last_name}</td></tr>
          <tr><td style="padding:4px 12px;color:#666">Email</td><td style="padding:4px 12px"><a href="mailto:${e.emailHref}">${e.email}</a></td></tr>
          ${d.phone ? `<tr><td style="padding:4px 12px;color:#666">Phone</td><td style="padding:4px 12px">${e.phone}</td></tr>` : ""}
          ${d.suburb ? `<tr><td style="padding:4px 12px;color:#666">Location</td><td style="padding:4px 12px">${e.suburb}${d.postcode ? ` ${e.postcode}` : ""}</td></tr>` : ""}
          ${d.interest_type ? `<tr><td style="padding:4px 12px;color:#666">Interest</td><td style="padding:4px 12px;font-weight:bold">${e.interest_type}</td></tr>` : ""}
          ${d.buyer_type ? `<tr><td style="padding:4px 12px;color:#666">Buyer Type</td><td style="padding:4px 12px">${e.buyer_type}</td></tr>` : ""}
          ${d.buyer_profile ? `<tr><td style="padding:4px 12px;color:#666">Profile</td><td style="padding:4px 12px">${e.buyer_profile}</td></tr>` : ""}
          ${d.current_housing ? `<tr><td style="padding:4px 12px;color:#666">Current Housing</td><td style="padding:4px 12px">${e.current_housing}</td></tr>` : ""}
          ${d.purchase_timeline ? `<tr><td style="padding:4px 12px;color:#666">Timeline</td><td style="padding:4px 12px">${e.purchase_timeline}</td></tr>` : ""}
          ${d.finance_status ? `<tr><td style="padding:4px 12px;color:#666">Finance</td><td style="padding:4px 12px">${e.finance_status}</td></tr>` : ""}
          ${d.how_heard ? `<tr><td style="padding:4px 12px;color:#666">How Heard</td><td style="padding:4px 12px">${e.how_heard}</td></tr>` : ""}
          <tr><td style="padding:4px 12px;color:#666">Lots</td><td style="padding:4px 12px;font-weight:bold">${lotList}</td></tr>
          ${referrerRow}
          ${d.notes ? `<tr><td style="padding:4px 12px;color:#666">Notes</td><td style="padding:4px 12px">${e.notes}</td></tr>` : ""}
        </table>
        ${
          priceRows
            ? `<h3 style="color:#1A2744;font-family:sans-serif;margin-top:16px">Price Preferences</h3>
               <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
                 <tr style="background:#f5f5f5"><th style="padding:4px 12px;text-align:left">Lot</th><th style="padding:4px 12px;text-align:left">Price Range</th></tr>
                 ${priceRows}
               </table>`
            : ""
        }
        ${
          dwellingRows
            ? `<h3 style="color:#1A2744;font-family:sans-serif;margin-top:16px">Dwelling Preferences</h3>
               <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
                 <tr style="background:#f5f5f5"><th style="padding:4px 12px;text-align:left">Lot</th><th style="padding:4px 12px;text-align:left">Primary</th><th style="padding:4px 12px;text-align:left">Secondary</th></tr>
                 ${dwellingRows}
               </table>`
            : ""
        }
        <p style="margin-top:16px;font-size:12px;color:#999">Seafields Estate — Registration of Interest</p>
      `,
    });

  } catch (err) {
    console.error("Failed to send Seafields ROI admin notification:", err);
  }

  // Registrant confirmation — F2KSFLDS-9: now driven by the
  // email_templates.registration_confirmation row. lot_list is built from
  // the validated lot_selected array (zod-checked, so safe), and the
  // template renderer HTML-escapes every variable when substituting.
  try {
    const lotListPlain = d.lots_selected
      .map((l) => l.replace("L", "Lot "))
      .join(", ");
    const result = await sendTemplated({
      slug: "registration_confirmation",
      to: d.email,
      variables: {
        first_name: d.first_name,
        lot_list: lotListPlain,
      },
      audit: {
        actorEmail: d.email,
        entityType: "seafields_registration",
        entityId: registrationId,
      },
    });
    if (result.error) {
      console.error("registration_confirmation send failed:", result.error);
    }
  } catch (err) {
    console.error("registration_confirmation send threw:", err);
  }

  // Forward to GHL CRM (best-effort — never blocks registration response).
  try {
    const ghlResult = await forwardRegistrationToGHL(
      {
        email: d.email,
        firstName: d.first_name,
        lastName: d.last_name,
        phone: d.phone,
        suburb: d.suburb,
        postcode: d.postcode,
        buyerType: d.buyer_type,
        buyerProfile: d.buyer_profile,
        currentHousing: d.current_housing,
        purchaseTimeline: d.purchase_timeline,
        financeStatus: d.finance_status,
        howHeard: d.how_heard,
        itemsSelected: d.lots_selected,
        pricePreferences: d.price_preferences,
        dwellingPreferences: d.dwelling_preferences,
        referrerType: d.referrer_type,
        referrerName: d.referrer_name,
        referrerCompany: d.referrer_company,
        referrerContact: d.referrer_contact,
        notes: d.notes,
      },
      "seafields",
    );
    if (ghlResult.error) {
      console.error("GHL forward failed (Seafields ROI):", ghlResult.error);
    } else if (!ghlResult.skipped) {
      await supabase.from("audit_log").insert({
        actor_id: null,
        actor_email: d.email,
        action: "ghl_contact_forwarded",
        entity_type: "seafields_registration",
        entity_id: ghlResult.contactId ?? null,
        details: {
          project: "seafields",
          contact_id: ghlResult.contactId,
          created: ghlResult.created,
          email: d.email,
        },
      });
    }
  } catch (err) {
    console.error("GHL forward threw:", err);
  }

  return NextResponse.json({ success: true });
}

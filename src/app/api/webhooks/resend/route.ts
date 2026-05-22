/**
 * Resend webhook receiver. Verifies svix signature, then updates the
 * matching hemp_homes_prospect_outreach row's delivery_status + timestamps
 * and (for bounces/complaints) the prospect's outreach lifecycle.
 *
 * Setup:
 *   1. Resend dashboard → Webhooks → Add endpoint
 *      URL: <NEXT_PUBLIC_CANONICAL_URL>/api/webhooks/resend
 *      Events: email.delivered, email.bounced, email.complained,
 *              email.opened, email.clicked, email.failed
 *   2. Copy the signing secret → RESEND_WEBHOOK_SECRET on Vercel
 *
 * Note: Resend doesn't surface replies — those go to the replyTo inbox.
 * For now, in_conversation lifecycle is set manually when Dennis sees a
 * reply (or via the prospects admin). A future inbound-email integration
 * could automate that.
 */

import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string };
  };
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };
  if (!headers["svix-id"] || !headers["svix-timestamp"] || !headers["svix-signature"]) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(payload, headers) as ResendEvent;
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${(e as Error).message}` }, { status: 401 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    // Some Resend events (like webhook test pings) don't carry an email_id.
    return NextResponse.json({ ok: true, ignored: "no email_id" });
  }

  const supabase = createSupabaseService();
  const { data: outreach, error: loadErr } = await (supabase
    .from("hemp_homes_prospect_outreach") as any)
    .select("id, prospect_id, delivery_status")
    .eq("resend_message_id", emailId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!outreach) {
    // Could be a non-outreach Resend send (transactional, Seafields, etc.) —
    // not an error, just not ours.
    return NextResponse.json({ ok: true, ignored: "no matching outreach row" });
  }

  const update: Record<string, unknown> = {};
  let prospectUpdate: Record<string, unknown> | null = null;
  const ts = event.created_at ?? new Date().toISOString();

  switch (event.type) {
    case "email.sent":
    case "email.delivered":
      // Don't downgrade once we've seen open/click/etc.
      if (!["opened", "clicked", "replied"].includes(outreach.delivery_status ?? "")) {
        update.delivery_status = "sent";
      }
      break;

    case "email.bounced":
    case "email.failed": {
      update.delivery_status = "bounced";
      update.bounced_at = ts;
      // Hard bounce = permanent failure. Flip prospect to declined so we
      // don't keep targeting them.
      const bounceType = event.data?.bounce?.type;
      prospectUpdate = bounceType === "hard"
        ? { outreach_status: "declined" }
        : { outreach_status: "no_reply" };
      break;
    }

    case "email.complained": {
      update.delivery_status = "complained";
      prospectUpdate = { outreach_status: "declined" };
      break;
    }

    case "email.opened":
      // Don't downgrade clicked → opened.
      if (outreach.delivery_status !== "clicked" && outreach.delivery_status !== "replied") {
        update.delivery_status = "opened";
        update.opened_at = ts;
      } else if (!outreach.opened_at) {
        // We had clicked first somehow; backfill opened_at without changing status.
        update.opened_at = ts;
      }
      break;

    case "email.clicked":
      update.delivery_status = "clicked";
      update.clicked_at = ts;
      break;

    default:
      return NextResponse.json({ ok: true, ignored: `unhandled event type: ${event.type}` });
  }

  if (Object.keys(update).length > 0) {
    await (supabase.from("hemp_homes_prospect_outreach") as any)
      .update(update)
      .eq("id", outreach.id);
  }
  if (prospectUpdate) {
    await (supabase.from("hemp_homes_community_prospects") as any)
      .update(prospectUpdate)
      .eq("id", outreach.prospect_id);
  }

  return NextResponse.json({ ok: true, event: event.type, outreach_id: outreach.id });
}

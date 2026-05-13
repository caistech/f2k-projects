import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { forwardAllocationToGHL } from "@/lib/ghl";

const updateSchema = z.object({
  allocated_to: z.string().trim().max(200).nullable().optional(),
  dwelling_type: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional(),
  stage: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  wholesale_price: z.number().min(0).max(99_999_999.99).nullable().optional(),
  retail_price: z.number().min(0).max(99_999_999.99).nullable().optional(),
  /**
   * Soft-allocation: pin a specific seafields_registrations entry as the
   * priority lead for this lot. Pass null to clear the lock.
   */
  intent_locked_to_registration_id: z.string().uuid().nullable().optional(),
  x_pct: z.number().min(0).max(100).nullable().optional(),
  y_pct: z.number().min(0).max(100).nullable().optional(),
});

function emptyToNull<T>(v: T | undefined): T | null | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

export async function PATCH(
  request: Request,
  { params }: { params: { lotNumber: string } }
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_seafields_allocations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lotNumber = Number(params.lotNumber);
  if (!Number.isInteger(lotNumber) || lotNumber < 1) {
    return NextResponse.json({ error: "Invalid lot number" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.allocated_to !== undefined)
    updates.allocated_to = emptyToNull(parsed.data.allocated_to);
  if (parsed.data.dwelling_type !== undefined)
    updates.dwelling_type = emptyToNull(parsed.data.dwelling_type);
  if (parsed.data.stage !== undefined)
    updates.stage = emptyToNull(parsed.data.stage);
  if (parsed.data.notes !== undefined)
    updates.notes = emptyToNull(parsed.data.notes);
  if (parsed.data.wholesale_price !== undefined)
    updates.wholesale_price = parsed.data.wholesale_price;
  if (parsed.data.retail_price !== undefined)
    updates.retail_price = parsed.data.retail_price;
  if (parsed.data.x_pct !== undefined) updates.x_pct = parsed.data.x_pct;
  if (parsed.data.y_pct !== undefined) updates.y_pct = parsed.data.y_pct;

  // Intent-lock: stamp audit metadata when set, clear when unset
  if (parsed.data.intent_locked_to_registration_id !== undefined) {
    updates.intent_locked_to_registration_id =
      parsed.data.intent_locked_to_registration_id;
    if (parsed.data.intent_locked_to_registration_id) {
      updates.intent_locked_at = new Date().toISOString();
      updates.intent_locked_by = admin.auth_user_id;
    } else {
      updates.intent_locked_at = null;
      updates.intent_locked_by = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Stamp assignment metadata when allocated_to is changing
  if ("allocated_to" in updates) {
    updates.assigned_by = admin.auth_user_id;
    updates.assigned_at = new Date().toISOString();
    // Firm allocation supersedes any soft intent-lock — clear atomically.
    if (updates.allocated_to) {
      updates.intent_locked_to_registration_id = null;
      updates.intent_locked_at = null;
      updates.intent_locked_by = null;
    }
  }

  const supabase = createSupabaseService();

  const { data: priorRow } = await (
    supabase.from("seafields_lot_allocations") as any
  )
    .select("intent_locked_to_registration_id, allocated_to")
    .eq("lot_number", lotNumber)
    .maybeSingle();

  const { data: updated, error } = await (supabase
    .from("seafields_lot_allocations") as any)
    .update(updates)
    .eq("lot_number", lotNumber)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog(
    admin.id,
    admin.email,
    "seafields_lot_allocation_updated",
    "seafields_lot_allocation",
    null,
    { lot_number: lotNumber, ...updates }
  );

  // Forward allocation state to GHL if a registrant is identifiable.
  // (Bulk WACHS / GROH allocations have no FK and are skipped — they're
  // institutional, not individual GHL contacts.)
  try {
    let regId: string | null = null;
    let state: "soft" | "firm" | "cleared" | null = null;
    if (
      "intent_locked_to_registration_id" in updates &&
      updates.intent_locked_to_registration_id
    ) {
      regId = updates.intent_locked_to_registration_id as string;
      state = "soft";
    } else if ("allocated_to" in updates) {
      regId =
        (priorRow?.intent_locked_to_registration_id as string | null) ?? null;
      state = updates.allocated_to ? "firm" : "cleared";
    }

    if (regId && state) {
      const { data: reg } = await (
        supabase.from("seafields_registrations") as any
      )
        .select("first_name, last_name, email, phone")
        .eq("id", regId)
        .maybeSingle();

      if (reg?.email) {
        const result = await forwardAllocationToGHL(
          {
            email: reg.email,
            firstName: reg.first_name,
            lastName: reg.last_name,
            phone: reg.phone,
            itemId: `L${lotNumber}`,
            itemNumber: lotNumber,
            state,
            allocatedTo: (updates.allocated_to as string | null) ?? null,
            notes: (updates.notes as string | null) ?? null,
          },
          "seafields",
        );
        if (!result.error && !result.skipped) {
          await auditLog(
            admin.id,
            admin.email,
            "ghl_allocation_forwarded",
            "seafields_lot_allocation",
            null,
            {
              lot_number: lotNumber,
              state,
              contact_id: result.contactId,
              email: reg.email,
            },
          );
        } else if (result.error) {
          console.error("GHL allocation forward failed:", result.error);
        }
      }
    }
  } catch (err) {
    console.error("GHL allocation forward threw:", err);
  }

  return NextResponse.json({ allocation: updated });
}

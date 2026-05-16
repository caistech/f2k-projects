import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, hasPermission, auditLog } from "@/lib/admin-auth";
import {
  createSupabaseService,
  createSupabaseServiceWithActor,
} from "@/lib/supabase-service";
import { sendTemplated } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES = [
  "active",
  "locked_in",
  "released",
  "converted_to_sale",
  "cancelled",
] as const;
const REG_TYPES = ["primary", "backup_list"] as const;

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  registration_type: z.enum(REG_TYPES).optional(),
  reason: z.string().trim().min(10).max(500).optional(),
});

const MATERIAL_FIELDS = ["status", "registration_type"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { joinId: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_registrations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!UUID_RE.test(params.joinId)) {
    return NextResponse.json({ error: "Invalid joinId" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { reason, ...rawUpdates } = parsed.data;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawUpdates)) {
    if (v !== undefined) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const touchesMaterial = MATERIAL_FIELDS.some((f) => f in updates);
  if (touchesMaterial && (!reason || reason.length < 10)) {
    return NextResponse.json(
      {
        error:
          "A reason (≥10 chars) is required when changing status or registration_type.",
      },
      { status: 400 },
    );
  }

  const supabase = createSupabaseService();

  // Snapshot prior state so we can detect transitions and rerank backup_list
  // positions on the same lot after the write.
  const { data: prior, error: priorErr } = await (
    supabase.from("seafields_registration_lots") as any
  )
    .select(
      "id, lot_number, status, registration_type, position_in_queue, registration_id, " +
        "seafields_registrations!inner(first_name, email)",
    )
    .eq("id", params.joinId)
    .maybeSingle();

  if (priorErr) {
    return NextResponse.json({ error: priorErr.message }, { status: 500 });
  }
  if (!prior) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const attributed = createSupabaseServiceWithActor(admin.email, reason ?? null);
  const { data: updated, error: updErr } = await (attributed
    .from("seafields_registration_lots") as any)
    .update(updates)
    .eq("id", params.joinId)
    .select(
      "id, lot_number, status, registration_type, position_in_queue, created_at",
    )
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // F2KSFLDS-5 + F2KSFLDS-9 queue_position_updated wiring.
  //
  // When a row's status leaves 'active' on a lot that has backup_list rows,
  // the migration 0004 INSERT-only trigger leaves stale gaps in
  // position_in_queue. Re-rank the remaining active backup_list rows by
  // their original created_at, then send queue_position_updated to anyone
  // whose position moved.
  //
  // Also fires when a row's registration_type flips to/from backup_list on
  // an active lot — the queue composition has changed.
  try {
    const statusLeftActive =
      prior.status === "active" && updates.status && updates.status !== "active";
    const typeFlipped =
      "registration_type" in updates &&
      prior.registration_type !== updates.registration_type;

    if (statusLeftActive || typeFlipped) {
      const lotNumber = prior.lot_number;

      const { data: backupRows } = await (
        supabase.from("seafields_registration_lots") as any
      )
        .select(
          "id, position_in_queue, created_at, " +
            "seafields_registrations!inner(first_name, email)",
        )
        .eq("lot_number", lotNumber)
        .eq("status", "active")
        .eq("registration_type", "backup_list")
        .order("created_at", { ascending: true });

      type BackupRow = {
        id: string;
        position_in_queue: number | null;
        created_at: string;
        seafields_registrations: { first_name: string; email: string };
      };

      const movers: Array<{
        joinId: string;
        oldPos: number;
        newPos: number;
        first_name: string;
        email: string;
      }> = [];

      let idx = 0;
      for (const row of ((backupRows as BackupRow[]) || [])) {
        idx += 1;
        const oldPos = row.position_in_queue ?? idx;
        if (oldPos !== idx) {
          await (attributed.from("seafields_registration_lots") as any)
            .update({ position_in_queue: idx })
            .eq("id", row.id);
          movers.push({
            joinId: row.id,
            oldPos,
            newPos: idx,
            first_name: row.seafields_registrations.first_name,
            email: row.seafields_registrations.email,
          });
        }
      }

      for (const m of movers) {
        await sendTemplated({
          slug: "queue_position_updated",
          to: m.email,
          variables: {
            first_name: m.first_name,
            lot_number: lotNumber,
            old_position: m.oldPos,
            new_position: m.newPos,
          },
          audit: {
            actorEmail: admin.email,
            entityType: "seafields_registration_lot",
            entityId: m.joinId,
          },
        });
      }

      if (movers.length > 0) {
        await auditLog(
          admin.id,
          admin.email,
          "queue_position_updated_notifications_sent",
          "seafields_lot_allocation",
          null,
          { lot_number: lotNumber, count: movers.length },
        );
      }
    }
  } catch (err) {
    console.error("queue_position_updated fan-out threw:", err);
  }

  return NextResponse.json({ registration: updated });
}

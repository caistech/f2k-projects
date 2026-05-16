import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";
import { sendTemplated } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Manually resend the registration confirmation to a registrant. Useful when
 * the original email bounced or the registrant misplaced it. Targets the
 * contact row attached to a specific join (registrant × lot) row so the
 * lot context renders correctly.
 */
export async function POST(
  _request: Request,
  { params }: { params: { joinId: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_registrations")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!UUID_RE.test(params.joinId)) {
    return NextResponse.json({ error: "Invalid joinId" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Fetch the join row plus every other join row belonging to the same
  // registration so the confirmation email lists the full set of lots the
  // registrant signed up for (mirrors the public submission send).
  const { data: row, error } = await (supabase
    .from("seafields_registration_lots") as any)
    .select(
      "id, registration_id, " +
        "seafields_registrations!inner(id, first_name, email, lots_selected)",
    )
    .eq("id", params.joinId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  type Row = {
    id: string;
    registration_id: string;
    seafields_registrations: {
      id: string;
      first_name: string;
      email: string;
      lots_selected: string[] | null;
    };
  };
  const r = row as Row;

  const lotListPlain = (r.seafields_registrations.lots_selected ?? [])
    .map((l) => l.replace("L", "Lot "))
    .join(", ");

  const result = await sendTemplated({
    slug: "registration_confirmation",
    to: r.seafields_registrations.email,
    variables: {
      first_name: r.seafields_registrations.first_name,
      lot_list: lotListPlain,
    },
    audit: {
      actorEmail: admin.email,
      entityType: "seafields_registration",
      entityId: r.seafields_registrations.id,
    },
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, resend_id: result.resend_id ?? null });
}

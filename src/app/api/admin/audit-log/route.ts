import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "view_audit_log")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entity_type")?.trim() || null;
  const actorEmail = searchParams.get("actor_email")?.trim() || null;
  const actionPrefix = searchParams.get("action_prefix")?.trim() || null;
  const since = searchParams.get("since")?.trim() || null;
  const until = searchParams.get("until")?.trim() || null;
  const fieldChanged = searchParams.get("field_changed")?.trim() || null;
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const supabase = createSupabaseService();
  let q = (supabase.from("audit_log") as any)
    .select(
      "id, actor_id, actor_email, action, entity_type, entity_id, field_changed, old_value, new_value, reason, details, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (entityType) q = q.eq("entity_type", entityType);
  if (actorEmail) q = q.eq("actor_email", actorEmail);
  if (actionPrefix) q = q.like("action", `${actionPrefix}%`);
  if (fieldChanged) q = q.eq("field_changed", fieldChanged);
  if (since) q = q.gte("created_at", since);
  if (until) q = q.lte("created_at", until);

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const ALLOWED_STAGES = new Set([
  "design","material_development","engineering","prototyping",
  "building","certification","install","community",
]);
const ALLOWED_STATES = new Set(["completed", "in_progress", "scheduled"]);

interface RouteCtx {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_posts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 3) {
      return NextResponse.json({ error: "Title must be at least 3 chars" }, { status: 400 });
    }
    update.title = t;
  }

  if (typeof body.overview === "string") {
    const o = body.overview.trim();
    if (o.length < 10) {
      return NextResponse.json({ error: "Overview must be at least 10 chars" }, { status: 400 });
    }
    update.overview = o;
  }

  if (typeof body.stage === "string") {
    if (!ALLOWED_STAGES.has(body.stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    update.stage = body.stage;
  }

  if (typeof body.state === "string") {
    if (!ALLOWED_STATES.has(body.state)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    update.state = body.state;
  }

  if ("hero_media_id" in body) {
    update.hero_media_id = body.hero_media_id ?? null;
  }

  // published_at: pass `true` to publish (now()), `false` to unpublish (null),
  // or an ISO string to schedule.
  if ("published_at" in body) {
    if (body.published_at === true) {
      update.published_at = new Date().toISOString();
    } else if (body.published_at === false || body.published_at === null) {
      update.published_at = null;
    } else if (typeof body.published_at === "string") {
      const d = new Date(body.published_at);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid published_at" }, { status: 400 });
      }
      update.published_at = d.toISOString();
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" && body.reason.trim()
    ? body.reason.trim()
    : ("published_at" in update ? "publish toggle" : "edit hemp-homes post");

  const supabase = createSupabaseServiceWithActor(admin.email, reason);
  const { data, error } = await (supabase.from("hemp_homes_posts") as any)
    .update(update)
    .eq("id", params.id)
    .select(
      "id, slug, title, overview, stage, state, hero_media_id, published_at, email_sent_at, email_subject, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_posts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, "delete hemp-homes post");
  const { error } = await (supabase.from("hemp_homes_posts") as any)
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

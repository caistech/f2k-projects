import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string; id: string };
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ("show_in_gallery" in body) {
    if (typeof body.show_in_gallery !== "boolean") {
      return NextResponse.json({ error: "show_in_gallery must be boolean" }, { status: 400 });
    }
    update.show_in_gallery = body.show_in_gallery;
  }
  if ("caption" in body) {
    const c = body.caption == null ? null : String(body.caption).trim();
    update.caption = c && c.length > 0 ? c : null;
  }
  if ("alt_text" in body) {
    const a = body.alt_text == null ? null : String(body.alt_text).trim();
    update.alt_text = a && a.length > 0 ? a : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const reason = "show_in_gallery" in update
    ? `gallery visibility → ${update.show_in_gallery}`
    : `edit ${cfg.slug} media metadata`;
  const supabase = createSupabaseServiceWithActor(admin.email, reason);
  const { data, error } = await (supabase.from(cfg.mediaTable) as any)
    .update(update)
    .eq("id", params.id)
    .select(
      "id, kind, source, storage_path, public_url, mime_type, width, height, duration_seconds, byte_size, alt_text, caption, show_in_gallery, drive_file_id, drive_url, drive_synced_at, created_at",
    )
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, `delete ${cfg.slug} media`);
  const { data: row, error: readErr } = await (supabase.from(cfg.mediaTable) as any)
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const { error: delErr } = await (supabase.from(cfg.mediaTable) as any).delete().eq("id", params.id);
  if (delErr) {
    if (delErr.code === "23503") {
      return NextResponse.json(
        { error: "This media is attached to a post — remove it from the post first." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  if (row.storage_path) {
    await supabase.storage.from(cfg.bucket).remove([row.storage_path]).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

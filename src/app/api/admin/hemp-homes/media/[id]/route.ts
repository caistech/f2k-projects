import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const BUCKET = "hemp-homes-media";

interface RouteCtx {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_media")) {
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
    : "edit hemp-homes media metadata";

  const supabase = createSupabaseServiceWithActor(admin.email, reason);
  const { data, error } = await (supabase.from("hemp_homes_media") as any)
    .update(update)
    .eq("id", params.id)
    .select(
      "id, kind, source, storage_path, public_url, mime_type, width, height, duration_seconds, byte_size, alt_text, caption, show_in_gallery, drive_file_id, drive_url, drive_synced_at, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ media: data });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, "delete hemp-homes media");

  // Read the storage path first so we can clean up the object after the row goes.
  const { data: row, error: readErr } = await (supabase.from("hemp_homes_media") as any)
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // A post hero_media_id / journey hero_media_id references this row via ON
  // DELETE SET NULL, and hemp_homes_post_media via ON DELETE RESTRICT. If the
  // item is attached to a post, the delete will fail with a FK error — surface
  // it clearly rather than 500.
  const { error: delErr } = await (supabase.from("hemp_homes_media") as any)
    .delete()
    .eq("id", params.id);

  if (delErr) {
    if (delErr.code === "23503") {
      return NextResponse.json(
        { error: "This media is attached to a post — remove it from the post first." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort storage cleanup — the DB row is already gone, so a failed object
  // removal just leaves an orphan file (non-fatal).
  if (row.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

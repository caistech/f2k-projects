import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService, createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

const MEDIA_SELECT =
  "id, kind, source, storage_path, public_url, mime_type, width, height, duration_seconds, byte_size, alt_text, caption, show_in_gallery, drive_file_id, drive_url, drive_synced_at, created_at";

function kindFromMime(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}
function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  };
  return map[mime] ?? "bin";
}

export async function GET(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from(cfg.mediaTable) as any)
    .select(MEDIA_SELECT)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data ?? [] });
}

export async function POST(request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const altText = String(formData.get("alt_text") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  // Default hidden — operator opts into the public gallery via the toggle.
  const showInGallery = formData.get("show_in_gallery") === "true";

  const kind = kindFromMime(file.type);
  if (!kind) return NextResponse.json({ error: `Unsupported MIME type: ${file.type}` }, { status: 400 });
  const ext = extensionFromMime(file.type);
  const storagePath = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const supabase = createSupabaseServiceWithActor(admin.email, `upload ${cfg.slug} media`);
  const arrayBuffer = await file.arrayBuffer();
  const uploadRes = await supabase.storage.from(cfg.bucket).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadRes.error) return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });

  const { data: publicData } = supabase.storage.from(cfg.bucket).getPublicUrl(storagePath);
  const insert = await (supabase.from(cfg.mediaTable) as any)
    .insert({
      kind,
      source: "direct",
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      mime_type: file.type,
      byte_size: file.size,
      alt_text: altText || null,
      caption: caption || null,
      show_in_gallery: showInGallery,
      uploaded_by: admin.auth_user_id,
    })
    .select(MEDIA_SELECT)
    .single();

  if (insert.error) {
    await supabase.storage.from(cfg.bucket).remove([storagePath]).catch(() => {});
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }
  return NextResponse.json({ media: insert.data }, { status: 201 });
}

// Bulk gallery-visibility update. Body: { show_in_gallery: boolean, ids?: string[] }.
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
  if (typeof body.show_in_gallery !== "boolean") {
    return NextResponse.json({ error: "show_in_gallery must be boolean" }, { status: 400 });
  }
  const ids: string[] | null = Array.isArray(body.ids)
    ? body.ids.filter((x: unknown) => typeof x === "string")
    : null;

  const supabase = createSupabaseServiceWithActor(
    admin.email,
    `bulk gallery visibility → ${body.show_in_gallery}${ids ? ` (${ids.length} items)` : " (all)"}`,
  );
  let query = (supabase.from(cfg.mediaTable) as any).update({ show_in_gallery: body.show_in_gallery });
  query = ids && ids.length > 0 ? query.in("id", ids) : query.not("id", "is", null);
  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: data?.length ?? 0 });
}

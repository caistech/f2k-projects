import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { estateBySlug } from "@/data/estates";

/**
 * Upload a card image or floor plan for a home-design card, and hand back its public URL.
 *
 * Deliberately a SHARED bucket (`estate-designs`, path-prefixed per estate) rather than the
 * per-estate media buckets: those are configured only for estates with a blog (blog-config.ts), so
 * Wavecrest has none — an upload path built on them would work for Seafields and silently fail
 * everywhere else. It also keeps floor plans out of the photo gallery's media table, which the
 * estate blog draws from.
 *
 * The bucket is public because these files are rendered on a public marketing page; nothing
 * private is ever uploaded here.
 */

export const dynamic = "force-dynamic";
// A scanned floor plan over a slow connection is the realistic worst case.
export const maxDuration = 60;

const BUCKET = "estate-designs";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const MAX_BYTES = 10 * 1024 * 1024;

interface RouteCtx {
  params: { estate: string };
}

export async function POST(request: Request, { params }: RouteCtx) {
  if (!estateBySlug(params.estate)) {
    return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_estate_designs")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was chosen" }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "That file type isn't supported. Use a JPG, PNG, WEBP, GIF or PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 10MB.` },
      { status: 400 },
    );
  }

  // Keep the operator's filename in the path so the Storage listing stays readable, but strip it to
  // a safe slug and prefix a unique stamp — two people uploading "plan.png" must not collide.
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "design";
  const path = `${params.estate}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;

  const supabase = createSupabaseServiceWithActor(
    admin.email,
    `upload ${params.estate} design asset`,
  );
  const arrayBuffer = await file.arrayBuffer();
  const upload = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    // A missing bucket is an operator-environment gap, not the uploader's mistake — say which.
    const missing = /not found/i.test(upload.error.message);
    return NextResponse.json(
      {
        error: missing
          ? `The "${BUCKET}" storage bucket doesn't exist in this environment yet. Ask Dennis to create it.`
          : upload.error.message,
      },
      { status: missing ? 500 : 400 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path }, { status: 201 });
}

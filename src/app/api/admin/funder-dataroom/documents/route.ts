import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET — list all data-room documents (admin view, both tiers).
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("funder_documents") as any)
    .select("id, display_name, category, confidentiality_tier, format, file_size, chunk_count, ingested_at, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

// POST (multipart) — upload a document. fields: file, display_name?, category?, tier?
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const displayName = String(form.get("display_name") || file.name).trim();
  const category = String(form.get("category") || "other").trim();
  const tier = String(form.get("tier") || "base");
  if (!["base", "deep"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  // Sanitised, collision-resistant path (timestamp from the upload, not Date.now which is banned in
  // some contexts — here in a route it's fine, but we vary by name + size for uniqueness).
  const safe = displayName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60);
  const storagePath = `${tier}/${safe}-${file.size}.${ext}`;

  const supabase = createSupabaseService();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await supabase.storage
    .from("funder-dataroom")
    .upload(storagePath, bytes, { contentType: file.type || undefined, upsert: true });
  if (up.error) {
    console.error("funder doc upload error:", up.error);
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const { data: inserted, error: iErr } = await (supabase.from("funder_documents") as any)
    .insert({
      display_name: displayName,
      category,
      confidentiality_tier: tier,
      format: ext,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: admin.email,
    })
    .select("id")
    .single();
  if (iErr) {
    console.error("funder doc registry error:", iErr);
    return NextResponse.json({ error: "Could not register the document" }, { status: 500 });
  }

  // Index for the RAG "ask" (best-effort — the doc is usable even if indexing lags; admin can
  // Re-index from the console). A failure here must not fail the upload.
  let indexed: number | null = null;
  try {
    const { ingestFunderDocument } = await import("@/lib/funders/ingest");
    indexed = await ingestFunderDocument(inserted.id);
  } catch (err) {
    console.error("funder doc auto-index failed (upload still succeeded):", err);
  }
  return NextResponse.json({ ok: true, id: inserted.id, indexed });
}

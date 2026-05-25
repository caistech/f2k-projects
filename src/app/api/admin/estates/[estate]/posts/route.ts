import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

const POST_SELECT =
  "id, slug, title, overview, stage, state, hero_media_id, published_at, email_sent_at, email_subject, created_at, updated_at";

const ALLOWED_STAGES = new Set([
  "design", "material_development", "engineering", "prototyping",
  "building", "certification", "install", "community",
]);
const ALLOWED_STATES = new Set(["completed", "in_progress", "scheduled"]);

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export async function GET(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "posts"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, null);
  const { data, error } = await (supabase.from(cfg.postsTable) as any)
    .select(POST_SELECT)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg) return NextResponse.json({ error: "Unknown estate" }, { status: 404 });
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "posts"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const overview = String(body.overview ?? "").trim();
  const stage = String(body.stage ?? "").trim();
  const state = String(body.state ?? "in_progress").trim();
  const customSlug = String(body.slug ?? "").trim();
  const heroMediaId =
    typeof body.hero_media_id === "string" && body.hero_media_id ? body.hero_media_id : null;

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "Title is required (min 3 chars)" }, { status: 400 });
  }
  if (!overview || overview.length < 10) {
    return NextResponse.json({ error: "Overview is required (min 10 chars)" }, { status: 400 });
  }
  if (!ALLOWED_STAGES.has(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  if (!ALLOWED_STATES.has(state)) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

  const slug = customSlug ? slugify(customSlug) : `${slugify(title)}-${Date.now().toString(36)}`;
  const supabase = createSupabaseServiceWithActor(admin.email, `create ${cfg.slug} post`);
  const { data, error } = await (supabase.from(cfg.postsTable) as any)
    .insert({ slug, title, overview, stage, state, hero_media_id: heroMediaId, created_by: admin.auth_user_id })
    .select(POST_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug already exists — choose another" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data }, { status: 201 });
}

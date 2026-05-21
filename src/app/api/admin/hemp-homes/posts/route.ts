import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_posts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, null);
  const { data, error } = await (supabase.from("hemp_homes_posts") as any)
    .select(
      "id, slug, title, overview, stage, state, hero_media_id, published_at, email_sent_at, email_subject, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: data ?? [] });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: Request) {
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

  const title = String(body.title ?? "").trim();
  const overview = String(body.overview ?? "").trim();
  const stage = String(body.stage ?? "").trim();
  const state = String(body.state ?? "in_progress").trim();
  const customSlug = String(body.slug ?? "").trim();

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "Title is required (min 3 chars)" }, { status: 400 });
  }
  if (!overview || overview.length < 10) {
    return NextResponse.json({ error: "Overview is required (min 10 chars)" }, { status: 400 });
  }
  const allowedStages = new Set([
    "design","material_development","engineering","prototyping",
    "building","certification","install","community",
  ]);
  if (!allowedStages.has(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }
  const allowedStates = new Set(["completed", "in_progress", "scheduled"]);
  if (!allowedStates.has(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const slug = customSlug ? slugify(customSlug) : `${slugify(title)}-${Date.now().toString(36)}`;

  const supabase = createSupabaseServiceWithActor(admin.email, "create hemp-homes post");
  const { data, error } = await (supabase.from("hemp_homes_posts") as any)
    .insert({
      slug,
      title,
      overview,
      stage,
      state,
      created_by: admin.auth_user_id,
    })
    .select(
      "id, slug, title, overview, stage, state, hero_media_id, published_at, email_sent_at, created_at, updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug already exists — choose another" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data }, { status: 201 });
}

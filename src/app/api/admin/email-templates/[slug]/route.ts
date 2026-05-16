import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import {
  createSupabaseService,
  createSupabaseServiceWithActor,
} from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

const updateSchema = z.object({
  subject: z.string().trim().min(1).max(300).optional(),
  html_body: z.string().min(1).max(50_000).optional(),
  text_body: z.string().max(20_000).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  // Required when subject / html_body / text_body change — these are
  // customer-facing content edits per the reason-scope policy.
  reason: z.string().trim().min(10).max(500).optional(),
});

const MATERIAL_FIELDS = ["subject", "html_body", "text_body", "is_active"] as const;

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_email_templates")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!SLUG_RE.test(params.slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("email_templates") as any)
    .select(
      "slug, subject, html_body, text_body, variables, description, is_active, created_at, updated_at",
    )
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_email_templates")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!SLUG_RE.test(params.slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { reason, ...rawUpdates } = parsed.data;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawUpdates)) {
    if (v !== undefined) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const touchesMaterial = MATERIAL_FIELDS.some((f) => f in updates);
  if (touchesMaterial && (!reason || reason.length < 10)) {
    return NextResponse.json(
      {
        error:
          "A reason (≥10 chars) is required when changing email subject, HTML, text body, or active status.",
      },
      { status: 400 },
    );
  }

  const attributed = createSupabaseServiceWithActor(admin.email, reason ?? null);
  const { data, error } = await (attributed.from("email_templates") as any)
    .update(updates)
    .eq("slug", params.slug)
    .select(
      "slug, subject, html_body, text_body, variables, description, is_active, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

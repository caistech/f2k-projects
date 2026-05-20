import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, auditLog } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  first_name: z.string().trim().max(100).nullable().optional(),
  last_name: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
  job_title: z.string().trim().max(200).nullable().optional(),
});

const PROFILE_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "company",
  "job_title",
] as const;

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    const v = parsed.data[field];
    if (v === undefined) continue;
    updates[field] = v === "" ? null : v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseServiceWithActor(admin.email, null);
  const { data: updated, error } = await (supabase.from("admin_users") as any)
    .update(updates)
    .eq("id", admin.id)
    .select(
      "id, email, role, first_name, last_name, full_name, phone, company, job_title, email_marketing_opt_in, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog(
    admin.id,
    admin.email,
    "admin_profile_updated",
    "admin_user",
    admin.id,
    { fields: Object.keys(updates) },
  );

  return NextResponse.json({ admin: updated });
}

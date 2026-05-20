import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, auditLog } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  email_marketing_opt_in: z.boolean(),
});

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceWithActor(admin.email, null);
  const { data: updated, error } = await (supabase.from("admin_users") as any)
    .update({ email_marketing_opt_in: parsed.data.email_marketing_opt_in })
    .eq("id", admin.id)
    .select("email_marketing_opt_in, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog(
    admin.id,
    admin.email,
    "admin_notifications_updated",
    "admin_user",
    admin.id,
    { email_marketing_opt_in: parsed.data.email_marketing_opt_in },
  );

  return NextResponse.json({ admin: updated });
}

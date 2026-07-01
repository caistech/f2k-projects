import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseService } from "@/lib/supabase-service";

// GET — list funder members.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createSupabaseService();
  const { data, error } = await (supabase.from("funder_members") as any)
    .select("id, full_name, firm, email, max_tier, deep_access_enabled, nda_accepted_at, status, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("funder members list error:", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
  return NextResponse.json({ members: data ?? [] });
}

// POST — invite a funder: create the member row + a Supabase auth user (sends the invite email),
// link auth_user_id, mark active. Body: { email, full_name?, firm?, deep_access_enabled? }
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const supabase = createSupabaseService();

  // Upsert the member row (idempotent on email).
  const { data: existing } = await (supabase.from("funder_members") as any)
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  const fields = {
    email,
    full_name: body.full_name ? String(body.full_name).trim() : null,
    firm: body.firm ? String(body.firm).trim() : null,
    deep_access_enabled: !!body.deep_access_enabled,
    invited_by: admin.email,
    updated_at: new Date().toISOString(),
  };

  let memberId = existing?.id as string | undefined;
  if (existing) {
    await (supabase.from("funder_members") as any).update(fields).eq("id", existing.id);
  } else {
    const { data: created, error: cErr } = await (supabase.from("funder_members") as any)
      .insert({ ...fields, status: "invited" })
      .select("id")
      .single();
    if (cErr) {
      console.error("funder member create error:", cErr);
      return NextResponse.json({ error: "Could not create the member" }, { status: 500 });
    }
    memberId = created.id;
  }

  // Create / invite the auth user (Supabase sends the branded invite email via the configured SMTP).
  const origin = new URL(request.url).origin;
  const { data: invited, error: iErr } = await (supabase.auth.admin as any).inviteUserByEmail(email, {
    redirectTo: `${origin}/dataroom`,
  });

  let authUserId: string | null = invited?.user?.id ?? null;
  if (iErr) {
    // Most common: the user already exists. Look them up so we can still link + activate.
    const { data: list } = await (supabase.auth.admin as any).listUsers();
    const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
    authUserId = found?.id ?? null;
    if (!authUserId) {
      return NextResponse.json(
        { error: `Could not send the invite: ${iErr.message}` },
        { status: 500 },
      );
    }
  }

  await (supabase.from("funder_members") as any)
    .update({ auth_user_id: authUserId, status: "active", updated_at: new Date().toISOString() })
    .eq("id", memberId);

  return NextResponse.json({ ok: true, id: memberId, invited: !iErr });
}

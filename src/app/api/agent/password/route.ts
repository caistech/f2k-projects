import { NextResponse } from "next/server";
import { getAgentUser } from "@/lib/agents/agent-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export async function PATCH(request: Request) {
  const agent = await getAgentUser();
  if (!agent) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
  }

  if (!agent.auth_user_id) {
    return NextResponse.json({ error: "Cannot change password for this account" }, { status: 400 });
  }

  const service = createSupabaseService();

  // First verify the current password by attempting to sign in
  const { error: signInError } = await service.auth.signInWithPassword({
    email: agent.email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Now update the password
  const { error: updateError } = await service.auth.admin.updateUser(
    agent.auth_user_id,
    { password: newPassword }
  );

  if (updateError) {
    console.error("Password update error:", updateError);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

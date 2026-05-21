import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import {
  encodeTokens,
  exchangeCodeForTokens,
  getOAuthClient,
  decodeTokens,
} from "@/lib/hemp-homes/drive";
import { google } from "googleapis";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectWithStatus(`error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return redirectWithStatus("error=missing_code");
  }

  const cookieStore = cookies();
  const expectedState = cookieStore.get("hh_drive_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return redirectWithStatus("error=state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (e) {
    return redirectWithStatus(`error=${encodeURIComponent((e as Error).message)}`);
  }

  if (!tokens.refresh_token) {
    return redirectWithStatus("error=no_refresh_token");
  }

  // Fetch the authorised account's email for display in the UI.
  let connectedEmail: string | null = null;
  try {
    const oauth = getOAuthClient();
    oauth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const me = await oauth2.userinfo.get();
    connectedEmail = me.data.email ?? null;
  } catch {
    // Non-fatal — keep going without the email.
  }

  const supabase = createSupabaseServiceWithActor(admin.email, "connect hemp-homes drive");
  const { error: upErr } = await (supabase.from("hemp_homes_drive_connection") as any)
    .update({
      encrypted_tokens: encodeTokens(tokens),
      connected_email: connectedEmail,
      connected_by: admin.auth_user_id,
      connected_at: new Date().toISOString(),
      paused: false,
    })
    .eq("id", "singleton");

  if (upErr) {
    return redirectWithStatus(`error=${encodeURIComponent(upErr.message)}`);
  }

  const res = redirectWithStatus("connected=1");
  res.cookies.delete("hh_drive_oauth_state");
  return res;
}

// Keep all callback redirects pointed back at the media admin page so the
// operator never lands on a blank JSON page.
function redirectWithStatus(query: string) {
  const base = process.env.NEXT_PUBLIC_CANONICAL_URL?.replace(/\/$/, "") ?? "";
  return NextResponse.redirect(`${base}/admin/hemp-homes/media?${query}`);
}

// Silence unused-warning on decodeTokens import without changing the public surface.
void decodeTokens;

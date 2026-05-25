import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { createSupabaseServiceWithActor } from "@/lib/supabase-service";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";
import { encodeTokens, exchangeCodeForTokens, getEstateOAuthClient } from "@/lib/estates/drive";
import { google } from "googleapis";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Single shared OAuth callback for all estates. The estate is read from the
// `state` param (estate:csrf); the csrf is verified against the cookie set by
// the connect route. Only ONE redirect URI to register in Google Cloud:
//   <NEXT_PUBLIC_CANONICAL_URL>/api/admin/estates/drive/callback
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  const [estateSlug, csrf] = state.split(":");
  const cfg = getEstateBlog(estateSlug ?? "");
  // Fall back to the blog index if we can't resolve the estate to redirect to.
  const mediaPath = cfg ? `/admin/estates/${cfg.slug}/media` : "/admin";

  if (oauthError) return redirectTo(mediaPath, `error=${encodeURIComponent(oauthError)}`);
  if (!cfg || !cfg.driveEnabled) return redirectTo("/admin", "error=unknown_estate");
  if (!code) return redirectTo(mediaPath, "error=missing_code");

  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return redirectTo(mediaPath, "error=forbidden");
  }

  const cookieStore = cookies();
  const expected = cookieStore.get("estate_drive_oauth_state")?.value;
  if (!expected || !csrf || expected !== csrf) {
    return redirectTo(mediaPath, "error=state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (e) {
    return redirectTo(mediaPath, `error=${encodeURIComponent((e as Error).message)}`);
  }
  if (!tokens.refresh_token) return redirectTo(mediaPath, "error=no_refresh_token");

  let connectedEmail: string | null = null;
  try {
    const oauth = getEstateOAuthClient();
    oauth.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    connectedEmail = (await oauth2.userinfo.get()).data.email ?? null;
  } catch {
    // Non-fatal.
  }

  const supabase = createSupabaseServiceWithActor(admin.email, `connect ${cfg.slug} drive`);
  const { error: upErr } = await (supabase.from("estate_drive_connections") as any)
    .update({
      encrypted_tokens: encodeTokens(tokens),
      connected_email: connectedEmail,
      connected_by: admin.auth_user_id,
      connected_at: new Date().toISOString(),
      paused: false,
    })
    .eq("estate", cfg.slug);
  if (upErr) return redirectTo(mediaPath, `error=${encodeURIComponent(upErr.message)}`);

  const res = redirectTo(mediaPath, "connected=1");
  res.cookies.delete("estate_drive_oauth_state");
  return res;
}

function redirectTo(path: string, query: string) {
  const base = process.env.NEXT_PUBLIC_CANONICAL_URL?.replace(/\/$/, "") ?? "";
  return NextResponse.redirect(`${base}${path}?${query}`);
}

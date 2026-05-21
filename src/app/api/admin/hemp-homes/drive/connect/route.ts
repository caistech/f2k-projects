import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { generateAuthUrl } from "@/lib/hemp-homes/drive";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// Starts the OAuth flow. Admin must be signed in + have manage_hemp_homes_media.
// Sets a short-lived state cookie that the callback verifies (CSRF).
export async function GET() {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_hemp_homes_media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let url: string;
  let state: string;
  try {
    state = randomBytes(16).toString("hex");
    url = generateAuthUrl(state);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const res = NextResponse.redirect(url);
  res.cookies.set("hh_drive_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}

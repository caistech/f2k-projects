import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";
import { generateAuthUrl } from "@/lib/estates/drive";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: { estate: string };
}

// Starts OAuth for an estate's Drive. The estate is carried in the `state`
// param (estate:csrf) so the single shared callback can route it back.
export async function GET(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg || !cfg.driveEnabled) {
    return NextResponse.json({ error: "Drive not enabled for this estate" }, { status: 404 });
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let url: string;
  let csrf: string;
  try {
    csrf = randomBytes(16).toString("hex");
    url = generateAuthUrl(`${cfg.slug}:${csrf}`);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const res = NextResponse.redirect(url);
  res.cookies.set("estate_drive_oauth_state", csrf, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}

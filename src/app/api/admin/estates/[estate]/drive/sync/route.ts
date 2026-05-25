import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { getEstateBlog, estatePermission } from "@/lib/estates/blog-config";
import { syncEstateDrive } from "@/lib/estates/drive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteCtx {
  params: { estate: string };
}

export async function POST(_request: Request, { params }: RouteCtx) {
  const cfg = getEstateBlog(params.estate);
  if (!cfg || !cfg.driveEnabled) {
    return NextResponse.json({ error: "Drive not enabled for this estate" }, { status: 404 });
  }
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, estatePermission(cfg.slug, "media"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncEstateDrive({ estate: cfg.slug, mediaTable: cfg.mediaTable, bucket: cfg.bucket });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

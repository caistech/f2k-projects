import { NextResponse } from "next/server";
import { getAdminUser, hasPermission } from "@/lib/admin-auth";
import { ingestFunderDocument } from "@/lib/funders/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST — (re)build the RAG chunks for one document (extract → chunk → embed → store).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin || !hasPermission(admin.role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const count = await ingestFunderDocument(params.id);
    return NextResponse.json({ ok: true, chunk_count: count });
  } catch (err) {
    console.error("funder doc reindex error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Re-index failed" },
      { status: 500 },
    );
  }
}

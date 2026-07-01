import { NextResponse } from "next/server";
import { requireFunder, allowedTiersFor, type FunderTier } from "@/lib/funders/funder-auth";
import { createSupabaseService } from "@/lib/supabase-service";

export const runtime = "nodejs";

/**
 * GET /api/funder/documents/[id]/download — issue a short-lived signed URL for a data-room file.
 * THE tier boundary: re-checks the doc's tier against the member's server-side max_tier (never
 * trusts the id), audits the access, and returns a time-limited signed URL. A base-tier funder
 * cannot pull a deep-tier file even with its id.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  const { member } = auth;

  const supabase = createSupabaseService();
  const { data: doc } = await (supabase.from("funder_documents") as any)
    .select("id, display_name, storage_path, confidentiality_tier")
    .eq("id", params.id)
    .maybeSingle();
  if (!doc || !doc.storage_path) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Tier gate — the confidentiality boundary.
  if (!allowedTiersFor(member.max_tier).includes(doc.confidentiality_tier as FunderTier)) {
    return NextResponse.json({ error: "Not authorised for this document" }, { status: 403 });
  }

  const { data: signed, error } = await supabase.storage
    .from("funder-dataroom")
    .createSignedUrl(doc.storage_path, 300); // 5-minute link
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not retrieve the file" }, { status: 502 });
  }

  // Audit (best-effort).
  await (supabase.from("funder_dataroom_audit") as any)
    .insert({
      funder_member_id: member.id,
      action: "doc_view",
      detail: { documentId: doc.id, display_name: doc.display_name, tier: doc.confidentiality_tier },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ url: signed.signedUrl });
}

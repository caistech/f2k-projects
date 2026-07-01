import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireFunder } from "@/lib/funders/funder-auth";
import { createSupabaseService } from "@/lib/supabase-service";

const NDA_VERSION = "v1";

/**
 * POST /api/funder/nda/accept — the NDA click-through gate. No NDA → base documents only; accepting
 * flips the member base→deep (service-role; the client can never self-elevate). Deep access is an
 * admin-decided entitlement — an un-invited member cannot sign their way in. Body: { signerName }.
 */
export async function POST(request: Request) {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  const { member } = auth;

  const body = await request.json().catch(() => ({}));
  const signerName = String(body?.signerName ?? "").trim();
  if (signerName.length < 2) {
    return NextResponse.json({ error: "Type your full legal name to accept." }, { status: 400 });
  }
  if (!member.deep_access_enabled) {
    return NextResponse.json(
      { error: "Deep-access hasn't been enabled for your account." },
      { status: 403 },
    );
  }
  if (member.max_tier === "deep" && member.nda_accepted_at) {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }

  const supabase = createSupabaseService();
  const hdrs = headers();
  const acceptedAt = new Date().toISOString();

  const led = await (supabase.from("funder_nda_acceptances") as any).insert({
    funder_member_id: member.id,
    nda_version: NDA_VERSION,
    signer_name: signerName,
    ip_address: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: hdrs.get("user-agent") ?? null,
  });
  if (led.error) {
    return NextResponse.json({ error: "Could not record acceptance." }, { status: 500 });
  }

  const upd = await (supabase.from("funder_members") as any)
    .update({
      max_tier: "deep",
      nda_accepted_at: acceptedAt,
      nda_version: NDA_VERSION,
      nda_signer_name: signerName,
      updated_at: acceptedAt,
    })
    .eq("id", member.id);
  if (upd.error) {
    return NextResponse.json({ error: "Could not unlock deep access." }, { status: 500 });
  }

  await (supabase.from("funder_dataroom_audit") as any)
    .insert({
      funder_member_id: member.id,
      action: "nda_accept",
      detail: { nda_version: NDA_VERSION, signer_name: signerName },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}

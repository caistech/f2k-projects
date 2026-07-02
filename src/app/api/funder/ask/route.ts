import { NextResponse } from "next/server";
import { requireFunder, allowedTiersFor } from "@/lib/funders/funder-auth";
import { answerQuestion } from "@/lib/funders/answer";
import { createSupabaseService } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST { question } — RAG answer grounded ONLY in the funder's tier-allowed documents, with
// citations. Every ask is audited. Spec: funder-dataroom-build memory.
export async function POST(request: Request) {
  const auth = await requireFunder();
  if (auth instanceof NextResponse) return auth;
  const { member } = auth;

  const body = await request.json().catch(() => ({}));
  const question = String(body?.question ?? "").trim();
  if (question.length < 3) {
    return NextResponse.json({ error: "Please ask a fuller question." }, { status: 400 });
  }

  let result;
  try {
    result = await answerQuestion(question, allowedTiersFor(member.max_tier));
  } catch (err) {
    console.error("funder ask error:", err);
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }

  const supabase = createSupabaseService();
  await (supabase.from("funder_dataroom_audit") as any)
    .insert({
      funder_member_id: member.id,
      action: "ask",
      detail: { question, citations: result.citations.map((c) => c.displayName) },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ answer: result.answer, citations: result.citations });
}

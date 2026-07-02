// The funder Q&A core: retrieve tier-filtered chunks, then have Claude answer ONLY from them with
// inline citations (degrade-don't-fake on an empty corpus). Returns the cited sources for the UI
// chips + the audit trail. Ported from LingoPure. Answer model env-overridable via FUNDER_ANSWER_MODEL.

import Anthropic from "@anthropic-ai/sdk";
import { retrieveChunks, type RetrievedChunk } from "@/lib/funders/retrieval";
import { ASK_SYSTEM_PROMPT, buildContext } from "@/lib/funders/ask-prompt";
import type { FunderTier } from "@/lib/funders/funder-auth";

const ANSWER_MODEL = process.env.FUNDER_ANSWER_MODEL ?? "claude-sonnet-4-6";

export type Citation = { documentId: string; displayName: string; page: number | null };
export type AnswerResult = { answer: string; citations: Citation[]; chunks: RetrievedChunk[] };

const NO_ANSWER =
  "I don't have anything in the data room that addresses that. Try rephrasing, or open the documents directly.";

export async function answerQuestion(
  question: string,
  allowedTiers: FunderTier[],
): Promise<AnswerResult> {
  const chunks = await retrieveChunks(question, allowedTiers, 12);
  if (chunks.length === 0) return { answer: NO_ANSWER, citations: [], chunks: [] };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const anthropic = new Anthropic({ apiKey });

  const r = await anthropic.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 1500,
    system: ASK_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Data-room excerpts:\n\n${buildContext(chunks)}\n\n---\nFunder question: ${question}`,
      },
    ],
  });

  const block = r.content.find((b) => b.type === "text");
  const answer = block && block.type === "text" ? block.text.trim() : "";
  if (!answer) throw new Error("answer model returned empty output");

  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const c of chunks) {
    if (seen.has(c.documentId)) continue;
    seen.add(c.documentId);
    citations.push({ documentId: c.documentId, displayName: c.displayName, page: c.page });
  }
  return { answer, citations, chunks };
}

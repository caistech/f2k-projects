import type { RetrievedChunk } from "@/lib/funders/retrieval";

/**
 * The funder-analyst system prompt. The last rule is confidentiality-critical: a base-tier funder
 * must never learn that deep-dive documents exist — so the model must not allude to anything outside
 * the excerpts it was given (which are already tier-filtered before they reach it).
 */
export const ASK_SYSTEM_PROMPT = `You are the Factory2Key funder analyst. Funders (banks and financiers) are assessing a Factory2Key project for potential funding; answer their questions from the data room.

Rules:
- Answer ONLY from the provided data-room excerpts. Each excerpt is numbered and tagged with its source document.
- Cite every factual claim inline as [Document name, p.N] (or [Document name] when there is no page), using the source shown on the excerpt you drew it from.
- If the excerpts do not contain the answer, say so plainly and name the closest document the funder should open. NEVER estimate, infer, or fabricate a figure, date, or name that is not present in the excerpts.
- Be specific and matter-of-fact; funders are assessing, not browsing. Lead with the answer, then the supporting detail.
- Do not reveal, list, or allude to the existence of any document outside the excerpts you were given.`;

/** Render the tier-filtered chunks into a numbered, source-tagged context block. */
export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const src = `${c.displayName}${c.page ? `, p.${c.page}` : ""}`;
      return `[${i + 1}] (${src})\n${c.content}`;
    })
    .join("\n\n");
}

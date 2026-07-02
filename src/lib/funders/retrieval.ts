// Tier-filtered RAG retrieval over the funder data room. The chunks table + match_funder_chunks
// RPC are RLS-protected and EXECUTE-granted to service_role only, so retrieval runs through the
// service-role client AFTER the route resolved the caller's allowed tiers. The tier filter lives
// inside the SECURITY DEFINER RPC — passing tiers here can only narrow, never widen, access.
// Ported from LingoPure. Spec: funder-dataroom-build memory.

import OpenAI from "openai";
import { createSupabaseService } from "@/lib/supabase-service";
import type { FunderTier } from "@/lib/funders/funder-auth";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-large";
export const EMBEDDING_DIMS = 1536; // must match vector(1536) in migration 0069

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  displayName: string;
  page: number | null;
  content: string;
  isVisionCaption: boolean;
  tier: FunderTier;
  similarity: number;
};

export async function embedText(input: string | string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const openai = new OpenAI({ apiKey });
  const r = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
    dimensions: EMBEDDING_DIMS,
  });
  return r.data.map((d) => d.embedding as number[]);
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embedText(text))[0];
}

export async function retrieveChunks(
  query: string,
  allowedTiers: FunderTier[],
  matchCount = 12,
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);
  const svc = createSupabaseService();
  const { data, error } = await (svc as any).rpc("match_funder_chunks", {
    query_embedding: embedding,
    allowed_tiers: allowedTiers,
    match_count: matchCount,
  });
  if (error) throw new Error(`retrieval failed: ${error.message}`);
  return ((data ?? []) as any[]).map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    displayName: r.display_name,
    page: r.page,
    content: r.content,
    isVisionCaption: r.is_vision_caption,
    tier: r.confidentiality_tier,
    similarity: r.similarity,
  }));
}

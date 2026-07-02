// Funder data-room ingestion: download an uploaded file → extract text → chunk → embed (OpenAI) →
// store into funder_document_chunks. Runs server-side with the service role (the chunks table is
// service-role-only). Ported from the LingoPure ingest pipeline. Spec: funder-dataroom-build memory.

import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { createSupabaseService } from "@/lib/supabase-service";
import { embedText } from "@/lib/funders/retrieval";

const CHUNK_CHARS = 3200; // ~800 tokens
const CHUNK_OVERLAP = 480; // ~120 tokens
const EMBED_BATCH = 64;

const TEXT_FORMATS = new Set(["txt", "csv", "md", "json", "log"]);
const IMAGE_MEDIA: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
const VISION_MODEL = process.env.FUNDER_VISION_MODEL ?? "claude-sonnet-4-6";
const VISION_PROMPT =
  "You are cataloguing a funder data-room image for a searchable index. Describe this image " +
  "precisely and factually: what it shows, the type of chart/diagram/plan, every axis label, " +
  "legend, series name, and any numbers or units visible, and the single claim or takeaway it " +
  "makes. If it is a screenshot of a document or dashboard, transcribe the key text and figures. " +
  "Do not speculate beyond what is visible. Write 1-3 dense paragraphs.";

/** Caption an image with Claude vision so image-only docs become searchable text. */
async function captionImage(bytes: Buffer, mediaType: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const anthropic = new Anthropic({ apiKey });
  const resp = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as any, data: bytes.toString("base64") } },
          { type: "text", text: VISION_PROMPT },
        ],
      },
    ],
  });
  return resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
}

async function extractText(bytes: Buffer, format: string): Promise<string> {
  const fmt = format.toLowerCase();
  if (fmt === "pdf") {
    // Newer pdf-parse exposes a PDFParse class with getText().
    const mod: any = await import("pdf-parse");
    const PDFParse = mod.PDFParse ?? mod.default?.PDFParse;
    const parser = new PDFParse({ data: bytes });
    const r = await parser.getText();
    return String(r?.text ?? "");
  }
  if (fmt === "docx" || fmt === "doc") {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return value ?? "";
  }
  if (fmt === "xlsx" || fmt === "xls") {
    const wb = XLSX.read(bytes, { type: "buffer" });
    return wb.SheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, blankrows: false });
      return `# ${name}\n` + rows.map((r) => (Array.isArray(r) ? r.join("\t") : "")).join("\n");
    }).join("\n\n");
  }
  if (TEXT_FORMATS.has(fmt)) return bytes.toString("utf8");
  // Images and unknown binary formats are skipped in Stage B v1 (no vision captions yet).
  return "";
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_CHARS, clean.length);
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * (Re)ingest a single funder document: replaces its chunks with a freshly extracted + embedded set.
 * Returns the chunk count. Throws on extract/embed failure so the caller can surface it.
 */
export async function ingestFunderDocument(documentId: string): Promise<number> {
  const svc = createSupabaseService();
  const { data: doc, error } = await (svc.from("funder_documents") as any)
    .select("id, storage_path, format, confidentiality_tier")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !doc) throw new Error("Document not found");

  const dl = await svc.storage.from("funder-dataroom").download(doc.storage_path);
  if (dl.error || !dl.data) throw new Error("Could not download the file for indexing");
  const bytes = Buffer.from(await dl.data.arrayBuffer());

  // Images become a single Claude-vision caption chunk; everything else is extracted + chunked.
  const fmt = String(doc.format).toLowerCase();
  const mediaType = IMAGE_MEDIA[fmt];
  let pieces: string[];
  let isVision = false;
  if (mediaType) {
    const caption = await captionImage(bytes, mediaType);
    pieces = caption ? [caption] : [];
    isVision = true;
  } else {
    pieces = chunkText(await extractText(bytes, doc.format));
  }

  // Replace existing chunks for this document (idempotent re-index).
  await (svc.from("funder_document_chunks") as any).delete().eq("document_id", documentId);

  if (pieces.length === 0) {
    await (svc.from("funder_documents") as any)
      .update({ ingested_at: new Date().toISOString(), chunk_count: 0 })
      .eq("id", documentId);
    return 0;
  }

  // Embed in batches, then insert.
  const rows: any[] = [];
  for (let i = 0; i < pieces.length; i += EMBED_BATCH) {
    const batch = pieces.slice(i, i + EMBED_BATCH);
    const vectors = await embedText(batch);
    batch.forEach((content, j) => {
      rows.push({
        document_id: documentId,
        confidentiality_tier: doc.confidentiality_tier,
        page: null,
        chunk_index: i + j,
        content,
        is_vision_caption: isVision,
        embedding: vectors[j],
      });
    });
  }

  const ins = await (svc.from("funder_document_chunks") as any).insert(rows);
  if (ins.error) throw new Error(`Could not store chunks: ${ins.error.message}`);

  await (svc.from("funder_documents") as any)
    .update({ ingested_at: new Date().toISOString(), chunk_count: rows.length })
    .eq("id", documentId);

  return rows.length;
}

import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  parsePostCallPayload,
  extractMessages,
} from "@caistech/elevenlabs-convai";
import { createSupabaseService } from "@/lib/supabase-service";
import { developerVoiceConfig } from "@/voice.config";

export const dynamic = "force-dynamic";

/**
 * ElevenLabs post-call webhook for Morgan, the developer-onboarding voice guide.
 *
 * Fires after EVERY Morgan call (workspace webhook bound at provision time), so a discovery
 * conversation is captured server-side even when the developer never submits the form —
 * abandonment-proof. Each transcript is upserted into developer_voice_conversations keyed by
 * the ElevenLabs conversation_id; if a developer_onboarding row already references that
 * conversation (the form was submitted first), we link them.
 *
 * Security: the HMAC signature is verified against ELEVENLABS_WEBHOOK_SECRET. Unverified →
 * 401, fail-closed (per the Voice Memory Standard — every convai webhook verifies its HMAC).
 */

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("elevenlabs-signature");
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!secret) {
    // Misconfiguration — refuse rather than accept unverified payloads.
    console.error("convai post-call: ELEVENLABS_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = parsePostCallPayload(raw);
  if (!payload) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const { conversation_id, agent_id, status, analysis, metadata } = payload.data;

  // Only persist OUR developer-guide agent's calls (the workspace webhook is workspace-scoped;
  // ignore any other agent that happens to deliver here).
  if (agent_id !== developerVoiceConfig.agentId) {
    return NextResponse.json({ ok: true, ignored: "other agent" });
  }

  // role/content only — matches the client-captured voice_transcript shape (tool-call turns stripped).
  const transcript = extractMessages(payload, conversation_id).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const supabase = createSupabaseService();

  // Does a submitted onboarding row already point at this conversation? Link it if so.
  const { data: existingRow } = await supabase
    .from("developer_onboarding")
    .select("id")
    .eq("voice_conversation_id", conversation_id)
    .maybeSingle();

  const { error } = await (supabase.from("developer_voice_conversations") as any).upsert(
    {
      conversation_id,
      agent_id,
      status: status ?? null,
      summary: analysis?.transcript_summary ?? null,
      duration_secs: metadata?.call_duration_secs ?? null,
      transcript,
      raw: payload as unknown as Record<string, unknown>,
      onboarding_id: (existingRow as { id?: string } | null)?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "conversation_id" },
  );

  if (error) {
    console.error("convai post-call upsert failed:", error.message);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, conversation_id, turns: transcript.length });
}

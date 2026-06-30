import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClientConfig, resolveClaudeModel } from "@caistech/ai-client";
import { z } from "zod";
import { buildEstatePrompt } from "@/lib/estate-voice-prompt.mjs";

export const dynamic = "force-dynamic";

/**
 * Text fallback for "Marni", the buyer-facing estate concierge. The primary experience is the
 * canonical ElevenLabs voice agent (see BuyerVoiceAgent.tsx + estateVoiceConfig). This route is
 * the no-mic fallback brain: when voice can't run, the widget's typed box routes here and we
 * return Marni's next line using the SAME prompt the voice agent speaks (estate-voice-prompt.mjs),
 * with this estate's indicative facts, so spoken + typed never drift.
 */

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(60),
  // The estate the visitor is on, so Marni speaks about it (all fields optional).
  estate: z
    .object({
      name: z.string().max(120).optional(),
      location: z.string().max(160).optional(),
      stage: z.string().max(160).optional(),
      pricing: z.string().max(200).optional(),
      model: z.enum(["lot-map", "waitlist"]).optional(),
      extra: z.string().max(300).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { messages, estate } = parsed.data;

  // getClaudeClientConfig throws when neither key is configured — surface that as a graceful
  // "use the page instead" rather than a 500.
  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The guide is unavailable right now — please explore the estate below and register your interest, and we'll be in touch.",
      },
      { status: 503 },
    );
  }

  const config = getClaudeClientConfig({
    openrouterKey: process.env.OPENROUTER_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    referer: process.env.NEXT_PUBLIC_CANONICAL_URL,
    appTitle: "f2k-projects (estate concierge voice)",
  });

  const client = new Anthropic(config);
  const model = resolveClaudeModel({
    openrouterKey: process.env.OPENROUTER_API_KEY,
    override: process.env.AGENT_MODEL,
  });

  // Same prompt the voice agent speaks; the trailing line keeps the typed path turn-shaped.
  const systemPrompt = `${buildEstatePrompt(estate || {})}

Return ONLY Marni's next line as plain text — no stage directions, no quotes, no markdown.`;

  // Seed an opening turn if the visitor hasn't said anything yet.
  const convo =
    messages.length === 0
      ? [{ role: "user" as const, content: "(The visitor just opened the estate page.)" }]
      : messages;

  try {
    const completion = await client.messages.create({
      model,
      max_tokens: 300,
      system: systemPrompt,
      messages: convo.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({
      reply:
        reply ||
        "Happy to help — would you like to know what's available, the difference between land and house-and-land, or how to register your interest?",
    });
  } catch (err) {
    console.error("Estate concierge voice error:", err);
    return NextResponse.json(
      {
        error:
          "The guide hit a snag — please carry on exploring the estate below and register your interest, and we'll follow up.",
      },
      { status: 502 },
    );
  }
}

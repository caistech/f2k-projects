import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClientConfig, resolveClaudeModel } from "@caistech/ai-client";
import { z } from "zod";
import { EMPLOYER_PROMPT } from "@/lib/employer-voice-prompt.mjs";

export const dynamic = "force-dynamic";

/**
 * Text fallback for the employer (take-or-pay) variant of Morgan. The primary experience is the
 * canonical ElevenLabs voice agent (see EmployerVoiceAgent.tsx + voice.config.ts). This route is
 * the no-mic fallback brain: when voice can't run, the widget's typed box routes here and we
 * return Morgan's next line using the SAME prompt the voice agent uses, so the spoken and typed
 * experiences never drift.
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
});

const SYSTEM_PROMPT = `${EMPLOYER_PROMPT}

Return ONLY Morgan's next line as plain text — no stage directions, no quotes, no markdown.`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { messages } = parsed.data;

  // getClaudeClientConfig throws when neither key is configured — surface that as a graceful
  // "use the form instead" rather than a 500.
  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The guide is unavailable right now — please register your interest using the form below and we'll be in touch.",
      },
      { status: 503 },
    );
  }

  const config = getClaudeClientConfig({
    openrouterKey: process.env.OPENROUTER_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    referer: process.env.NEXT_PUBLIC_CANONICAL_URL,
    appTitle: "f2k-projects (employer take-or-pay voice)",
  });

  const client = new Anthropic(config);
  const model = resolveClaudeModel({
    openrouterKey: process.env.OPENROUTER_API_KEY,
    override: process.env.AGENT_MODEL,
  });

  // Seed an opening turn if the employer hasn't said anything yet.
  const convo =
    messages.length === 0
      ? [
          {
            role: "user" as const,
            content: "(The employer just opened the take-or-pay form.)",
          },
        ]
      : messages;

  try {
    const completion = await client.messages.create({
      model,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
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
        "Roughly how many staff are you trying to house, and would you prefer whole houses or beds by the room?",
    });
  } catch (err) {
    console.error("Employer take-or-pay voice error:", err);
    return NextResponse.json(
      {
        error:
          "The guide hit a snag — please carry on with the form below and we'll follow up.",
      },
      { status: 502 },
    );
  }
}

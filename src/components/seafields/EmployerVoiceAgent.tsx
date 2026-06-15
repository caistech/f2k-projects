"use client";

import { useCallback, useMemo, useState } from "react";
import { VoiceWidget } from "@caistech/elevenlabs-convai/react";
import { employerVoiceConfig } from "@/voice.config";
import {
  EMPLOYER_PROMPT,
  EMPLOYER_FIRST_MESSAGE,
} from "@/lib/employer-voice-prompt.mjs";

export type VoiceMessage = { role: "user" | "assistant"; content: string };

/**
 * Morgan (employer / take-or-pay variant) — the voice guide on the Seafields local-employer
 * accommodation page. The same canonical portfolio voice stack as the developer + funder
 * agents (@caistech/elevenlabs-convai's VoiceWidget + the shared, already-provisioned Morgan
 * agent), with the same transcript-lifted-to-parent + typed-fallback wiring.
 *
 * Per the brief this REUSES Morgan's agent and ALWAYS passes the employer prompt+greeting via
 * the widget `overrides` (exactly how Sloane shares Morgan's agent), so the shared agent speaks
 * to the take-or-pay employer — never as the developer-facing Morgan. Mounted ONLY on the
 * rent-it path; the own-it path is a plain redirect with no voice.
 */

interface Props {
  transcript: VoiceMessage[];
  onTranscriptChange: (messages: VoiceMessage[]) => void;
  /** The live ElevenLabs conversation id (from onConnect), lifted so the form can submit it. */
  onConversationId?: (conversationId: string) => void;
}

export default function EmployerVoiceAgent({
  transcript,
  onTranscriptChange,
  onConversationId,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  // ALWAYS override the prompt+greeting to the employer/take-or-pay Morgan. This is also what
  // lets this page safely share the provisioned developer Morgan agent (see employerVoiceConfig):
  // without an override the shared agent would speak as the developer-facing Morgan.
  const overrides = useMemo(
    () => ({
      agent: {
        prompt: { prompt: EMPLOYER_PROMPT },
        firstMessage: EMPLOYER_FIRST_MESSAGE,
      },
    }),
    [],
  );

  // Voice turns: the widget hands us each final message (source 'ai' | 'user').
  const handleVoiceMessage = useCallback(
    (role: string, text: string) => {
      const clean = text.trim();
      if (!clean) return;
      onTranscriptChange([
        ...transcript,
        { role: role === "user" ? "user" : "assistant", content: clean },
      ]);
    },
    [transcript, onTranscriptChange],
  );

  // Typed fallback (no mic): route through the same discovery brain so Morgan still guides.
  const handleTextFallback = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const withUser: VoiceMessage[] = [
        ...transcript,
        { role: "user", content: clean },
      ];
      onTranscriptChange(withUser);
      setThinking(true);
      setError(null);
      try {
        const res = await fetch("/api/seafields/employer-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: withUser.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Morgan is unavailable right now.");
        onTranscriptChange([
          ...withUser,
          { role: "assistant", content: data.reply },
        ]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Morgan is unavailable right now — please carry on with the form below.",
        );
      } finally {
        setThinking(false);
      }
    },
    [transcript, onTranscriptChange],
  );

  return (
    <div className="bg-[#142C44] text-white p-6 sm:p-8 rounded">
      <div className="mb-5">
        <p className="font-ibm-mono text-xs tracking-[0.4em] uppercase text-[#C77F3A] mb-2">
          Talk to Morgan
        </p>
        <h3 className="font-archivo text-2xl font-black leading-tight">
          New to take-or-pay? Morgan will walk you through it
        </h3>
        <p className="text-white/60 font-archivo text-sm mt-2 max-w-md">
          Morgan explains how a take-or-pay rental commitment works, then helps you complete
          the registration below, field by field. It&apos;s optional — the form works on its
          own — and this is a registration of interest only, not a lease or an offer.
        </p>
      </div>

      {/* .emp-voice-widget keeps the embedded convai panel from overflowing the viewport
          on phones (globals.css) — without it the panel pins at left:44px + full width and
          adds ~44px of horizontal scroll at 375px (Mobile Marcus naive-tester, 2026-06-15). */}
      <div className="emp-voice-widget">
        <VoiceWidget
          {...employerVoiceConfig}
          coachName="Morgan"
          avatarUrl="/female_avatar.jpeg"
          title="Talk to Morgan — F2K's guide, who explains take-or-pay and helps you complete the registration below."
          overrides={overrides}
          onConnect={(conversationId) => onConversationId?.(conversationId)}
          onMessage={handleVoiceMessage}
          onTextFallbackSubmit={handleTextFallback}
          onError={(e) => setError(e)}
        />
      </div>

      {transcript.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 mt-4 max-h-64 overflow-y-auto space-y-3">
          {transcript.map((m, i) => (
            <div key={i} className="font-archivo text-sm leading-relaxed">
              <span
                className={`font-semibold ${m.role === "assistant" ? "text-[#C77F3A]" : "text-white"}`}
              >
                {m.role === "assistant" ? "Morgan" : "You"}:
              </span>{" "}
              <span className="text-white/85">{m.content}</span>
            </div>
          ))}
        </div>
      )}

      {thinking && (
        <p className="font-archivo text-sm text-white/60 mt-3" aria-live="polite">
          Morgan is thinking…
        </p>
      )}

      {error && (
        <div className="bg-amber-400/10 border border-amber-400/30 text-amber-200 px-4 py-2 text-sm font-archivo mt-4">
          {error}
        </div>
      )}
    </div>
  );
}

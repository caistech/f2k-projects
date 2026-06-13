// voice.config.ts — the F2K developer-onboarding voice agent ("Morgan").
//
// Dedicated ElevenLabs ConvAI agent provisioned by scripts/provision-developer-agent.mjs
// (canonical portfolio voice + the @caistech/elevenlabs-convai stack used by SayFix and the
// rest of the portfolio). The agentId is public/safe to commit — the workspace key is never
// exposed; abuse is bounded by the Security allowlist set at provision time.
//
// To refresh the prompt/voice: edit src/lib/developer-voice-prompt.mjs, then re-run
//   node scripts/provision-developer-agent.mjs
import type { VoiceConfig } from "@caistech/elevenlabs-convai";

export const developerVoiceConfig: VoiceConfig = {
  // Prod uses the dedicated F2K agent (bound to the PROD post-call webhook → prod DB). The demo
  // deploy overrides this with NEXT_PUBLIC_ELEVENLABS_DEVELOPER_AGENT_ID = its own agent (bound to
  // the DEMO webhook → demo DB), so demo conversations capture to demo, not prod. One ElevenLabs
  // agent can only post to one webhook URL, hence a separate agent per environment.
  agentId:
    process.env.NEXT_PUBLIC_ELEVENLABS_DEVELOPER_AGENT_ID ||
    "agent_5901ktzqy26zf9e9eyvxqfr28x47",
  placement: "inline",
  mode: "discovery",
  textFallback: true,
};

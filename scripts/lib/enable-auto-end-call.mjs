// enable-auto-end-call.mjs — give a voice agent the means to hang up by itself.
//
// THE PROBLEM IT FIXES ("lurking"): once the guide finished wrapping up, the agent had no way to
// end the call — no end_call tool, no duration cap — so the WebRTC session stayed open with the
// mic live, "lurking" after the conversation was effectively over (poor UX + wasted ElevenLabs
// minutes on the workspace key).
//
// THE FIX (the ElevenLabs-native auto end-call): enable the `end_call` SYSTEM tool so the agent
// can terminate the call itself when the conversation is done, plus set a hard
// max_duration_seconds backstop so a forgotten/abandoned session can't lurk forever. The prompt
// (in the per-persona *-voice-prompt.mjs) tells the agent WHEN to call it.
//
// Why this lives here and not in @caistech/elevenlabs-convai's updateAgent: that helper only
// covers prompt/voice/name — not system tools or conversation settings. Rather than fork the
// package, both provision scripts (developer "Morgan" + funder "Sloane") consume this one helper.
//
// WIRE SHAPE (authoritative as of 2026-06; the legacy inline `prompt.tools` array was removed
// 2025-07-23): system tools live under conversation_config.agent.prompt.built_in_tools, keyed by
// name. We send the FULL prompt object (text + llm + temperature + built_in_tools) in one PATCH so
// a shallow replace of `prompt` can't drop the system prompt — then GET to confirm it stuck
// (ElevenLabs silently strips shapes it doesn't accept, so a 200 from PATCH is not proof).

import { ELEVENLABS_API, getAgent, DEFAULT_AGENT_LLM } from "@caistech/elevenlabs-convai";

const DEFAULT_END_CALL_DESCRIPTION =
  "End the call once the conversation is genuinely finished — the person has confirmed they're all " +
  "set and said goodbye, or they've gone quiet and unresponsive after you've checked in once. " +
  "Always give a brief, warm goodbye in the same turn before ending. Never end mid-task or while " +
  "they still have a question.";

/**
 * Enable the end_call system tool + a max-duration backstop on an existing agent, then verify.
 *
 * @param {string} apiKey        ElevenLabs workspace key.
 * @param {string} agentId       The provisioned agent id.
 * @param {object} opts
 * @param {string} opts.promptText           The agent's baked system prompt (re-sent so the
 *                                           single PATCH carries the whole prompt object).
 * @param {number} [opts.maxDurationSeconds] Hard cap (default 1200s / 20 min — matches the stack
 *                                           default and the "~20 min" the prompts promise).
 * @param {string} [opts.endCallDescription] Override the default "when to end" description.
 */
export async function enableAutoEndCall(apiKey, agentId, opts) {
  const {
    promptText,
    maxDurationSeconds = 1200,
    endCallDescription = DEFAULT_END_CALL_DESCRIPTION,
  } = opts;
  if (!promptText) throw new Error("enableAutoEndCall: promptText is required");

  // Read the live agent so we preserve its llm/temperature + any other built-in tools already on it.
  const live = await getAgent(apiKey, agentId);
  const livePrompt = live?.conversation_config?.agent?.prompt ?? {};
  const liveConversation = live?.conversation_config?.conversation ?? {};

  const prompt = {
    prompt: promptText,
    llm: livePrompt.llm || DEFAULT_AGENT_LLM,
    temperature: typeof livePrompt.temperature === "number" ? livePrompt.temperature : 0.7,
    built_in_tools: {
      ...(livePrompt.built_in_tools ?? {}),
      end_call: {
        name: "end_call",
        description: endCallDescription,
        params: { system_tool_type: "end_call" },
      },
    },
  };
  // Carry forward any tool_ids the agent already references (webhook/client tools live here).
  if (Array.isArray(livePrompt.tool_ids) && livePrompt.tool_ids.length > 0) {
    prompt.tool_ids = livePrompt.tool_ids;
  }

  const body = {
    conversation_config: {
      agent: { prompt },
      conversation: { ...liveConversation, max_duration_seconds: maxDurationSeconds },
    },
  };

  const res = await fetch(`${ELEVENLABS_API}/agents/${agentId}`, {
    method: "PATCH",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`enableAutoEndCall PATCH failed: ${res.status} ${await res.text()}`);
  }

  // GET-verify: ElevenLabs strips shapes it rejects, so only a re-read proves it landed.
  const after = await getAgent(apiKey, agentId);
  const afterPrompt = after?.conversation_config?.agent?.prompt ?? {};
  const endCall = afterPrompt?.built_in_tools?.end_call;
  const cap = after?.conversation_config?.conversation?.max_duration_seconds;
  if (!endCall) {
    throw new Error(
      "enableAutoEndCall: end_call did not persist (ElevenLabs stripped it — check the built_in_tools shape).",
    );
  }
  if (cap !== maxDurationSeconds) {
    throw new Error(
      `enableAutoEndCall: max_duration_seconds did not persist (wanted ${maxDurationSeconds}, got ${cap}).`,
    );
  }
  return { maxDurationSeconds: cap };
}

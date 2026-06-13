-- Developer onboarding — server-side voice-conversation capture (abandonment-proof)
--
-- The ElevenLabs post-call webhook delivers Morgan's full transcript after EVERY call,
-- even when the developer never submits the form. We persist each one here keyed by the
-- ElevenLabs conversation_id, so no discovery conversation is ever lost. When the form IS
-- submitted it carries the same conversation_id (developer_onboarding.voice_conversation_id),
-- which we link back via onboarding_id — giving one joined view of conversation + form.
--
-- Writes are service-role only (the webhook route verifies an HMAC first); RLS is enabled with
-- no public policies (deny-by-default for anon/auth, consistent with 0027/0046).

ALTER TABLE developer_onboarding
  ADD COLUMN IF NOT EXISTS voice_conversation_id TEXT;

CREATE TABLE IF NOT EXISTS developer_voice_conversations (
  conversation_id TEXT PRIMARY KEY,          -- ElevenLabs conversation id
  agent_id        TEXT,
  status          TEXT,                       -- ElevenLabs call status (done / failed / …)
  summary         TEXT,                       -- transcript_summary from analysis, if any
  duration_secs   INTEGER,
  transcript      JSONB DEFAULT '[]'::jsonb,   -- [{ role, content }, …] (tool-call turns stripped)
  raw             JSONB,                       -- full payload, for shaping the SayFix-loop dataset
  onboarding_id   UUID REFERENCES developer_onboarding(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE developer_voice_conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dev_voice_conv_onboarding
  ON developer_voice_conversations (onboarding_id);

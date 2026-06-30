# Buyer-facing public voice agent — scope (draft for sign-off)

**Why:** the §6 Voice standard wants a voice surface reachable from the chrome on every
UI-bearing surface. f2k has voice on the *operator/intake* surfaces (Morgan on `/developers`,
Sterling on `/funders`, the employer agent, the reports agent) but **none on the public
buyer-facing pages** (landing + the estate pages). That gap is the open naive-tester check
(code 10) keeping the gate from going green. This scopes the buyer concierge that closes it.

**Status:** SCOPE ONLY — no build yet. Build is gated on Dennis's go + the open decisions in §6.

---

## 1. The persona — "the estate concierge"
- **One concierge across all public estate pages + landing**, estate-aware via a per-session
  context override (the same pattern Morgan/Sterling use), NOT a separate agent per estate.
- Working name: **TBD** (Dennis to pick — keep it distinct from Morgan/Sterling). Consistent
  voice/opening/signature across the portfolio per the standard.
- **Function = guide / clarifier, NOT coaching.** She helps a visitor understand the estate and
  the (deliberately low-commitment) registration process; she is not a salesperson and never
  quotes a binding price or implies a reservation.

## 2. What she does (buyer-facing, estate-aware)
- Explains the estate she's on: stage/what's open, the **"registration of interest only — no
  deposit, nothing binding"** posture, and the headline pricing model in plain words
  ("land from $X, house & land from $Y") — pulled from the estate's data, never invented.
- Answers the recurring buyer questions: *"What's the difference between Serviced Land Only and
  House & Land?"*, *"How do I register interest?"*, *"What happens after I register?"*,
  *"Can I pick a specific lot?"*.
- **Hands off to the action, never replaces it:** points the buyer to the lot map / the
  registration form / their agent. Zero dead ends.
- **Estate context override** carries `{ estate_slug, estate_name, stage, headline_pricing }`
  at connect so she speaks about *this* estate (the agent PULLS authoritative values per the
  Voice Memory Standard — the override carries only the trigger/context, not a script of numbers).

## 3. Placement
- Chrome-level widget (FAB / launcher) on the **landing page** and **every public estate page**
  (Seafields, Branscombe, Dutton, Wavecrest) — present on the page (0–1 clicks, well within ≤3).
- Mobile: launcher thumb-reachable; panel = sheet on mobile, per the responsive rule.
- **Not** on the operator/admin/agent surfaces (those already have their own agents).

## 4. Build shape (consume the canonical stack — do NOT fork)
1. **Provision** a buyer-concierge ElevenLabs agent (mirror `scripts/provision-*-agent.mjs`),
   prompt authored in `src/lib/<concierge>-voice-prompt.mjs`, agent id scaffolded into
   `voice.config.ts` via `buildVoiceConfig` (never a hand-set `NEXT_PUBLIC_*`).
2. **Component** `BuyerVoiceAgent.tsx` wrapping `@caistech/elevenlabs-convai/react` `VoiceWidget`
   (mirror `DeveloperVoiceAgent.tsx`), mounted on the public pages with the estate context override.
3. **Text fallback** route `POST /api/estate/voice` (mirror `/api/developers/voice`) using the
   SAME prompt so spoken + typed never drift, and **degrade-don't-fake** when voice can't run.
4. **Conversation cap + spoken wrap-up** per the standard (the 4-piece browser-timer pattern).
5. **HMAC-verify** any convai webhook if post-call memory is wired (see §5).

## 5. Memory (Voice Memory Standard — scoped to a transient clarifier)
- A pre-registration public visitor is **anonymous** → use `mintAnonSessionToken`; identity is
  **server-derived at connect** (`conversation_id`, never a `user_id`).
- **Pull-only / lightweight memory is acceptable** for this transient clarifier — no persistent
  cross-session profile needed before the buyer has registered. (If we later link a concierge
  chat to a registration, that's a Tier-1 add, not part of this slice.)
- No PII stored pre-registration; the loop **degrades, doesn't fake**, on recall failure.

## 6. Open decisions (Dennis)
1. **Name** for the buyer concierge.
2. **Key model:** operator-key (like Morgan/Sterling on f2k's own marketing site) vs BYOK —
   recommend **operator-key** (this is f2k's own site, not a distributed product).
3. **Scope guard:** ship the clarifier-only slice first (answers + guide-to-register, estate-aware);
   **defer** persistent memory / chat-to-registration linking until validated (THIN_MVP discipline —
   don't add scale infra a 3-minute visitor doesn't feel).

## 7. Definition of done (closes gate code 10)
- Buyer concierge reachable from the chrome on landing + all public estate pages (mobile + desktop).
- Estate-aware (speaks about the page's estate), guides to registration, zero dead ends.
- Text fallback works (degrade-don't-fake); conversation cap + wrap-up set.
- `/voice-auditor` re-run shows the public surfaces' Required voice placement satisfied.

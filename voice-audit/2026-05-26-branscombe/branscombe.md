# Voice placement map — Branscombe Estate (f2k-projects)

**Scope:** Branscombe surfaces only — public `/branscombe-estate` (hero, floor
plans/elevations, site map, registration-of-interest form) + admin
`/admin/branscombe-units`, `/admin/branscombe-pipeline`. Last piece of the
2026-05-26 Branscombe sweep (naive-tester done: `naive-tester-reports/2026-05-26-branscombe/`).

**Current:** `@caistech/elevenlabs-convai` consumed? **no** · VoiceWidget present? **no** · `voice.config.ts`? **no** · manifest `voice_agent_status`: **absent**

**Framing.** Branscombe (like the rest of f2k-projects) is a **property marketing +
lead-capture + light ops** product. Its value is **land/house sales + registration
of interest + operator allocation** — *not* a voice coach. So there is **no coaching
surface**; every candidate is **guide/clarifier** (never coaching). This is
consistent with the repo-level audit (2026-05-25).

| Surface / flow | Verdict | Function | Why | Integration shape |
|---|---|---|---|---|
| `/branscombe-estate` **registration-of-interest form** | **Could-add-value (HIGH)** | Guide/clarifier | Dense buyer concepts a label can't fully carry, several flagged by the naive-tester: **Finance = 30 days from contract**, **Settlement = "On Title"**, **turnkey inclusions undefined**, **no price anchor** anywhere, **title type (Torrens/strata) unknown**, and the **3-home first/second/third-choice cap**. A real buyer hits exactly these "what does this mean for me?" moments mid-form. | In-context `useConversation` + `sendContextualUpdate` on the register wizard, backed by an always-on chrome FAB (`@caistech/elevenlabs-convai` `/react` VoiceWidget, estate-context-aware). BYOK, canonical persona. |
| `/branscombe-estate` hero / about / **floor plans + elevations** lightboxes | Could-add-value (low) | Guide/clarifier | A "talk to us about the homes" concierge could answer design/spec questions, but the visual content is self-serving. | Same chrome FAB; not load-bearing. |
| `/branscombe-estate` **site map** (browse + select up to 3) | Not-needed | — | Selecting homes on the map is self-evident; a static flow fully serves it. Adding voice here = noise. | — |
| `/admin/branscombe-units` + edit modal (allocated-to flips status, **dwelling overlay**, **soft-allocate**, wholesale/retail) | Could-add-value (low) | Guide/clarifier | Nuanced single-operator decisions (point-8 "admin decisions"); explanatory header + field hints already carry most of it. Low priority (internal, single-operator). | In-context `useConversation` clarifier; same hub package. |
| `/admin/branscombe-pipeline` | Not-needed | — | Operator dashboard; matter-of-fact, served by its explanatory header. | — |

## Recommended `voice_agent_status`: **absent** → schedule (UNCHANGED)

**Not Required.** These are public marketing/registration pages + an internal
single-operator admin — the bar for *Required* (nuance/value undeliverable without
voice) isn't met; explanatory headers + a well-explained static flow serve most
users, and force-fitting voice onto a marketing page is itself a §6 defect. The
**registration form is a genuine HIGH could-add-value** guide/clarifier surface —
schedule it at the next estate-surface revamp, wired once at the chrome level so
all three estates (Branscombe/Seafields/Hemp) inherit it.

## Wiring checklist (when scheduled)
- [ ] Chrome-level FAB on every public estate page → consume `@caistech/elevenlabs-convai` `/react` **VoiceWidget** (CDN embed), estate-context-aware; **BYOK** ElevenLabs key; canonical persona; agent id via scaffolded `voice.config.ts` (never a hand-set `NEXT_PUBLIC_*`).
- [ ] Register wizard → in-context `useConversation` + `sendContextualUpdate` carrying the estate + the buyer's current draft (finance/settlement/turnkey/title/3-home-cap clarifications).
- [ ] One shared wiring for all 3 estates — never a per-estate re-implementation.

## Live validation delta (Phase 2)
No separate `/browse` spawn needed — the two `/naive-tester` live passes earlier today (Anneke desktop + Mobile Marcus) **both independently flagged §6 ❌: no voice/assistant/help surface anywhere in the chrome** on the live `/branscombe-estate`. That corroborates the **Could-add-value (HIGH)** verdict on the registration surface. **No coaching agent exists → no persistent-memory loop to test (memory-loop check: n/a).**

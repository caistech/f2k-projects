# Voice placement map — F2K Projects (f2k-projects) — Branscombe-focused refresh

Current: `@caistech/elevenlabs-convai` consumed? **no** · VoiceWidget present? **no** · manifest voice_agent_status: **absent**

Refresh of the 2026-05-25-0800 audit, triggered by the post-Uwe Branscombe ROI release (5 floor-plan tiles, revised Purchase Terms, the 3-home selection cap, restyled privacy note). The repo-scan findings are **unchanged**: no voice package, no `VoiceWidget`, no `voice.config.ts`. No coaching surface exists — F2K's value is land sales + lead capture + ops, not a voice coach — so every candidate is **guide/clarifier**, never coaching.

| Surface / flow | Verdict | Function | Why | Integration shape |
|---|---|---|---|---|
| `/branscombe-estate` + its registration flow | **Could-add-value (HIGH)** | Guide/clarifier | Dense buyer concepts a label can't fully carry, several of them touched today: **Finance = 30 days from date of contract**, **Settlement = "On Title" (after issue of title)**, deposit/turnkey/modular build, the **3-home first/second/third-choice cap**, and the price-expectation field (which asks a buyer to name a number with no on-page price anchor). A real buyer hits exactly these "what does this mean for me?" moments. | Always-on chrome FAB via `@caistech/elevenlabs-convai` `/react` VoiceWidget (CDN embed), estate-context-aware; for the register wizard, in-context `useConversation` + `sendContextualUpdate`. BYOK, canonical persona. |
| Other public estate pages + register flows (`/seafields-estate`, `/hemp-homes-for-eco-communities`) | Could-add-value (HIGH) | Guide/clarifier | Same shape — covenant / R20 setbacks / GROH eligibility / staged release / land-only vs H&L. | Same FAB + in-context clarifier. |
| `/admin/*` nuanced modals (allocation buckets, stage gating, reason-for-change, pricing overrides) | Could-add-value (low) | Guide/clarifier | Nuanced single-operator decisions; point-8 "admin decisions" fit. Low priority (internal). | In-context `useConversation` clarifier; same hub package. |
| `/agent/(portal)` onboarding + masked-availability | Could-add-value (low) | Guide/clarifier | Partner-agent onboarding semantics. | Chrome FAB via the hub VoiceWidget. |
| Auth pages, `/admin/audit-log`, CRUD lists, `/privacy`, unsubscribe | Not-needed | — | Static / simple forms fully served by labels. | — |

## Recommended voice_agent_status: **absent** → schedule migration (UNCHANGED)
Today's release is a **mid-stream content update**, not a major revamp. Per the VOICE AI rule, voice is *designed in at the next major revamp*, not force-fitted onto a content release (force-fitting is itself a §6 defect). Verdict holds from 08:00: schedule the public-estate clarifier at the next estate-surface revamp. **Not Required** because this is a public marketing/registration page where explanatory headers + a well-explained static flow serve most users — the bar for "Required" (nuance/value undeliverable without voice) isn't met here.

## Wiring checklist (when scheduled)
- [ ] Public estate clarifier → chrome FAB; consume `@caistech/elevenlabs-convai` + its `/react` VoiceWidget; agent id via a scaffolded `voice.config.ts` (NOT a hand-set `NEXT_PUBLIC_*`); BYOK key; canonical persona; estate knowledge (lots/designs/**Purchase Terms**/covenant/R20/staged release/the 3-choice cap) as the agent's context.
- [ ] (later) `/admin` nuanced-modal clarifier; (later) `/agent` portal clarifier — same hub package, same pattern.

## Live validation delta (Phase 2)
No separate browse spawn needed — the two `/naive-tester` live passes run immediately before this audit both independently flagged **§6 ❌: no voice/assistant/help surface present anywhere in the chrome** on the live `/branscombe-estate` (desktop persona Anneke and Mobile Marcus). That corroborates the **Could-add-value (HIGH)** verdict on the registration surface. No memory loop to test (no coaching agent exists). Behavioural memory check: **n/a**.

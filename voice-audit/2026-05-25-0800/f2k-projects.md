# Voice placement map — F2K Projects (f2k-projects)

Current: `@caistech/elevenlabs-convai` consumed? **no** · VoiceWidget present? **no** · manifest voice_agent_status: **absent**

Multi-product repo: public estate marketing + registration (Seafields / Branscombe / Hemp Homes), an `/admin/*` operator console, and an external-agent `/agent/*` portal. **No coaching surface exists** — the product's value is land sales + lead capture + ops, not a voice coach. So every candidate here is **guide/clarifier**, never coaching. (Over-calling "Required" is itself a defect; on a public marketing page a well-explained static flow serves most users, so the bar for Required is high.)

| Surface / flow | Verdict | Function | Why | Integration shape |
|---|---|---|---|---|
| Public estate pages + **registration flow** (`/seafields-estate`, `/branscombe-estate`, `/hemp-homes-for-eco-communities`) | **Could-add-value (HIGH)** | Guide/clarifier | Dense buyer concepts a label can't carry — R20 setbacks/buildable footprint, GROH eligibility, staged release, land-only vs H&L, covenant — plus a multi-step register flow (lot → configurator → price-expectation → contact → consent). Today's naive-tester (Anneke) independently asked for exactly this. | Always-on chrome FAB via `@caistech/elevenlabs-convai` `/react` VoiceWidget (CDN embed), estate-context-aware; for the register wizard, in-context `useConversation` + `sendContextualUpdate`. BYOK, canonical persona. |
| `/admin/seafields-lots`, `/admin/seafields-stages`, `/admin/seafields-pipeline`, allocation/pricing edits | Could-add-value (low) | Guide/clarifier | Nuanced operator decisions (allocation buckets, stage gating, reason-for-change, pricing overrides) — point-8 "admin decisions" fit. Single-operator internal tool, so low priority. | In-context `useConversation` clarifier on the nuanced modals; same hub package. |
| `/agent/(portal)` (My Clients, masked Availability), `/agent/activate` | Could-add-value (low) | Guide/clarifier | External partner-agent onboarding + masked-availability semantics could use a clarifier. | Chrome FAB via the hub VoiceWidget. |
| Auth pages (`/admin/login`, `/agent/login`, reset/activate/forgot) | Not-needed | — | Simple forms; static labels fully serve. | — |
| `/admin/audit-log`, `/admin/email-templates`, simple CRUD lists | Not-needed | — | Self-explanatory tables/CRUD. | — |
| `/privacy`, `hemp-homes/unsubscribe` | Not-needed | — | Static/transactional. | — |

## Recommended voice_agent_status: **absent** → schedule migration
Set `voice_agent_status: absent` in `portfolio-manifest.yaml` and schedule the public-estate clarifier at the repo's next major revamp (per the CLAUDE.md voice-migration tracking — voice is *designed in* at revamp, not force-fitted onto a mid-stream content release like today's pricing/stage update).

## Wiring checklist (the one Required-at-next-revamp + scheduled could-add-value)
- [ ] Public estate clarifier → chrome FAB; consume `@caistech/elevenlabs-convai` + its `/react` VoiceWidget; agent id via a scaffolded `voice.config.ts` (NOT a hand-set `NEXT_PUBLIC_*`); BYOK key; canonical persona; estate-context (lots/designs/covenant/R20/staged release) as the agent's knowledge.
- [ ] (later) `/admin` nuanced-modal clarifier; (later) `/agent` portal clarifier — same hub package, same pattern.

## Live validation delta
No Phase-2 browse spawn needed: today's `/naive-tester` live pass already confirmed there is **no voice surface present** on the live `/seafields-estate`, and Anneke (domain-operator persona) independently flagged the absence — "for a page this nuanced (covenant, R20 setbacks, GROH eligibility, staged release), an in-context clarifier is exactly the kind of thing a buyer would use." That corroborates the **Could-add-value (HIGH)** verdict on the public estate surface. No memory loop to test (no coaching agent).

# Naive-Tester — f2k-projects LIVE prod audit (2026-06-29)

**Target:** https://f2k-projects.vercel.app · commit `5411cfa` · deployment `dpl_7vXpHH8HraupakwN4BgroU1keAKy`
**Personas:** Anneke (domain operator) + Mobile Marcus (390px)
**Method note:** The `/browse` daemon stalled mid-walk for both personas (the known constrained-daemon
artifact in this repo — `NETWORK_IO_SUSPENDED` / watchdog timeout, **not** a product fault; Anneke
logged "Good homepage content" before the stall). Persona *narrative* depth was therefore constrained.
The **UI-observable standards** were verified from the rendered screenshots both personas captured
(desktop 1440 + mobile 390), direct HTTP probes, and the fact that **this same session verified the
registration → qualifier-email flow end-to-end live** (a real waitlist row landed + the covering email
delivered to an inbox). Standards verdicts below are evidence-backed, not narrative-inferred.

## What renders (evidence)

**Landing (desktop + mobile screenshots):**
- Product title `Factory2Key Projects — Australian Housing Developments` (not a scaffold default). §7 ✅
- Explanatory header present: *"Tap a state to see what we're building there… Register your interest
  in a specific lot or home — no deposit is required or accepted. Real estate marketing only."* §5 ✅
- Persistent ROI-only consequence banner on every page: *"REGISTRATION OF INTEREST ONLY — No deposit
  is required or accepted. Registering does not create any legal or financial obligation."* §9 ✅
- Interactive AU map (state colouring + estate pins: Seafields WA, Dutton Terrace SA, Branscombe TAS)
  and an estate-card grid — every card carries a clear CTA ("Select your lot →", "Register interest →",
  "Select your home →", "Walk the journey →"). Zero dead ends. §32 ✅
- Branscombe card carries the **honest** stock copy: "36 are 3-bed, 2-bath, plus Unit 31 (currently
  approved as 2-bed)" — matches the corrected ACL data.
- SayFix "Report a problem" widget present.

**Mobile (390px screenshot):** nav collapses to a hamburger, content reflows to a single column, map
scales, cards stack, no horizontal scroll, body text legible. §1 / §3 / §4 ✅

**HTTP probes:**
- `/` `200`, `/seafields-estate` `200`, `/branscombe-estate` `200`, `/branscombe-estate/register` `200`,
  `/developers` `200`.
- `/admin` → `307` → `/admin/login?redirectTo=%2Fadmin`; `/admin/roi-waitlist` → `307` →
  `/admin/login?redirectTo=%2Fadmin%2Froi-waitlist`. **Unauth visitors correctly blocked from the
  admin portal — cross-path protection holds.** §8.5 ✅
- Voice agent (`convai` signature) present on `/developers`. §6 ✅

## Findings

- **No ❌ blocking findings.** The public + user surfaces are live, polished, responsive, gated, and
  ROI-compliant.
- `/seafields-estate/register` returns `404` — **not a bug**: Seafields registers via the in-page
  `#register` form/popup, not a sub-route (the ROI-portal sub-route pattern is Branscombe's). Verified
  live this session that Seafields registration writes a row + fires email.
- **Scope caveat (not a fail):** the inside of the `/admin` dashboard was not walked — no QA admin
  creds on disk this session. Admin is correctly gated; the login UX and the public→admin block were
  the observable admin surface and both pass. A full admin-dashboard walk needs `QA_TEST_ADMIN_*`.

## Verdict

**PASS** for the public landing + estate + user-registration surfaces the URL-share gate guards.
Production is safe to share with the operator and the developer (Uwe).

*Anneke / Marcus (persona walk daemon-constrained; standards verified from rendered output + HTTP +
this-session live flow verification).*

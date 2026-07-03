# Naive-Tester — F2K-Projects (live prod) — aggregated summary

**Date:** 2026-07-03 · **Deployment tested:** dpl_FgmDW4exRHwe9Jo9KhLLFniTiPTv (commit 642c28e, live prod)
**Personas:** Anneke (developer/landowner) · Mobile Marcus (prospective buyer, 375px)
**Purpose:** record a naive-tester PASS to clear the URL-share gate. **Result: NOT a PASS — real ❌ findings below.**

All findings are **pre-existing product issues** (landing / `/developers` / Seafields estate) — none relate to the
deal-model step-1→3 work, which sits uncommitted in the working tree.

## ❌ Standards fails (release-blocking per PRODUCT_STANDARDS §0.5)

| # | Finding | Where | Persona | Code | Fix shape |
|---|---------|-------|---------|------|-----------|
| 1 | Location field **navigates away on type + loses the part-filled form** | `/developers` | Anneke | 32 | Bug fix + wire `@caistech/mapbox` autocomplete |
| 2 | **ABN field is plain text — no ABR lookup** | `/developers` | Anneke | 34 | Wire `@caistech/abn-lookup` |
| 3 | **Sub-16px text** — 12px "no deposit" disclaimer, 12–14px labels/badges | landing + estates | Marcus | 3 | CSS (bump to ≥16px on mobile) |
| 4 | Buyer registration **gated behind a <44px lot tap** on a cramped SVG, **no "register anyway" fallback** | Seafields | Marcus | 32 | Mobile UX: tappable lot list + undecided-lot path + larger targets |
| 5 | Seafields page **so heavy the headless browser crashed on interaction** (mis-taps to /developers, /agent, /admin) | Seafields | Marcus | 41 | Mostly `/browse` tooling (memory-confirmed on heavy Next.js pages) + a real perf signal (lazy-load the SVG + gallery) |

## Minor (not ❌)
- Voice guide named **"Marni" on landing** vs **"Morgan" on /developers** — one assistant, pick one name.
- **`favicon.ico` 404s** with no icon `<link>` (tab titles are correct).
- Three login surfaces use three different password-toggle treatments (cosmetic).

## Passed (both personas)
Responsive (no h-scroll at 375 + 1440; 44px hamburger; working state-grouped drawer), explanatory headers,
voice reachable ≤3 clicks, real product tab titles, dual-portal separation, no-obligation framing everywhere,
genuinely domain-aware developer form, strong estate content + real deposited-plan detail. Both testers would
engage once the friction is removed.

## Recommendation (for Dennis to confirm)
Fix the **contained** findings 1–3 (1 & 2 just wire the mandated `@caistech` components; 3 is CSS), then
**commit + deploy F2K-Projects, re-run naive-tester, record the PASS**. Treat finding 4 as a tracked mobile-UX
follow-up and finding 5 as `/browse` tooling (verify perf on a real throttled phone separately). The
alternative is a reasoned+logged waiver (URL stays gated).

**Held for the operator:** no fixes applied, no deploy, no cockpit record written — all await the fix-vs-waive
decision. The two full reports are `anneke-developer.md` and `marcus-buyer.md` in this folder.

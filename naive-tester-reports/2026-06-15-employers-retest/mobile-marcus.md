# Mobile Marcus — Employers page RE-TEST (375px)

**URL:** https://f2k-projects.vercel.app/seafields/employers
**Viewport:** 375 × 812, portrait. Cache-busted with `?v=2`/`?v=3`/`?v=4` on each load.
**Date:** 2026-06-15
**Persona:** Mobile Marcus — regional small-business owner, on his phone, fat thumbs, no patience for h-scroll or tiny text.

I came back to re-check the two things you said you fixed. Good news up front: both are gone. I poked the whole flow too — owning, renting, submitting, Morgan. No sideways sliding anywhere.

---

## The two fixed bugs

### Bug #1 — horizontal scroll when "Rent it" opens (the Morgan panel overflow)
**Measured at true 375px:**

| View | scrollWidth | innerWidth | h-scroll? |
|---|---|---|---|
| Fork (initial) | 375 | 375 | NO |
| **Rent-it form (just opened)** | **375** | **375** | **NO** |
| After submit (success) | 375 | 375 | NO |
| Own it destination (`/seafields-estate?ref=employer`) | 375 | 375 | NO |

The embedded Morgan panel that used to push the page to 419px now sits at **right edge = 331px** — comfortably inside 375. I scanned every element on the rent-it form for any right edge past the viewport: **"NO element exceeds 375px — clean."** Fixed. ✅

### Bug #2 — fork card body + the two CTA links were 14px
**Measured computed font-size at 375px:**

- "Own it" body ("Buy a house-and-land package…"): **16px** ✅
- "Rent it" body ("Reserve a guaranteed number of beds…"): **16px** ✅
- CTA "Go to buyer registration →": **16px** ✅
- CTA "Choose take-or-pay →": **16px** ✅

All four at the 16px floor. I can read everything without pinch-zooming. Fixed. ✅

---

## Sanity walk

- **Tab title:** "Local employer accommodation — Seafields | Factory2Key" — real product name, not "Create Next App". ✅
- **Explanatory header:** present — "Stop flying your team in and out." + a paragraph explaining the local-accommodation pitch + "How do you want to secure staff accommodation?" ✅
- **Fork cards thumb-sized:** Own = 335×188, Rent = 335×188. Way over 44px, stacked single-column, no collision. ✅
- **Morgan launcher reachable + launches:** the `.convai-btn` launcher is **214×44** (meets 44px). Opened it — panel renders, shows "Talk to Morgan" with a "Type your question" text input + Send (text fallback; mic shows "Not supported" in headless, which is the correct degrade-don't-fake behaviour). ✅
- **Take-or-pay form submit:** filled throwaway details (Marcus SB / Marcus Test / marcustest@example.com / phone / 8 beds / consent checkbox), tapped "Register take-or-pay interest" → success heading **"Interest registered"** with confirmation copy. ✅
- **Own it redirect:** link href = `/seafields-estate?ref=employer`; landed page loads at 375px, scrollWidth=375, **no h-scroll**. ✅

---

## Standards Check (§1 Responsive focus)

| Item | Status | Evidence |
|---|---|---|
| No horizontal scroll — fork | ✅ | dw 375 = iw 375 |
| No horizontal scroll — rent-it form (the fix) | ✅ | dw 375 = iw 375; Morgan panel right=331; no element > 375px |
| No horizontal scroll — success state | ✅ | dw 375 = iw 375 |
| No horizontal scroll — Own it dest | ✅ | dw 375 = iw 375 on /seafields-estate?ref=employer |
| Body/CTA text ≥16px (the fix) | ✅ | fork body 16px ×2, CTAs 16px ×2 |
| Touch targets ≥44px | ✅ | fork cards 335×188; Morgan launcher 214×44 |
| Tab title is product name | ✅ | "Local employer accommodation — Seafields \| Factory2Key" |
| Explanatory header present | ✅ | "Stop flying your team in and out." + pitch paras |
| Voice agent reachable + launches | ✅ | `.convai-btn` opens Morgan panel; text fallback works |
| Form completes to success on mobile | ✅ | "Interest registered" |

**No ❌ remaining.** Both reported bugs are resolved at 375px.

Screenshots: `mobile-marcus/01-fork-375.png`, `02-rentit-form-375.png`, `03-success-375.png`.

— Marcus

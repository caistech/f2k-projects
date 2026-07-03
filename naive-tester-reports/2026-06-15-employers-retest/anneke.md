# Seafields Employers — Focused Re-verification (Desktop ~1440px)

**Tester:** Anneke — regional WA business owner (currently flies FIFO staff in/out)
**Date:** 2026-06-15
**URL:** https://f2k-projects.vercel.app/seafields/employers (cache-busted ?v=2…11)
**Scope:** Confirm core fork/redirect/form flow still clean after redeploy, with a dedicated re-test of the Morgan voice agent typed (no-mic) fallback that previously appeared silent.

---

## Standards Check

| Item | Result | Evidence |
|---|---|---|
| Fork is obvious and BEFORE any form fields | ✅ | Two cards ("Own it" / "Rent it (take-or-pay)") sit directly under the explanatory header. On first load the page has **0 inputs, 0 selects, 0 textareas** — no form exists until you choose "Rent it". Screenshot `01-fork.png`. |
| "Own it" is a pure redirect, no data captured here | ✅ | "Own it" is a plain `[link]` with `href="/seafields-estate?ref=employer"`. Clicking it navigated to `/seafields-estate?ref=employer` (H1 "Seafields Estate" — the standard buyer registration). No duplicate form on the employers page. |
| "Rent it (take-or-pay)" reveals Morgan + the take-or-pay form | ✅ | "Rent it" is a `[button]` (in-page toggle, not a nav). Clicking it reveals the Morgan panel (`.convai-panel--embedded`, "Talk to Morgan") **and** the take-or-pay form (13 inputs / 1 select / 1 textarea: business name, ABN, contact, staff count, whole-house vs by-room, count, commitment term, start date, FIFO-roles note, consent). Screenshot `02-takeorpay-form.png`. |
| Form submit → 200 + personalised success | ✅ | Filled with throwaway details (Anneke Retest Logistics Pty Ltd, 8 staff, 2 houses, 12-mo term). `POST /api/seafields/employer-register → 200`. Success rendered: **"Interest registered — Thank you. We've recorded Anneke Retest Logistics Pty Ltd's take-or-pay interest…"** — uses my business name. Screenshot `06-success.png`. |
| **VOICE: typed (no-mic) fallback returns a written reply** | ✅ **(was the prior concern — now PASSES)** | Opening Morgan with no microphone surfaces a text fallback `<form class="convai-fallback">` with a "Type your question" input + Send (degrade-don't-fake working). Typed *"What is take-or-pay?"* → `POST /api/seafields/employer-voice → 200 (3556ms, 437B)` → **Morgan replied in writing**: *"Take-or-pay means you reserve a set number of beds — could be whole houses or individual rooms — for a fixed term, and you agree to pay the rent whether every bed is filled every night or not. That guaranteed payment is what lets us build the housing in the first place…"* Screenshot `05-morgan-typed-reply.png` (shows "You: What is take-or-pay?" + the Morgan reply). |
| Network call to /api/seafields/employer-voice fires | ✅ | Confirmed in the network tab: `POST …/api/seafields/employer-voice → 200`, 437-byte body. |
| Console clean throughout | ✅ | `console --errors` returned "(no console errors)" at every stage: landing, form reveal, Morgan open, voice POST, and form submit. |
| Explanatory header present | ✅ | H1 "Stop flying your team in and out." + FIFO context paragraph; fork has its own sub-header "How do you want to secure staff accommodation?" with a one-line explainer. |
| Browser tab title is the product name | ✅ | `document.title` = "Local employer accommodation — Seafields \| Factory2Key" (not "Create Next App"). |
| No dead ends | ✅ | Both fork paths lead somewhere real (Own it → buyer reg; Rent it → form → success that says Dennis will be in touch). |

---

## Anneke's notes

I'll be honest — last time Morgan just sat there when I typed, and that put me off, because I'm not a fan of a "voice" thing that goes quiet on you when you haven't got a mic handy (half my crew are in a noisy yard, nobody's talking to their laptop). This time it behaved. The moment I clicked "Start a conversation" with no mic, it gave me a tidy little "Type your question" box instead of pretending nothing happened. I typed "What is take-or-pay?" and within a few seconds Morgan wrote back a plain-English answer that actually explained the deal — beds reserved for a term, you pay whether they're full or not, and that's what gets the housing built. That's exactly the question every employer here is going to ask first, so it's the right thing to nail.

The fork up top is clean and sensible. Owning sends me straight to the normal buyer page — good, no double-entry. Renting opens the form right there with Morgan beside it. The form submitted first try and the thank-you used my company name and told me Dennis would call to size it up. No obligation language is everywhere, which is the right tone for a "register interest" page.

One small operational note, not a blocker: the live conversational (spoken) side I couldn't exercise headless — no mic in this environment — so I'm signing off on the **typed** path working, which is what was in question. If a real employer does have a mic, that's a separate live check.

**Verdict: clean re-verification. The prior voice concern is resolved.**

— Anneke

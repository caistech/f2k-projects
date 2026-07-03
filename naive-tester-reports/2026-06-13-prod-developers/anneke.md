# Factory2Key — "For Developers" walkthrough

**Tester:** Anneke (Domain Operator — 25+ yrs property development / land subdivision)
**URL:** https://f2k-projects.vercel.app/developers
**Date:** 2026-06-13
**Persona goal:** A developer (here, an agent acting for a landowner) going through the onboarding, trying Morgan, and deciding whether I'd actually submit.

---

## TL;DR — blocking findings

**No hard blockers.** I got all the way through and I *did* submit (and would, for real). Nothing stopped a genuine enquiry from completing.

Two things I'd want fixed, neither a showstopper:
- **❌ §1 (mobile):** at 375px the page has ~40px of horizontal scroll, caused by the **Morgan voice widget panel** (`.convai-panel` runs to 415px on a 375px screen). The page body itself is fine; it's the embedded widget that doesn't fit. On desktop (1440px, my actual brief) there is **no** overflow.
- **Land title upload gives no visible confirmation.** I attached a file and got zero on-screen feedback that anything stuck (no filename chip, no tick). I couldn't confirm the file actually registered. For a document as important as a certificate of title, silence is unsettling. (Caveat: I was testing headless and the controlled file input is fiddly to drive that way — so treat this as "no visible confirmation + unverified," not a proven server bug.)

A screenshot note up front: the headless browser in this environment rasterised every screenshot as blank (a known quirk here), so my evidence below is DOM-level inspection and the live API/console results, not pixels. The content, behaviour and network calls are all real.

---

## Section by section

### First impression — the top of the page
Tab title is **"For Developers — Partner with Factory2Key | F2K"**. Proper product name, not a scaffold default. Good.

The header copy lands well for someone like me: *"Have an estate in mind? Let's build it together."* then a plain-English explanation that F2K builds residential estates with architecturally-designed modular homes, and an invitation to tell them my vision, talk it through with a voice guide, or just fill the form. That's exactly the right register — it tells me *what this is, what to do, and why it matters* without gushing. The persistent banner up top — *"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted"* — is reassuring and sets expectations honestly. I like that.

The 3-step "how it works" (Share your vision → Send us your plans → We get in touch) is clear. As an operator I appreciate that step 3 is honest: a human reviews everything and reaches out. No false "instant" promises.

### "What you'll need" list
This is genuinely good and exactly what I'd want before starting. It's framed gently — *"Handy to have ready before you start — but don't go hunting. Bring what you have and leave the rest."* The list covers vision, estate name + location, planning/zoning status, ownership/control, **the landowner's details if that isn't me (e.g. I'm an agent)**, the certificate of title, plans/sketches, and deal structure. That maps cleanly onto how I actually think about a site. The explicit call-out that an agent can enquire on someone else's land is thoughtful — it told me, before I'd touched a field, that this form expects my exact situation.

**Opportunity:** the list mentions "the certificate of title... it carries the accurate lot details (legal description, area, easements, covenants)." That's a smart hook — but the upload itself gives no feedback (see below), which undercuts the trust the copy builds.

### Morgan, the voice guide
I clicked **"Start a conversation."** A panel opened titled **Morgan**, with an avatar image (alt text *"Morgan, your coach"*), and a one-line explanation: *"Talk to Morgan — your F2K onboarding guide. She'll help you complete the form below."* It explains itself, which is what I want from a bot before I commit to it.

No microphone prompt fired in my (headless) environment, so it presented its **text fallback** — a "Type your question" box and "Send." That's the right graceful-degrade behaviour: when voice isn't available, I can still type. I tested it for real:

> **Me:** "Hi Morgan, I have a 40-lot site near Busselton WA, zoned residential. What do you need from me?"
> **Morgan:** "Hey, that's fantastic — Busselton's a great market. So you've got 40 lots, zoned residential and ready to go — that's a strong starting point. Quick question first: do you own the site outright, or is it under option or contract?"

That's a *real, contextual* reply — she picked up the location, the lot count, the zoning, and asked the single most relevant next question (ownership). For an onboarding guide that's well-judged: she went straight to the thing that actually determines whether a project is real. I'd happily keep talking to her.

**Nitpick:** the avatar alt text calls her *"your coach"* but every visible label calls her *"your onboarding guide."* Minor inconsistency, but "coach" is the wrong word for a developer-onboarding context — fix the alt text to match.

**Opportunity:** Morgan is text-only in my session. I'd love to know, as a user, whether the mic is genuinely available — a small "voice unavailable, using text" note would remove ambiguity rather than just silently showing a text box.

### The form — "I'm enquiring as" and the conditional landowner section
This is the bit I most wanted to poke, and it behaves correctly.

The **"I'm enquiring as"** dropdown offers: Developer / Land owner / Real estate agent / broker / Builder / Other.

I selected **"Real estate agent / broker"** (my persona — enquiring on a client's land) and a **landowner section appeared dynamically**: Owner name, Owner email, Owner phone, and *"Your relationship to the owner."* Exactly what should happen. I then checked the logic across every role:

| I'm enquiring as | Landowner section shown? |
|---|---|
| Developer | Yes |
| **Land owner** | **No** (correct — I *am* the owner) |
| Real estate agent / broker | Yes |
| Builder | Yes |
| Other | Yes |

That's the right model: the only person who *isn't* asked for separate owner details is the owner themselves. Clean. As an agent that reassured me — the form understood that the site isn't mine and asked me to nominate my principal.

### Site ownership / control field
The dropdown is sensible: Owned outright / Under option or contract / Currently negotiating / Not yet secured / Not sure. And there's an honest helper line beneath it: *"We can help with feasibility, planning and finance — but a project needs the site owned or under your control to go ahead."* That's the right thing to tell a developer up front — it filters tyre-kickers without being rude. I respect that.

### Zoning / planning status
Good options that match real planning stages: Zoned residential — ready / Zoning in progress / DA lodged / DA approved / Concept-feasibility / Raw land — not yet zoned / Other. Whoever wrote these understands the development pipeline. No notes.

### Location & postcode
Here's a small letdown. The Location field placeholder says **"Start typing the suburb / town…"** — which *promises* an autocomplete. It doesn't have one. I typed "Busselton" / "Busselt" and no suggestions appeared (the field is `autocomplete="off"`, no listbox, no Mapbox/ABR picker). It's a plain text box dressed as a typeahead. Either wire up the suburb autocomplete the placeholder implies, or change the placeholder so it doesn't write a cheque the field can't cash.

**Opportunity:** a real suburb/postcode autocomplete (and ideally auto-filling postcode from suburb) would save typing and prevent the classic "wrong postcode for the suburb" data mess — and it matches what the placeholder already promises.

### Land title upload
Labelled *"Upload land title (optional) — PDF or image,"* with good supporting copy about why it helps. I attached a file. **Nothing visible happened** — no filename chip, no "attached" tick, no thumbnail. I tried both a PDF and a PNG; in both cases I had no on-screen confirmation. For a document this important I'd want to *see* that it took. (As noted up top, headless file inputs are unreliable to drive, so I can't swear the server didn't receive it — but the *absence of visible confirmation* is itself the UX problem.)

### Deal preferences
Nice touch — Preferred structure (Outright sale / JV-profit share / Staged delivery / Build-to-rent / Open to options) plus a free-text "anything else about how you like to do deals." That free-text box is where an experienced developer actually says the real thing, so I'm glad it's there. The framing *"This just helps us prepare — nothing is binding"* keeps it low-pressure.

### Plans / sketches upload
Generous and clear: up to 25MB each, 10 files, PDF/JPG/PNG/WEBP/DWG/DOC. The DWG/DOC support tells me they expect actual architectural/planning files, not just photos. Same no-visible-confirmation caveat as the title upload applies.

### Consent + submit
The consent line is clear and correctly scoped: *"I'm happy for Factory2Key to contact me... and to store the details and files I've provided. I understand this is an enquiry only and creates no obligation on either side,"* plus a Privacy Policy link. I tested the gating: **unchecked → Submit disabled; checked → Submit enabled.** Good — consent genuinely gates the action.

The three required fields (full name, email, estate name) are `*`-marked and HTML5-validated: with consent ticked but those blank, clicking Submit surfaces invalid-field validation and won't send. So the form won't fire junk. (Tiny preference: I'd keep Submit disabled until the required fields are valid too, not just on consent — but it's not wrong as-is.)

### Submission — does it actually work?
Yes. I filled it as my agent persona (Anneke Roussos, enquiring for owner Geoffrey Marshall on "Vasse Rise Estate," Busselton 6280, zoned residential, JV preferred) and submitted.

- Network: **`POST /api/developers/onboarding → 200`**. No console errors.
- The form replaced itself with a clean, personalised confirmation:
  > **"Thank you — we've got it."**
  > "Your details for **Vasse Rise Estate** are in. A member of the Factory2Key team will review your vision and be in touch shortly to talk through next steps."
  > "A confirmation has been sent to **anneke@coastalland.com.au**."

Echoing my estate name and email back to me is exactly the reassurance I want at the finish line. Zero dead end. That confirmation is the moment I'd believe the enquiry actually landed.

### Bottom of page
A human fallback: *"Prefer to talk to a person first? Dennis McMahon — dennis@factory2key.com.au · +61 402 612 471."* For a real deal, having a named human and a direct number matters to me far more than any form. Good that it's there.

---

## Would I submit? — verdict

**Yes, I would.** The form speaks my language, the role/landowner logic is correct, Morgan is genuinely useful and degrades to text cleanly, the ownership/feasibility framing is honest, and the submit path works with a confirmation that names my project back to me. That combination earns my enquiry.

What would make me hesitate, none fatal:
1. The **silent file uploads** — for a certificate of title I want to *see* it attached.
2. The **fake autocomplete** on Location — small, but it's the kind of polish gap that makes an experienced operator wonder what else is half-wired.
3. On a phone, the **Morgan widget pushing the page sideways** — I do half my enquiries from a phone in a car park between site visits, so mobile matters to me.

---

## "Opportunity:" callouts (consolidated)
- **Opportunity:** Wire the real suburb/postcode autocomplete the Location placeholder already promises (Mapbox/AU suburb list), and auto-derive postcode — saves typing and stops bad data.
- **Opportunity:** Show an attached-file confirmation (filename + size + remove button) on both upload fields. Trust is highest when I can see my title document landed.
- **Opportunity:** Have Morgan (or a small note) state whether voice is available, and offer the text path explicitly rather than just rendering a text box.
- **Opportunity:** Constrain the Morgan widget width on mobile so it can't overflow the viewport.
- **Opportunity (minor):** Consider keeping Submit disabled until required fields are valid, for a smoother "why can't I submit?" experience.

---

## Standards Check

| Item | Verdict | Evidence |
|---|---|---|
| **§1 Responsive — desktop 1440px** | ✅ | scrollWidth 1440 = innerWidth 1440, no horizontal scroll; all fields/nav usable. |
| **§1 Responsive — mobile 375px** | ❌ | scrollWidth 415 vs innerWidth 375 (~40px overflow) caused by the Morgan `.convai-panel`/`.convai-coach` widget running to 415px. Page body itself fits; the embedded widget doesn't. Hamburger nav present and Morgan reachable, so nav usable — but the horizontal scroll is a §1 fail. |
| **§1 — body text ≥16px** | ✅ (with nitpick) | Main paragraphs 18–20px; intro/step copy 14px. The "FOR PROPERTY DEVELOPERS" eyebrow kicker is 10.4px — below 12px, but it's a styled uppercase label. |
| **§5 Explanatory header** | ✅ | Page opens with what-it-is/what-to-do/why ("Have an estate in mind?... Tell us about your project"); form section has its own header ("Tell us about your project — everything below is an enquiry only"); the post-submit empty/confirmation state keeps an explanatory message. |
| **§6 Voice agent** | ✅ | "Talk to Morgan" present and reachable; panel renders with avatar (alt "Morgan, your coach") + name + self-explanation; text fallback works and Morgan returns a real contextual reply (recalled Busselton/40 lots/zoning, asked ownership). No dead button, no console errors. Nitpick: alt text "coach" vs visible "onboarding guide" mismatch. |
| **§7 Scaffold metadata (tab title)** | ✅ | `<title>` = "For Developers — Partner with Factory2Key | F2K". Not a scaffold default. Estate + landing pages also carry proper titles. |
| **§9 Consent gating** | ✅ | Consent line clear and correctly scoped (enquiry-only, no obligation, Privacy link); unchecked → Submit disabled, checked → enabled (verified by toggling). |
| **§9 No dead ends / next action obvious** | ✅ | Every step flows; submit yields a personalised confirmation ("Thank you — we've got it... details for Vasse Rise Estate are in... confirmation sent to <email>") plus a human-contact fallback at the foot. |
| **§9 Address/suburb autocomplete** | ❌ | Location field placeholder promises typeahead ("Start typing the suburb / town…") but has `autocomplete="off"`, no listbox/Mapbox/ABR picker; typing "Busselton" produced 0 suggestions. Plain text input dressed as autocomplete. |
| **§9 Consequence clarity (irreversible/cost/outreach)** | ✅ | No irreversible/cost actions here; the one outreach action (submit) states it's an enquiry-only with no obligation before the click, and consent must be ticked. |
| **§2 / §4 Auth pattern + app chrome** | — | N/A — public enquiry page, no login reached. |

---

Two ❌ findings (mobile widget overflow at 375px; fake autocomplete on Location) and one strong UX concern (silent file uploads). None blocked me from completing a real enquiry on desktop, which I did, and would.

Anneke

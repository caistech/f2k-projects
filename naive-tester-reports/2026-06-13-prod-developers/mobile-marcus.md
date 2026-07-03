# Mobile Marcus — "For Developers" page (phone walkthrough)

**URL:** https://f2k-projects.vercel.app/developers
**Device:** my phone only, viewport ~390×844, portrait
**Date:** 2026-06-13
**Persona:** Mobile Marcus — phone-only, fat thumbs, flaky signal, pinch-zooms small text

---

## ❌ BLOCKER FINDINGS (read these first)

1. **❌ The page scrolls sideways on my phone.** At 390px wide the page is actually 430px wide (`scrollWidth 430` vs `innerWidth 390`). I can pan the whole page ~40px to the right, and when I do, the **left edge of every form label gets chopped off** — I literally see "RISTRATION", "Email" cut to "mail"-ish, "I'm enquiring as" with the "I" sliced off, "Your full name" clipped. The single culprit is the **"Talk to Morgan" voice panel** (`.convai-panel--embedded`), whose right edge sits at 410px, 20px past my screen. One off-screen widget is making my whole form slide around. Screenshot: `09-morgan-overflow-right.png`. **This is a §1 responsive fail.**

2. **❌ Tap-target collision: the floating "Report a problem" pill sits on top of the Submit button while I scroll.** When the "Submit my project" button is mid-screen during scroll, it occupies y≈756–804 and the black SayFix pill sits at y≈778–820 — they overlap by ~26px in the same horizontal lane. With my thumbs I'm going to hit "Report a problem" when I mean to submit my project. (At full scroll-to-bottom the pill drops below the footer and the clash clears, but during the scroll it's a real mis-tap trap.) Screenshots `06-dropzones.png`, `07-submit-collision.png`.

Neither is fatal to *finishing* the enquiry, but #1 makes the page feel broken on a phone, and #2 risks me firing the wrong button on my most important tap.

---

## Section-by-section, as I actually used it

### 1. Landing / top of page ✅
Loads fast, no errors. Tab says "For Developers — Partner with Factory2Key" (not "Create Next App") — good. There's a dark "REGISTRATION OF INTEREST ONLY — no deposit, no obligation" banner up top that sets expectations, an F2K logo, and a hamburger menu top-right that my thumb can reach. Big serif headline "Have an estate in mind? Let's build it together." with a plain-English subhead about partnering with developers. This is a strong, clear opener — I immediately know what this page is for. (`01-top.png`)

*Niggle:* the banner is ~140px tall and it's sticky, so on a small screen it keeps eating the top of my view as I scroll. Not a blocker, just a bit greedy on a phone.

### 2. "What you'll need" list ✅ (this is the best bit)
Genuinely reassuring. Heading "What you'll need", then "Handy to have ready... but don't go hunting. Bring what you have and leave the rest; Morgan and the form both let you skip anything you're not sure about." Then seven green-tick bullets: your vision, estate name + suburb/postcode, planning/zoning status, whether you own/control the site, the land owner's details if it's not you, certificate of title, and any plans/sketches to upload. Text is a comfortable reading size — I didn't have to pinch-zoom. Bullets are well spaced. As a developer on my phone, this told me exactly what to gather without making me feel I needed a lawyer first. (`02-whatyouneed.png`)

### 3. "Talk to Morgan" voice guide 🟡
Nice section: "TALK TO MORGAN — Tell us your vision and she'll help you fill the form", a clear explanation that Morgan asks a few questions then walks me through the form, and that it's optional. The **avatar is a round, centred photo that fits my screen perfectly** and loads cleanly (no broken image). There's a big "🎙️ Start a conversation" button (mic-based) that's easily tappable. (`03-morgan.png`, `04-morgan-widget.png`, `10-morgan-after-send.png`)

**But two problems:**
- This is the panel that's 20px too wide and causing the whole-page sideways scroll (blocker #1).
- I typed a question into the "Type your question" box ("I have raw land near Margaret River, can F2K help?") and hit **Send** — the box cleared but I got **no visible text reply**; the panel just reset to "🎙️ Start a conversation". So the text path looks like a half-fallback: it accepts my typing but doesn't visibly answer me, and pushes me toward granting the mic. On a phone, on flaky signal, I don't always want to start a live voice call — I'd want the typed answer. As-is the text route feels like a dead end. (§6 / §9)

### 4. The enquiry form ✅ (mostly very good)
This is well built for a phone:
- **"I'm enquiring as" dropdown** is a **native `<select>`** (6 options: Developer / Land owner / Real estate agent / Builder / Other), 45px tall — taps straight to the phone's OS picker, which is exactly what I want one-handed. I picked "Developer" and it stuck. ✅
- All inputs are **full-width**, labels are clear, placeholders are helpful ("e.g. Riverbend Estate", "Start typing the suburb / town...", "e.g. 7011"). (`05-uploads.png`)
- More native dropdowns for Zoning/planning status, Site ownership, and Preferred structure — all 44px+ and thumb-friendly, all with sensible "Not sure / Open to options" escape hatches so I'm never stuck.
- Sections are labelled (YOUR DETAILS / YOUR ESTATE / DEAL PREFERENCES / PLANS, SKETCHES & DESIGNS) so it doesn't feel like an endless wall.

### 5. Upload buttons ✅
Two upload zones: "Upload land title (optional)" and a big "Click to choose files" dropzone for plans/sketches/designs. The main dropzone is a **148px-tall dashed box with a cloud icon** and clear rules: "PDF, JPG, PNG, WEBP, DWG, DOC ... up to 25MB each, 10 files max." Huge, obvious, impossible to miss with a thumb. Accepts the right file types (incl. DWG for drawings). This is how uploads should look on mobile. (`06-dropzones.png`)

### 6. Consent + Submit 🟡
- The consent checkbox text is clear and sets the right expectation ("enquiry only... no obligation"), with a working Privacy Policy link.
- ✅ The **"Submit my project" button is correctly disabled until I tick consent**, and enables the instant I tick it. Good consequence/consent gating.
- ❌ But the **checkbox box itself is only 13×20px** — tiny for a thumb. (The label may be tappable too, which helps, but the box is well under 44px.)
- ❌ Submit-vs-SayFix collision while scrolling (blocker #2).
- ✅ Nice no-dead-end fallback below: "Prefer to talk to a person first? Dennis McMahon — email + phone", plus a footer with contact details and Privacy. I always have a next step. (`08-bottom-submit.png`)

---

## Could I complete this one-handed on a phone?

**Yes, but it doesn't feel polished.** I *can* pick my role, fill the fields, choose files, tick consent and submit — the form mechanics are genuinely mobile-friendly (native dropdowns, full-width inputs, big upload zones). What spoils it is the page sliding sideways and chopping my labels (the Morgan panel overflow), the risk of mashing "Report a problem" instead of "Submit", and Morgan's text box that takes my question but doesn't answer. Fix the overflow and the Submit/SayFix overlap and this is a solid one-handed experience.

**Opportunity:** make Morgan's typed question return a typed answer (don't force the mic) — phone users on patchy signal won't always start a voice call.
**Opportunity:** constrain the Morgan voice panel to `max-width:100%` so it can never push the page wider than the screen.
**Opportunity:** give the floating SayFix pill some bottom clearance from the Submit button (or hide it when the submit CTA is in view) so the two never share a thumb-lane.

---

## Standards Check

- **§1 Responsive** — ❌ Horizontal scroll: page is 430px wide at a 390px viewport; whole page pans ~40px right and clips form-label left edges. Caused by `.convai-panel--embedded` (right edge 410px). Also consent checkbox 13×20px (<44px). Inputs/dropzones/native-selects otherwise full-width and ≥44px.
- **§5 Explanatory header** — ✅ Clear headline + subhead up top, plus a "What you'll need" primer and per-section labels; I always knew what the page was for.
- **§6 Voice agent** — 🟡 "Talk to Morgan" is reachable, avatar + mic button fit the screen and tap fine; but the typed-question path cleared my input without showing a reply (resets to "Start a conversation"), so the text fallback isn't usefully usable.
- **§7 Tab title** — ✅ "For Developers — Partner with Factory2Key | F2K" (not a scaffold default).
- **§9 Obvious next action / consent** — 🟡 Submit correctly disabled until consent and a "talk to a person" fallback prevents dead ends (good), BUT the floating SayFix pill overlaps the Submit button during scroll (mis-tap risk).

A ❌ is a real finding. Two ❌ here: §1 (sideways scroll + tiny checkbox) and the Submit/SayFix collision under §9/§1.

Marcus

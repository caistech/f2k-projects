# Mobile Marcus — Branscombe Estate walkthrough

Hi Dennis,

- **Persona:** Mobile Marcus — phone-only, fat thumbs, pinch-to-zoom, couch-browsing a home for myself
- **URL:** https://f2k-projects.vercel.app/branscombe-estate
- **Goal:** Browse the homes on my phone, understand the deal, and register interest in a few homes — and decide if it's actually usable on mobile
- **Device:** 375×812 (iPhone-ish), portrait
- **Duration:** ~35 min (your browser tool kept dropping out on me, so a few things took longer than they should)

Quick upfront: I got there. I understood the deal, I picked homes, I hit the 3-home limit, and I found the form. So it *works* on a phone. But there are a handful of things that made me squint or worry I'd tapped the wrong thing, and one of them (the map) is right in the middle of the main job. Here's the couch-honest rundown, section by section.

---

## The header + that banner at the top

First thing I notice: the very top of my screen has the "REGISTRATION OF INTEREST ONLY — No deposit is required or accepted…" bar, and it *sticks* there as I scroll. Then right under it is the F2K logo + a hamburger menu, and that sticks too. Together that's about 140px of my screen permanently gone — roughly a sixth of my phone — before I see any actual content. On a small screen that's a lot of real estate spent on a disclaimer I read once.

And here's the odd bit: that same "REGISTRATION OF INTEREST ONLY" sentence shows up **twice** at the top — once in the sticky bar and once again just below the header in the hero. Same words, back to back. Looked like a glitch to me at first.

The hamburger itself is top-right where my thumb naturally lands — good. I tapped it, the menu slid open with Projects / Seafields / Branscombe / Hemp Homes / About F2K, and each of those is a nice big full-width row (48px tall) that's easy to hit. No complaints about the menu links themselves.

One nit: the hamburger button is 40×40px. It's *just* under the size where I tap it confidently first time — I got it, but it's a hair small for a primary nav control.

And the disclaimer text in that sticky bar is tiny — about 12px. It's the most legally-loaded sentence on the whole page ("no deposit required or accepted") and I have to pinch-zoom to read it comfortably.

**Opportunity:** Drop the duplicate banner (you're saying the same thing twice), and consider making the sticky disclaimer non-sticky or collapsible after the first scroll so I get my screen back. Bump that disclaimer text to at least 14px so I'm not squinting at the bit that protects everyone.

---

## The hero — Branscombe Estate

This part's lovely on mobile. Big "Branscombe Estate" headline, the one-liner (37 single-storey 3-bed/2-bath homes), the location (Claremont, 8km from Hobart), and a clear "Select your home →" button that's a proper full-width tappable target. I knew exactly what this was and what I was meant to do. No notes — this sells it.

**Opportunity:** The "Select your home" button is great; consider making it actually jump me down to the map when tapped, so the promise and the action are connected in one tap.

---

## The facts strip (37 homes / 3 Bed 2 Bath / etc.)

Nice scannable grid — 37 Homes, 3 Bed / 2 Bath, 104–114m², 350–550m², 2026–2028. The big numbers are clear. But the little labels under them ("HOME AREA", "LAND SIZE", "CONSTRUCTION") are genuinely tiny — I measured them as small as ~9px in my head, and I had to zoom to read "Home area" vs "Land size". For a buyer, those labels are the whole point of the numbers.

**Opportunity:** Those small-caps caption labels are sitting around 9–10px. On a phone, push them to 12px minimum. The numbers can stay big; the labels just need to be legible without zooming.

---

## About the Development

All the detail I'd want as a buyer is here — developer, address, permit number, dwelling count, house types, land sizes, energy rating, designer, timeline. Reads as a clean stacked list on my phone, no overflow. There's a site flyover video too. This is thorough and I trust it more for having the permit number right there.

**Opportunity:** None major. Maybe a one-line "what this means for me as a buyer" on the 7-Star Energy rating — most people don't know if that's good (it's great).

---

## Five Architectural Layouts (the floor plans)

This is one of the areas you flagged, so I poked hard.

There are actually two things stacked here. First, a tidy summary grid of the 5 types (1A / 1B / 2A / 2B / 2C) with area, beds, and which units are which — that reflows to a clean **2-column** grid on my phone and is perfectly readable. Then below it, the actual **floor-plan image cards**, one per type, stacked **single-column full-width**. Both behave on mobile — no overflow, no cut-off.

The thumbnails are small enough that the room labels (BEDROOM, LIVING, DECK) are too tiny to read at thumbnail size — but that's fine, because each card says "CLICK TO VIEW FULL SIZE."

I tapped Type 1A. A full-screen dark lightbox opened with the plan blown up so I could actually read the dimensions and rooms — and it **fit my phone width nicely** (the image sized to ~343px inside a 375px screen). That's exactly what I want. Tapping the X closed it cleanly.

The one thing that bugged me: that **close X is tiny** — about 20px wide, 36px tall. For my thumbs, a 20px-wide X tucked up near the sticky banner is a fiddly target; I tend to jab at it twice. It also sits right under the disclaimer bar, so there's clutter in that top corner.

**Opportunity:** Make the lightbox close button a proper 44×44px tap target with a bit of breathing room around it. Also, the background page wasn't scroll-locked while the lightbox was open — if I drag the big plan around, I worry I'll scroll the page behind it. Lock body scroll while the lightbox is up.

---

## Colour Schemes & Elevations

Clear header explaining the three schemes (DA Approved / Dark Contemporary / Light Coastal). The elevation images stack single-column and each one looks tappable to enlarge (same "click to view full size" pattern). Readable, no overflow. Good.

**Opportunity:** The Dulux colour names (Domino / Dieskau / Surfmist) mean nothing to me as a buyer — a tiny colour swatch next to each name would let me actually picture it instead of Googling paint codes on my phone.

---

## Purchase Terms (Deposit / Finance / Settlement / Build)

You asked about these specifically — they pass. All four cards (Deposit 5%, Finance 30 days, Settlement On Title, Build Modular) reflow to a **single column**, full-width, each with a clear label, a big value, and a one-line explanation. Very readable, nothing cramped, nothing cut off. The intro paragraph above them sets up what I'm looking at. This is the cleanest section on mobile.

**Opportunity:** None. This is the model for how the rest of the page should feel on a phone.

---

## Interactive Site Plan — picking my home (the main job)

Good news first: the section has a genuinely helpful intro. A callout tells me "Click directly on a numbered home… you can make up to three selections — first, second and third choice," there's a disclaimer that figures are indicative, and a "WHICH HOME IS WHICH TYPE?" reference table mapping unit numbers to types. I knew what to do before I touched anything. The view toggles (Plan / Satellite / Schematic / Official drawing) are all proper 44px-tall buttons — easy to tap, no collisions. The map itself fits my screen width, no horizontal scroll.

**Now the problem.** The actual home tiles on the map are *tiny*. I measured them: they range from about 18×21px up to a biggest of 32×23px. **Every single one of the 37 homes is well under the 44×44px touch-target minimum.** They're packed close together too. For my thumbs, tapping a *specific* home — say U14, not the U9 right next to it — is a guessing game. I missed and hit a neighbour more than once. This is the single most important action on the page (pick the home I want), and it's the hardest thing to do accurately on a phone.

The reference table helps me find *which* unit I want, but it doesn't help me *hit* it on the map. I'd love to be able to pick from a list, not just stab at a 20px polygon.

**Opportunity:** Give the map a buddy: a tappable list of units (grouped by type) where I can add/remove a home with a big button, as an alternative to the fiddly map. Or, when I tap near a cluster, pop a little "did you mean U9 or U14?" chooser. At minimum, bump the tap area around each tile so a near-miss still selects the intended home.

---

## The 3-home cap (you specifically asked about this)

This works, and — importantly for me on a phone — **I noticed it.** I tapped U1, U3, U9 (three homes, all selected, each showed up as First / Second / Third Choice in a "YOUR CHOICES" list). Then I tapped a fourth, U14.

The fourth was **not** added — I stayed at exactly 3 selected. And a clear amber banner appeared: *"You can register interest in up to 3 homes — your first, second and third choice. Deselect one to pick another."*

Crucially, it's a **persistent inline banner, not a fade-away toast.** It just sits there until I deal with it. So unlike a lot of mobile "it flashed and vanished" notices, this one I actually saw and understood. That's the right call for a phone. **Pass.**

**Opportunity:** Tiny thing — when I tap a 4th, maybe briefly highlight/pulse the banner or my existing 3 choices so I instantly connect "oh, *that's* why it didn't add — I need to drop one first."

---

## The registration form

Once I had a home selected, the form appeared below the map. It's a solid set of fields: first name, last name, email, phone, suburb, postcode, then dropdowns for buyer type / buyer profile / current housing / purchase timeline / finance status / how you heard / referrer type, a notes box, and a consent checkbox. The "Register My Interest" submit button is a proper full-width 343×48px target — easy to hit.

Two things I'd flag:

1. **The form input text is 14px.** That's under the 16px line where my iPhone stops zooming the page in every time I tap into a field. So every time I tapped a box, the page jumped/zoomed. Annoying when you're filling 6+ fields and several dropdowns.

2. **The suburb field is a plain text box** — no autocomplete suggestions. On a phone, typing my suburb in full (and risking a typo) is more effort than tapping a suggestion. Same for the consent checkbox, which is tiny (~14px) — fiddly to tick with a thumb.

On the good side: the consequence is crystal clear *before* I submit. Right by the button it says I'm agreeing to be added to the Factory2Key database for project updates, that final figures get confirmed in writing before any contract, and there's a Privacy Policy link. Combined with the "no deposit, no obligation" banner, I never felt like I was accidentally committing to buy a house. That's reassuring.

**Opportunity:** Bump form inputs to 16px so my phone stops zooming on every field. Add suburb/postcode autocomplete (a Tasmania suburb lookup would do it). And make that consent checkbox a bigger tap target.

---

## Privacy note + footer

The privacy note near the bottom ("Registration data collected on this page is used by Factory2Key Pty Ltd for project communications only and is not shared with any third party for marketing") is a comfortable 16px and easy to read — good, this is the kind of thing that reassures a buyer. The footer has Dennis's email and phone as tappable links, plus a Privacy link. Clear contact path, no dead ends. If I had a question I know exactly who to email.

**Opportunity:** None. This bit's done right.

---

## Was there any help / voice assistant?

No. I looked for a chat bubble, a "talk to someone" button, any floating help — there's nothing on the page. For a registration page that's not a dealbreaker, but if I had a question mid-form ("what does buyer profile mean?") my only option is to scroll all the way down and email. A little "questions? tap to ask" surface would catch people before they bounce.

---

## Standards Check

- ✅ **§7 Scaffold metadata** — Tab title is "Branscombe Estate — Register Your Interest | F2K". Real product name, not a scaffold default.
- ❌ **§1 Responsive — touch targets** — The 37 site-map home tiles are 18–32px (all under 44px); the lightbox close X is 20×36px; the hamburger is 40×40px; the consent checkbox is ~14px. The map tiles are the serious one — it's the primary action.
- ❌ **§1 Responsive — text ≥16px** — Sticky disclaimer banner is 12px; facts-strip labels (Home area / Land size) and the "A Factory2Key Development" eyebrow are ~9–10px; form inputs are 14px (triggers iOS zoom-on-focus). Several sub-13px text runs require pinch-zoom.
- ✅ **§1 Responsive — no horizontal scroll / fits viewport** — Page root is 375px wide, scrollWidth = clientWidth, no overflow anywhere. Floor-plan lightbox image fits the phone width. Cards reflow to 1–2 columns correctly.
- ✅ **§1 Responsive — nav collapses** — Hamburger present, opens a full-width drawer with big 48px link rows, reachable top-right with a thumb (button itself slightly small at 40px).
- ✅ **§5 Explanatory headers** — Each section opens with what-it-is / what-to-do / why-it-matters (the site-plan callout and the indicative-figures disclaimer are especially good).
- ❌ **§6 Voice/help agent** — No voice agent, chat, or help surface anywhere on the page. (Noted as a finding per rubric; lower severity on a public registration page.)
- ✅ **§9 Consequence clarity before submit** — Consent + "added to database for project updates" + "figures confirmed in writing before contract" + "no deposit/no obligation" banner all stated before the Register button.
- ✅ **§9 Zero dead ends** — Footer contact (email + phone, tappable) and Privacy link present; clear next step from every section.
- ❌ **§9 Address autocomplete** — Suburb (and postcode) are plain text inputs, no autocomplete.
- ✅ **3-home cap notice noticeable on mobile** — Persistent amber inline banner, not a fading toast; the 4th selection was correctly rejected (stayed at 3). I definitely saw and understood it.

---

## Scope note

I only browsed the live public page at the URL above on a 375px viewport — no source, no docs, no logins (there were none to hit). Your browse tool was flaky during the session (the daemon kept restarting and a couple of times the page crashed mid-interaction), so I had to re-load and re-select homes several times. Everything in this report I verified at least once on a stable load; the form-field inventory, the tap-target measurements, the 3-home cap behaviour, and the lightbox sizing are all directly observed. The one thing I couldn't get a clean final screenshot of was the populated registration form mid-fill (the daemon dropped each time I scrolled to it after selecting), but I confirmed the fields, the submit button, and the consent/consequence text exist and read correctly.

Cheers,
Marcus

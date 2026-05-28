# Branscombe Estate — Naive-Tester Walkthrough

**Tester:** Anneke (25+ yrs residential property — house-and-land, off-the-plan, estate sales)
**URL:** https://f2k-projects.vercel.app/branscombe-estate (production, live)
**Date:** 26 May 2026
**Viewport:** Desktop, 1440px (with incidental mobile-width captures — see note)
**Goal:** Understand the offer, browse homes / floor plans / site map, register interest in up to 3 homes end-to-end, and decide whether I'd pursue a purchase.

---

First impressions over a glass of wine, Dennis — this is one of the more *honest* off-the-plan pages I've walked in a long time. It doesn't shout, it doesn't fake scarcity, and it doesn't bury the "no obligation" line where a punter can't find it. For a registration-of-interest microsite that's exactly the right posture. The gaps are mostly about a serious buyer's *next* questions — price, what's included, who to talk to — and one technical wobble that worried me. Let me walk you through it the way I read a campaign.

## Hero & the top banner

I land and the first thing I see is a thin dark banner: *"REGISTRATION OF INTEREST ONLY — No deposit is required or accepted. Registering does not create any legal or financial obligation."* Good. That's the line that stops a nervous first-home buyer bouncing, and you've put it where it belongs — top of the page, not in 8pt grey at the bottom. The hero itself is clean: navy, a colour-coded site-map preview, "Branscombe Estate", the one-liner ("37 architecturally designed, single-storey 3-bedroom, 2-bathroom homes"), location ("Claremont, Tasmania — 8km from Hobart CBD"), and a single clear teal CTA, "Select your home →". A stat strip underneath — 37 homes / 3 bed 2 bath / 104–114m² / 350–550m² land / 2026–2028 — gives me the shape of the thing in two seconds.

What's *not* here, and a serious buyer wants it within the first ten seconds: a **price**, or even a price *range*. "From $XXX" is the number that decides whether I keep scrolling or close the tab. I understand why a registration site might hold price back, but right now I have to go hunting and I still don't find one (more on that under Purchase Terms).

Small terminology note: the nav says "Branscombe", the page says "Branscombe Estate", the address is "Branscombe Road". All consistent, no errors — just flagging I checked.

**Opportunity:** Put a price band in the hero stat strip — even "House & land from $XXX (indicative)". It's the single biggest qualifier and its absence makes serious buyers work.

## About / estate facts

This is where the page earns trust. A proper facts panel: developer (Factory2Key Pty Ltd), full address (122–124 Branscombe Rd, Claremont TAS 7011), the **planning permit number** (PLN-21-408.02, Glenorchy City Council), 37 dwellings, the five house types, land sizes, site area (19,981 m²), 7 Star energy rating, designer (Unison), and a construction timeline (2026, completion late 2027 to mid-2028). Quoting the actual DA permit number is the kind of detail that tells an experienced buyer this is real and approved, not a balloon. I'd happily forward this section to a client as "here's the bones of it."

Two things a buyer like me immediately wants that aren't here: **strata vs Torrens title** (37 dwellings on one 19,981m² site — am I buying a freestanding lot on its own title, or a strata-titled dwelling with a body corporate and levies?), and whether there's a **community/owners scheme, covenant, or design guidelines**. On a 37-home estate that's not a nicety — it changes the offer and the ongoing cost. Right now I can't tell, and "350–550m² per lot" hints at individual lots but doesn't confirm separate titles.

**Opportunity:** Add two facts rows — "Title: [Torrens / strata]" and "Body corporate / levies: [yes-est. $X pa / none]". Those two lines answer the questions a buyer would otherwise have to email about, and they pre-empt the deal-breaker conversation.

## Site flyover video

There's an aerial flyover of the site, and it played for me. Nice to have — it situates the block. No complaints here, though I'll note in passing that it autoplays and, combined with the interactive map, this page is *heavy* (see the bug at the end). A static fallback poster image with a play button would lighten the load.

**Opportunity:** Lazy-load the flyover (poster + click-to-play) so the page isn't carrying a video plus a live SVG map plus a form all at once on first paint.

## Floor plans — five layouts

Five cards, one per type (1A, 1B, 2A, 2B, 2C), each with the area (104m² or 114m² + a 24m² deck), 3 bed / 2 bath, the **list of unit numbers** that are that type, and an embedded floor plan you can click to enlarge. I opened the lightboxes — they work, and the plans are *real architectural drawings*: module grid, dimensions, labelled rooms (Living, Deck, three bedrooms, bath, ensuite, kitchen, laundry, walkways). That's a cut above the cartoon plans most estate sites use. The close button (top-right ✕) is there, the overlay is full-screen. Good.

The honesty disclaimer near the plans ("All home details… subject to confirmation against final construction drawings") is appropriate and well-worded.

What a buyer wants *on the plan or beside it* and doesn't get: **orientation** (which way does the living/deck face — north-facing deck is worth real money in Tasmania), **the actual room dimensions in plain text** (the drawing has them but they're small), and an indication of **which type is the "premium" one and why**. 1A and 1B are both 104m² — what's the difference? 2A/2B/2C are all 114m² — same question. I can squint at the drawings, but you're making me do detective work to understand the range you're selling.

**Opportunity:** Under each type card, one line of plain copy: "1A vs 1B: [the difference]." And add a compass/orientation note per type. The deck orientation alone will sell or sink a home for a savvy buyer.

## Exterior elevations & colour schemes

Three schemes per type — "Scheme 1 DA Approved", "Scheme 2 Dark Contemporary", "Scheme 3 Light Coastal" — each with the actual Dulux colour names (Domino / Dieskau / Surfmist, etc.). Clickable to enlarge. I like that you've named the real Dulux colours; it reads as specified, not aspirational. A buyer can picture the street. Good section, no friction.

**Opportunity:** Tell me whether the colour scheme is **my choice or fixed per home** at this estate. "Scheme selectable at contract" vs "as-built per DA" is a question I'd otherwise have to ask.

## Purchase / sales terms

Here's the indicative terms block: Deposit **5% (payable within 5 days of contract)**, Finance **30 days approval window**, Settlement **on Title (after issue of title)**, Build **Modular — factory-built modules, ~12–14 weeks from site arrival**, turnkey basis. For a registration site that's a genuinely useful, honest summary — most won't commit to even this much. The "modular / factory-built / turnkey" framing is also the right way to set expectations for a Factory2Key product.

But — and this is the big one — **there is no price anywhere on this page.** Not a from-price, not a range, not "POA". The terms tell me *how* I'd pay (5% deposit, settle on title) but never *how much*. For a buyer trying to decide if this is in budget, that's the missing keystone. The page even says "email Dennis for full information" for contract specifics, which is fine for the fine print — but price isn't fine print, it's the headline.

Second gap: **what's included in "turnkey"?** Driveway, fencing, landscaping, floor coverings, blinds, appliances, air-con? "Turnkey" means different things to different builders and it's the source of half the disputes I've seen. One inclusions list would do enormous work here.

**Opportunity:** Add an indicative price band (per type, or a range) and a one-screen "What's included" turnkey inclusions list. Those two additions move this from "interesting, I'll register and wait" to "I can actually evaluate this against my budget."

## Interactive site plan — selecting homes

This is the clever bit and it mostly delivers. The explanatory copy is excellent — it tells me I can pick up to three (first/second/third choice), that each pick appears in my registration form with its floor plan and a price-expectation field, and that reserved/sold homes can't be added. There's a reference table mapping every unit number to its type, a legend (1A–2C colour coding, plus "1 registration / 2 registrations / 3+" interest indicators), and four view toggles — Plan view / Satellite / Schematic / Official drawing. The homes carry rich accessible labels too ("U13 — Type 2A, 114m² home, North") and even show how many others have registered interest in a given home, which is a tasteful, non-fake form of social proof.

I selected three homes and tried to add a fourth — **the cap held at three**, exactly as promised. That's the right behaviour and it's wired correctly.

One thing I'd want as a buyer: showing **"X interested" on a home is a double-edged sword.** For a hot lot it creates urgency (good), but for a home with "0 interested" it can read as "nobody wants this one." Consider whether you want to show the zero, or only surface counts once they're flattering.

**Opportunity:** Let me **filter the map by type** ("show me only the 2C homes") and by orientation. When I know I want a north-facing 114m², clicking 37 tiles one by one to find it is the manual version. A type filter on the map turns browsing into shortlisting.

## Registration form

I inspected the form thoroughly. It's well built: first/last name + email required, phone optional, then a smart set of qualifying dropdowns — buyer type (First Home Buyer / Next Home Buyer / Downsizer / Investor), buyer profile (Young Family / Couple / Single / Empty Nester / Retiree / Investor–Owner Occupier / Investor–Rental / Other), current housing, purchase timeline (ASAP → 12+ months → just exploring), finance status (pre-approved / exploring / cash / not started / prefer not to say), how-you-heard, and a referrer type. Plus suburb/postcode and a free-text notes box. There's a hidden honeypot field for spam, which I'm pleased to see. And critically: each of my three home picks gets its own slot where I can review the plan and set a **price expectation** — that's a genuinely smart bit of demand-capture; you're learning what people will actually pay, per home.

The consent language before submit is strong: it restates indicative-only / subject-to-confirmation / no obligation / database-and-updates consent, and links the Privacy Policy. The **submit button stays disabled until I tick consent** ("One more step — tick the consent checkbox above to enable the submit button"). That's the right consequence-gating — clear, deliberate, no surprise.

Two nitpicks: **suburb and postcode are plain text fields** — no address autocomplete. For a property campaign that's a missed standard; autocomplete reduces junk data and feels more professional. And there's **no price-expectation guidance** — if I don't know the actual prices (which I don't, see Terms), how do I sensibly set a "price expectation"? You're asking me to anchor blind. Give me the band and my expectation becomes useful signal instead of a guess.

**Opportunity:** Wire address autocomplete on suburb/postcode, and seed the price-expectation field with the indicative band as a placeholder ("e.g. $XXX–$XXX"). You'll get cleaner data and better-calibrated expectations.

## The bug that worried me — page crashes the browser under load

I have to flag this plainly. On repeated loads, **this page crashed my browser's renderer** — the tab went blank ("Aw, snap"-style) and the interactive site map (the 37 clickable homes) sometimes failed to appear at all even after waiting. On my first couple of passes everything worked — I loaded it, opened lightboxes, selected three homes, hit the cap. But after several reloads it became unstable and I could no longer reliably get the map to render or hold a session long enough to complete and submit the form. The page is carrying a lot at once: an autoplaying video, six SVG layers, a 37-node interactive map, and a multi-step form, all on first paint.

I want to be fair: a buyer on a current laptop loading it once will *probably* be fine — that's how my first passes went. But anyone on an older device, a phone with a few tabs open, or a heavy ad-blocked browser is at real risk of a blank map or a crash, and a blank map means *no way to register* — the page's entire job. That's not a cosmetic bug; it's the conversion path falling over for some share of visitors. **This is the one finding I'd fix before pushing any more traffic at the page.**

**Opportunity:** Lazy-load the video (poster + click-to-play), defer/virtualise the map until it scrolls into view, and code-split the form so first paint is light. The content is great; the page just needs to stop trying to do everything in the first second.

## Could I complete a registration end-to-end?

Honestly — partly. I selected three homes, confirmed the 3-cap works, and fully walked the form (fields, dropdowns, consent gate, the "no deposit / no obligation" language). What I could **not** complete on this visit was the final live submit + confirmation screen, because the page became unstable and kept crashing the renderer before I could fill and submit in one go. So I can vouch for everything *up to* the submit, and the submit is clearly gated and well-labelled — but I can't tell you what the confirmation experience feels like, and that worries me as much as anything: if my tooling couldn't hold the page together to submit, some real buyers won't be able to either.

## Would I pursue a purchase?

As a property professional: I'd **register**, yes — the homes look well-designed, the approval is real, the terms are honest, and the no-obligation framing makes registering easy. But I would *not* feel ready to *pursue a purchase* on this page alone, for one reason above all: **I never saw a price.** Combine the missing price band, the unstated title/strata position, and the undefined turnkey inclusions, and a serious buyer has to email before they can evaluate. Close those three and this goes from "nice campaign, I'll wait and see" to "I can actually make a decision."

---

## Standards Check

- ✅ **§1 Responsive** — No horizontal scroll at 1440px; content reflows cleanly and stays readable at mobile widths too (my captures rendered at ~375px and every section, lightbox included, held up). Body text legible.
- — **§2 Auth-page pattern** — n/a. Public estate page, no login/auth surface.
- ✅ **§5 Explanatory header** — Every section opens with a what/why intro; the site-map and "Pick a Home Above to Begin" empty state both carry clear explanatory copy. Strong.
- ❌ **§6 Voice agent** — No voice/assistant surface anywhere in the chrome. Searched the DOM; nothing present.
- 🟡 **§7 Scaffold metadata** — Tab title is correct ("Branscombe Estate — Register Your Interest | F2K") and a meta description exists — pass on the core. BUT no Open Graph image/title/description and no twitter:card in the served HTML, so a shared link won't unfurl a rich preview. Partial.
- 🟡 **§9 Codicils** — "Registration of interest only — no deposit" consequence is clear *before* submit and the submit button is disabled until consent is ticked (excellent). Next action is generally obvious. BUT address fields (suburb/postcode) are plain text with **no autocomplete** — a fail against the address-autocomplete codicil.

❌ fails to fix: **§6 voice agent (absent)**, **§9 address autocomplete (plain text suburb/postcode)**. Partials: §7 (no OG/twitter tags), §9 has the autocomplete miss.

---

*Scope note: This was a single-session human-style walkthrough against the live production page only — no source, docs, or memory read. I verified everything up to the final form submit; the live submit + confirmation screen could not be completed because the page repeatedly crashed the headless browser under load (reported above as the top bug), so the confirmation experience is the one item I could not personally observe.*

Thanks, Anneke

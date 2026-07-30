# Seafields — lot data questions for Uwe

**Date:** 2026-07-30. **Source:** independent walkthrough of the live site by a tester with no access
to our documents, briefed only with the public URL.
**Why you're getting this:** the site currently states different things about the same lots in
different places. Every item below is a question only you can answer — none of it is a coding fault,
and I don't want to "fix" any of it by guessing which number is right.

**Two of the affected lots already carry live registrations**, which is why this is the first list
rather than a later one.

---

## 1. How many lots are actually open?

- The **plan** reports **"6 lots match — 139 dimmed"** with all filters at their defaults. The
  rendered map confirms it: 6 selectable, 50 in one dimmed state, 87 in another, 2 heritage.
- The **page copy** markets **"Stages 1 and 3 open now — 44 lots"**.

**Question:** is the correct number 6 or 44? If 44, which stages/lots should be selectable that
currently aren't? If 6, the headline copy needs to change.

---

## 2. The 6 selectable lots sit in a stage the site says is locked

Lots **236, 237, 238** carry three different stage identities on the same visit:

| Where | What it says |
|---|---|
| Plan schematic | "Stage 5 — Sutcliffe Road" |
| Staging table | "Stage 5 · **LOCKED** · North" |
| Lot popup header | "SW BLOCK — **LAUNCH**" |

**Question:** is Stage 5 open or locked? And is "SW BLOCK" the same thing as Stage 5, or a different
grouping that happens to overlap?

---

## 3. Two lots are numbered twice in the published schedule

- **Stage 1** lists `348, 348`. Lot **349 is missing**.
- **Stage 6** lists **two different lots both numbered 294** — one **595m²**, one **525m²**. Lot
  **293 is missing**.

Both duplicates are independently confirmed in the clickable set on the map, so this is in the data,
not a display glitch. It also explains the 34-vs-35 count discrepancy in the stage totals.

**Question:** should the second `348` be `349`, and one of the `294`s be `293`? If so, which is
which — I don't want to renumber a lot someone has already registered interest in without you
confirming the mapping.

---

## 4. Four of the six available lots fall outside the published area range

The page publishes a range of **445–1,522m²**. The available lots include **1,669 / 1,815 / 2,510 /
2,605m²**.

**Question:** is the published range wrong, or are those four lots not meant to be in this release?
**Two of them already have registrations against them.**

---

## 5. The "serviced land only" price question offers house-and-land money

A panel headed **"SERVICED LAND ONLY"** asks a registrant what they would pay for a 525m² block. The
three options offered are **$610,700 / $620,700 / $630,700**.

Land at Seafields is **$155k–$190k**. A buyer reading this is being asked to anchor on roughly four
times the land price, under a heading that says land only.

**Question:** were those figures meant for the house-and-land packages? What should the land-only
options be?

---

## 6. Lot 236's detail sheet has no land-only price at all

It offers a single **$797,000 house-and-land package** and no land-only figure, on a site whose
headline is "$155k land".

**Question:** should every lot show both a land-only and a package price, or are some lots
package-only by design?

---

## 7. The featured home design can't be chosen

**Joey** — the design with the render gallery and the **$297,900** price on the site — cannot be
selected on the registration form. Neither can **EMU**. The form instead offers three homes that
don't appear in the catalogue at all.

**Question:** which designs should be selectable? This one I can fix as soon as I have the list — it
looks like the form and the catalogue were built from two different sources.

---

## 8. The legend contradicts the lots

The legend reads **"145 lots · 0 reserved"** while roughly **80 lots are individually marked
"Reserved"** in the underlying map data.

**Question:** how many are actually reserved? Related to the bucket back-fill still outstanding on
the two "Reserved" lots.

---

## What happens next

Nothing on this list changes until you've answered — the numbers are yours, not mine. Once items 1–4
and 8 are settled I can reconcile the workbook, the map and the page copy against a single source so
they can't drift apart again, and item 7 is a straightforward fix.

Items I have **not** put in front of you because they're mine or Dennis's: the admin table being
unusable on a phone, the registration form losing typed data, the legal pages, and the GST question.
Those are tracked separately.

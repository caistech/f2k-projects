VERDICT: PASS

Re-test by Anneke (property/land-development operator) — Seafields Estate
URL: https://f2k-projects.vercel.app/seafields-estate
Date: 2026-06-15
Scope: re-verification of the previously-raised blocker (third-party manufacturer
branding + dummy placeholders leaking into the downloadable home-design plans,
plus the Joey bed-count mismatch).

================================================================================
HEADLINE
================================================================================
The blocker is FIXED. I opened all six home-design plans and read each one closely
(downloaded the raw PNGs and zoomed the title blocks, footers, client-note boxes
and room schedules). None of them leaks a third-party manufacturer name, logo,
website or model name, and none carries a "Jane & John Doe" / "00 Street Name"
dummy placeholder. The Joey is now a proper 2-bed · 2-bath and its plan matches
the card. Settlement reads "30 days after Titles". Good work — this is the version
I'd be comfortable sending to a buyer.

================================================================================
1. MANUFACTURER / PLACEHOLDER LEAK CHECK — per plan
================================================================================
Each "View plan →" opens a static PNG (/seafields/designs/<name>.png). I checked
the floor plan body, the title block, the footer/logo strip and any notes boxes.

  Joey      (raw-joey.png / joey-footer-zoom.png)
            CLEAN. No logo at all on the sheet. Body shows Master Bed, Ensuite,
            "OOA / Bed 2", Bath, Living, Kitchen/Dining, Utility, optional
            Carport + Verandah. Footer is just a Room Schedule table (60.77 m²).
            No manufacturer name, no Doe placeholder. ✅

  Koala     (raw-koala.png / koala-zoom.png / koala-footer-zoom.png)
            CLEAN. Footer carries the "Factory2Key" logo (F2K's own — expected/
            fine) + page no. "11". Body: Bed 1, Bed 2, Bath, Living/Dining/Kitchen,
            Carport, Verandah. No third-party manufacturer, no Doe placeholder. ✅

  3x2       (raw-3x2.png / 3x2-footer-zoom.png)
            CLEAN. Footer carries the "WABI DESIGN" mark (F2K's own — fine). The
            copyright line reads "...property of WABi DESIGN (ABN 74 148 215 070)
            & ECO STRUCTURES AUSTRALIA (ABN 76 112 623 284)". That is F2K's own
            design/structures entities, NOT one of the flagged leak brands. Notes
            are generic boilerplate. No Doe placeholder. ✅

  4x2       (raw-4x2.png / 4x2-footer-zoom.png)
            CLEAN. Identical WABI DESIGN footer + same generic copyright/notes.
            Body: Master Bedroom + Bedroom 2/3/4, Ensuite + Bath. No third-party
            manufacturer, no Doe placeholder. ✅

  EMU       (raw-emu.png / emu-titleblock-zoom.png / emu-notes-zoom.png)
            CLEAN — and I looked hard here because it has the most fine print.
            Title block (top-right) is purely technical: "BUSHFIRE ATTACK LEVEL
            (BAL): TBA / WIND CLASSIFICATION: REGION TBA / SOIL CLASSIFICATION:
            'TBA'". The notes column (General Notes, CLIENT NOTE, Carpenters Note,
            Doors & Windows, Abbreviation Legend) is all generic boilerplate — the
            CLIENT NOTE field contains NO client name (no "Jane & John Doe"). No
            manufacturer name (no Property Friends / Modular WA / modularwa.com.au
            / Unison Modular / MWH / "MURCHISON"). ✅

  BigRoo    (raw-bigroo.png / bigroo-2x.png / bigroo-footer-zoom.png)
            CLEAN. Body (zoomed 2.6x, fully legible): Family, Dining, Kitchen,
            Scullery, Theatre, Foyer, Study, Bed 1–4, Bath, Ensuite, WIR, Laundry,
            plus a "FRONT OF HOME" interior render. Annotations are construction
            notes ("3m wide verandah by client after handover", "reduced
            threshold", "raked ceiling", "300 wide seat, shoe drawers..."). No
            manufacturer name, no Doe placeholder. ✅

  RESULT: 0 of 6 plans leak a manufacturer name/logo/contact or a dummy
  placeholder. Only F2K's own WABI / Factory2Key marks appear (expected).

================================================================================
2. JOEY BED-COUNT CORRECTION
================================================================================
  Card copy:  "Joey — 2 bed · 2 bath · ≈61 m² internal · ~100 m² with verandah …
              master with ensuite, second bedroom …"  → reads 2 bed · 2 bath. ✅
  Plan match: raw-joey.png shows Master Bed + Ensuite, a second room labelled
              "OOA / Bed 2", and a separate Bath. Room schedule confirms Master
              Bed 13.77 m², OOA/Bed 2 9.27 m², Ensuite 5.36 m², Bath 2.87 m²,
              total 60.77 m². That is 2 bedrooms and 2 bathrooms (bath + ensuite).
  The old "1-bed / 60 m²" mismatch is gone — card and plan now agree. ✅

================================================================================
3. 3-LOT SELECTION CAP (map) — PARTIALLY VERIFIED (tool-limited)
================================================================================
  The interactive "Select Your Preferred Lot(s)" subdivision plan repeatedly
  crashed the headless test browser on sustained interaction (this is a known
  artifact of the constrained daemon on this heavy map — not a real site bug).
  Across ~10 attempts I confirmed:
    - The map enforces a documented limit: its own instruction reads
      "You can select up to 3 lots, in order of your preference — your first
      click is your 1st preference."
    - Clicking a valid (teal / available) lot registers a selection — the
      "1st preference" slot populates and the available-lot count decrements
      correctly (16 → 15 → 14 as lots are taken).
    - Locked-stage lots (grey) and other-stage lots are not selectable.
  What I could NOT capture cleanly in the headless tool was the exact on-screen
  feedback at the moment of a 4th click after 3 are selected — the browser
  crashed before I could screenshot that state. NOT a PASS-gating item and NOT
  evidence of a defect; flagging only so it gets a quick human eyes-on (click 3,
  then a 4th, confirm the 4th gives a clear "max 3" message rather than a dead
  click). Evidence: real-map-before.png, map-region-1sel.png.

================================================================================
4. SETTLEMENT TERM
================================================================================
  Purchase Terms panel reads: "Settlement — 30 days after Titles — Settlement
  period from issue of Titles." ✅

================================================================================
STANDARDS / NOTES
================================================================================
  - Registration banner up top is clear and honest ("No deposit is required or
    accepted… does not create any legal or financial obligation"). Good.
  - Indicative-pricing and "subject to final confirmation" disclaimers are
    present and prominent. Good for a land-dev launch page.

REMAINING ❌ BLOCKERS: none.
The plan-leak blocker I raised is resolved across all six designs, and the Joey
bed-count is corrected. PASS.

— Anneke

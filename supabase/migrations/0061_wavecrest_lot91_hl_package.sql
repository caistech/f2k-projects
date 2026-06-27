-- Wavecrest Lot 91 — capture the H&L display-home package costing (internal).
--
-- Source: Uwe Jacobs (Property Friends) H&L package sheet, 2026-06-26
--   ("Proposed Lot 91 / 2 Brownlie Street Wavecrest", H L Packages Wavecrest (1).xlsx).
-- Full build-up + analysis: docs/wavecrest/lot-91-hl-package-costing.md
--
-- Lot 91 is the DISPLAY HOME (DA Lot 84, Council Ref A30194) — a feature within the
-- estate, NOT a saleable lot. Sold to an investor turnkey "as is" (standalone, not
-- connected to services) and leased back by F2K at ~7% ($900/wk) as the display.
--
-- WHAT THIS WRITES (all INTERNAL — the public lot API does not select these columns):
--   * dwelling_type  -> 'Koala-Augusta (display home)'
--   * house_cost     -> 367100   (Uwe's "Subtotal House" cost, incl. additions + freshen-up)
--   * wholesale_price-> 627035   (total F2K all-in package COST: 367,100 house + 259,935 land)
--   * notes          -> enriched with the full package economics + services caveat
--
-- WHAT THIS DELIBERATELY DOES NOT TOUCH:
--   * retail_price   -> stays NULL. The public API shows retail_price for under_contract lots,
--                       so we do NOT advertise the $680k turnkey on the display home. The
--                       package sale ($680k) + GM ($52,965) live in notes + the doc only.
--   * land_only      -> stays 250000 (the vacant-land price; distinct from the H&L land split
--                       of $290k, which is internal to the package and recorded in notes).
--   * status         -> stays 'under_contract'.  * sqm -> stays 2148 (surveyed).
--
-- Idempotent: a plain UPDATE keyed on lot_number; safe to re-run.

UPDATE wavecrest_lot_allocations
SET
  dwelling_type   = 'Koala-Augusta (display home)',
  house_cost      = 367100,
  wholesale_price = 627035,
  notes =
    'AREA SURVEYED (high confidence). Range/ocean views; adjacent Lot 92. Land ~$250k. '
    || 'DISPLAY-HOME LOT (Modular WA), DA Lot 84 / Council Ref A30194. '
    || 'H&L package (Uwe/PF sheet 2026-06-26 — internal; see docs/wavecrest/lot-91-hl-package-costing.md): '
    || 'land cost $259,935 (contract 250,000 + duty 6,935 + xfer 500 + conveyancing 2,500) sold at $290,000 (GM $30,065); '
    || 'house cost $367,100 (Koala-Augusta 327,700 + landscaping 15,000 + freshen-up 5,000 + additions 19,400) sold at $390,000 (GM $22,900); '
    || 'TURNKEY PACKAGE cost $627,035 / sale $680,000 / GM $52,965 (7.8%). '
    || 'Sold "as is" = standalone display (Starlink telco; septic + leach drains = PERMANENT solution, CGG-approved, no mains sewer). '
    || 'Power + water stubbed at boundary both frontages (Montgomery R002). F2K leases back at 7% ($900/wk; $23,400 over 26 wks) as the display. '
    || 'Services over the Koala allowance: connection incl to 10m of the home, over-10m trenching + WP/Water Corp connection fees + site switchboard are the adds (~$4-8k all-in power+water; NO sewer cost) — over-10m metres per MWA A101 Rev L / on-site mtg. '
    || 'See docs/wavecrest/lot-91-hl-package-costing.md. Sources: Quantum survey 1-fItTNu; land 1IW3UBrk; MWA JS921; F2K-SOW-2026-L91-001 Rev1.3.'
WHERE lot_number = 91;

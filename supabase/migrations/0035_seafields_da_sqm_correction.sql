-- 0035_seafields_da_sqm_correction.sql
--
-- Correct seafields_lot_allocations.sqm to the DA-approved lot areas.
--
-- WHY: the V6 extraction wrongly used the DWG's `Cad-Poly WAPC202888` layer
-- (a superseded/alternate re-cut) for ~20 lots, putting wrong m² on the site.
-- The DA-approved geometry is the `Cad-Poly` layer, confirmed by the DWG's own
-- `Areas` layer (the "NNNm²" printed on each lot of CLE Plan 3027-08B-01),
-- which matches the Cad-Poly polygon area for every lot to within ~1 m².
-- Uwe (Property Friends) flagged the discrepancy on 2026-05-26 and confirmed the
-- DA is the pertinent document; these are the authoritative DA figures.
--
-- Values are the DWG `Areas`-layer m² per lot. Idempotent (sets fixed values).
-- 294 / 348 are NOT touched here: the DWG carries two parcels per number
-- pending CLE renumber, but the DB holds a single row — handled separately.
--
-- PRICING NOTE: the public view prefers retail_price (migration 0023), so
-- correcting sqm fixes the displayed SIZE without changing the displayed PRICE.
-- Size-band shifts (e.g. 309 614->456, 292 783->525) are for Uwe to re-price.

UPDATE seafields_lot_allocations AS s
SET sqm = v.sqm,
    updated_at = now()
FROM (VALUES
  (269, 678), (270, 622), (292, 525), (302, 680), (305, 600),
  (306, 603), (307, 604), (308, 605), (309, 456), (310, 614),
  (313, 505), (315, 472), (316, 754), (317, 606), (327, 735),
  (328, 625), (329, 736), (332, 669), (333, 606)
) AS v(lot_number, sqm)
WHERE s.lot_number = v.lot_number
  AND s.sqm IS DISTINCT FROM v.sqm;

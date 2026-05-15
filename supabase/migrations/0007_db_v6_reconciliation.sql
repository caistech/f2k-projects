-- F2K-Projects — Seafields launch schema, part 6 of 6
-- DB ↔ V6 reconciliation: bring seafields_lot_allocations in sync with
-- CLE Plan 3027-08B-01 (WAPC 202888) V6 — the canonical lot register
-- captured in src/data/seafields/lots.ts.
--
-- Three operations:
--   1. INSERT 11 missing V6 lots (Stage 7 Collins Road, 370–380)
--   2. DELETE 58 legacy seed lots not in V6 — GUARDED against references
--      from seafields_registrations / seafields_registration_lots
--   3. UPDATE area (sqm) where DB ≠ V6 — V5 used frontage×depth approx;
--      V6 uses true 08B polygon area. 22 lots flagged isAmended in lots.ts
--      have geometry deltas; others have minor area refinements
--
-- Idempotent: re-runs are no-ops (INSERT ON CONFLICT, DELETE WHERE IN,
-- UPDATE WHERE IS DISTINCT FROM).
-- Audit-aware: trg_audit_lots from 0005 writes one audit_log row per
-- changed field. Actor + reason set via SET LOCAL inside this script.
--
-- Authored 2026-05-16 per [[seafields-workbook-merge-policy]] policy that
-- 08B/V6 is canonical. Phase 4.2 V2 workbook merge surfaced the divergence
-- (11 V6-only orphans, 58 DB-only legacy rows).

BEGIN;

-- =====================================================================
-- AUDIT CONTEXT — trigger from 0005 reads these via current_setting()
-- =====================================================================

SET LOCAL app.actor_email = 'migration-0007@factory2key';
SET LOCAL app.audit_reason = 'DB <-> V6/08B reconciliation: drop 58 legacy seed rows, add 11 missing Stage 7 Collins lots, sync areas to 08B polygon geometry';

-- =====================================================================
-- 1. INSERT — 11 missing V6 lots (Stage 7 Collins Road)
-- =====================================================================
-- These are in src/data/seafields/lots.ts (V6) but were never seeded to DB.
-- Bare insert with lot_number + sqm + stage + zone + category. The Phase 4.2
-- workbook merge (V2) will populate status/allocation_bucket/etc on next run.

INSERT INTO seafields_lot_allocations (lot_number, sqm, stage, zone, category)
VALUES
  (370, 571, '7', 'Collins Road', 'standard'),
  (371, 571, '7', 'Collins Road', 'standard'),
  (372, 571, '7', 'Collins Road', 'standard'),
  (373, 571, '7', 'Collins Road', 'standard'),
  (374, 571, '7', 'Collins Road', 'standard'),
  (375, 647, '7', 'Collins Road', 'large'),
  (376, 647, '7', 'Collins Road', 'large'),
  (377, 647, '7', 'Collins Road', 'large'),
  (378, 685, '7', 'Collins Road', 'large'),
  (379, 818, '7', 'Collins Road — Heritage Lot', 'heritage'),
  (380, 819, '7', 'Collins Road', 'premium')
ON CONFLICT (lot_number) DO NOTHING;

-- =====================================================================
-- 2. DELETE — 58 legacy seed lots not in V6, guarded
-- =====================================================================
-- V6 (08B) explicitly removes 293, 349. The other 56 (85–91, 109–111,
-- 200–235, 426–434, 442) are legacy seed bloat predating the V6 register.
--
-- Guard: refuse to delete any lot referenced by an existing registration.
-- The trigger writes one DELETE audit_log row per affected lot.

DO $$
DECLARE
  v_legacy_text TEXT[] := ARRAY[
    '85','86','87','88','89','90','91',
    '109','110','111',
    '200','201','202','203','204','205','206','207','208','209','210',
    '211','212','213','214','215','216','217','218','219','220',
    '221','222','223','224','225','226','227','228','229','230',
    '231','232','233','234','235',
    '293','349',
    '426','427','428','429','430','431','432','433','434','442'
  ];
  v_legacy_int  INTEGER[] := ARRAY[
    85,86,87,88,89,90,91,
    109,110,111,
    200,201,202,203,204,205,206,207,208,209,210,
    211,212,213,214,215,216,217,218,219,220,
    221,222,223,224,225,226,227,228,229,230,
    231,232,233,234,235,
    293,349,
    426,427,428,429,430,431,432,433,434,442
  ];
  v_blocker_regs INTEGER;
  v_blocker_join INTEGER;
BEGIN
  -- seafields_registrations.lots_selected is text[] — match as strings
  SELECT COUNT(*) INTO v_blocker_regs
  FROM seafields_registrations
  WHERE lots_selected && v_legacy_text;

  IF v_blocker_regs > 0 THEN
    RAISE EXCEPTION
      'Aborting DELETE: % seafields_registrations rows reference a legacy lot. Resolve before re-running.',
      v_blocker_regs;
  END IF;

  -- seafields_registration_lots — the new join table from 0004
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'seafields_registration_lots'
  ) THEN
    SELECT COUNT(*) INTO v_blocker_join
    FROM seafields_registration_lots
    WHERE lot_number = ANY (v_legacy_int);

    IF v_blocker_join > 0 THEN
      RAISE EXCEPTION
        'Aborting DELETE: % seafields_registration_lots rows reference a legacy lot. Resolve before re-running.',
        v_blocker_join;
    END IF;
  END IF;

  -- Safe to delete
  DELETE FROM seafields_lot_allocations
  WHERE lot_number = ANY (v_legacy_int);
END $$;

-- =====================================================================
-- 3. UPDATE — sync sqm to V6 polygon area where it differs
-- =====================================================================
-- VALUES table is the V6 register (145 lots, from src/data/seafields/lots.ts).
-- Only updates rows whose sqm IS DISTINCT FROM the V6 area (idempotent).
-- Trigger writes one UPDATE audit row per changed lot.

UPDATE seafields_lot_allocations sla
SET sqm = v6.area
FROM (VALUES
  -- Stage 1 — SW Block (20 lots)
  (332, 690), (333, 537), (334, 613), (335, 596), (336, 643),
  (337, 570), (338, 570), (339, 570), (340, 570), (341, 646),
  (342, 646), (343, 666), (344, 666), (345, 646), (346, 646),
  (347, 570), (348, 570), (350, 570), (351, 646),
  -- Stage 2 — Heritage (1 lot)
  (323, 1522),
  -- Stage 3 — Central (23 lots)
  (308, 685), (309, 614), (310, 510), (311, 505), (312, 510),
  (313, 525), (314, 614), (315, 560), (316, 794), (317, 658),
  (318, 595), (319, 595), (320, 595), (321, 595), (322, 749),
  (324, 630), (325, 682), (326, 682), (327, 772), (328, 704),
  (329, 804), (330, 721), (331, 748),
  -- Stage 4 — Pepper Gate Inner (12 lots)
  (261, 536), (262, 517), (263, 589), (264, 523), (265, 527),
  (266, 606), (267, 598), (268, 685), (269, 619), (270, 548),
  (271, 629), (272, 600),
  -- Stage 5 — Sutcliffe Road / NE Inner (25 lots)
  (236, 554), (237, 525), (238, 815), (239, 751), (240, 595),
  (241, 595), (242, 624), (243, 561), (244, 483), (245, 473),
  (246, 462), (247, 511), (248, 600), (249, 638), (250, 502),
  (251, 502), (252, 503), (253, 503), (254, 502), (255, 569),
  (256, 818), (257, 520), (258, 545), (259, 559), (260, 524),
  -- Stage 6 — Central Upper (35 lots)
  (273, 595), (274, 525), (275, 525), (276, 595), (277, 595),
  (278, 525), (279, 525), (280, 595), (281, 595), (282, 595),
  (283, 598), (284, 598), (285, 595), (286, 595), (287, 595),
  (288, 525), (289, 525), (290, 595), (291, 595), (292, 783),
  (294, 797), (295, 691), (296, 680), (297, 680), (298, 680),
  (299, 680), (300, 680), (301, 680), (302, 580), (303, 680),
  (304, 600), (305, 610), (306, 650), (307, 536),
  -- Stage 7 — Collins Road (29 lots, includes the 11 just inserted)
  (352, 593), (353, 555), (354, 555), (355, 555), (356, 629),
  (357, 629), (358, 629), (359, 555), (360, 555), (361, 555),
  (362, 555), (363, 555), (364, 629), (365, 629), (366, 629),
  (367, 647), (368, 647), (369, 647),
  (370, 571), (371, 571), (372, 571), (373, 571), (374, 571),
  (375, 647), (376, 647), (377, 647), (378, 685), (379, 818),
  (380, 819)
) AS v6(lot_number, area)
WHERE sla.lot_number = v6.lot_number
  AND sla.sqm IS DISTINCT FROM v6.area;

COMMIT;

-- F2K-Projects — Seafields Lot 307 stage correction
-- Per Uwe (Property Friends) live-UI feedback 2026-05-21:
-- Lot 307 was misfiled as Stage 6 in the V6 reconciliation but spatially sits
-- in the Stage 3 (Central) area, immediately adjacent to Lot 308 which was
-- correctly placed in Stage 3. Both were newly added in 08B (V5 omitted).
-- Polygon centroids (from src/data/seafields/polygons.json):
--   307: (492, 462)   308: (467, 467)   — adjacent, both Central
--
-- Idempotent: only updates if currently '6'.
-- Audit-aware: trg_audit_lots writes one UPDATE row per changed field.

BEGIN;

SET LOCAL app.actor_email = 'migration-0012@factory2key';
SET LOCAL app.audit_reason = 'Lot 307 stage corrected from 6 to 3 per CLE / Uwe live-UI feedback 2026-05-21 (spatial adjacency to 308)';

UPDATE seafields_lot_allocations
SET
  stage = '3',
  stage_id = (SELECT id FROM stages WHERE stage_number = 3)
WHERE lot_number = 307
  AND stage IS DISTINCT FROM '3';

COMMIT;

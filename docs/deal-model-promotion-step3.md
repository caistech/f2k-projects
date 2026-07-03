# F2K-Projects — Deal-Model Promotion Receiver (Step 3) — status

**Date:** 2026-07-03. **Role:** the receiving end of the cross-DB promotion DealFindrs → F2K-Projects.

## The flow (recap)
DealFindrs computes the F2K partnership verdict from an ingested indicative feasibility study and,
on a **non-STOP** verdict, PROMOTES the deal here. The three repos are on **separate Supabase
instances**, so promotion is an authenticated HTTP hop carrying the stable `deal_id` + snapshot +
version — not a foreign key. The **estate-page build is gated** on: a received promotion with
`verdict ≠ REJECT` **AND** the developer's title present.

## Built + verified (receive side)
- `supabase/migrations/0071_deal_model_promotions.sql` — `deal_promotions` table (keyed by
  `deal_id` + `snapshot_version`, idempotent, RLS deny-by-default, service-role writes) + links
  `developer_onboarding` to its deal (`deal_id`) and adds the enforced build stamp
  (`cleared_for_build_at` / `cleared_for_build_by`). **DRAFT — not yet applied** (see holds).
- `src/lib/deal-model/promotion-auth.ts` — shared-secret HMAC (`DEAL_MODEL_PROMOTION_SECRET`),
  fail-closed. Mirrors the convai-webhook discipline.
- `src/app/api/deal-model/promotion/route.ts` — receiver: HMAC-verify (unset→500, bad→401) →
  validate → idempotent upsert → best-effort link to a `developer_onboarding` (by `deal_id`, else
  email+estate). Records only; never clears a build itself.
- `src/lib/deal-model/gate.ts` — `canBuildEstate({verdict, titlePresent})` + `hasTitleEvidence`
  (site controlled + a title-category upload). Enforcement helper for the admin clear-for-build action.
- `src/lib/deal-model/promotion.test.ts` — 10 tests (HMAC round-trip/tamper/wrong-secret/missing;
  gate GO/ADJUST/REJECT/no-title/not-controlled/no-verdict). **All pass.** `tsc` clean.

## Service auth (decided, sensible default)
Shared-secret **HMAC** over the raw body. `DEAL_MODEL_PROMOTION_SECRET` set identically on both
DealFindrs (signer) and F2K-Projects (verifier). No OAuth; matches portfolio webhook discipline.

## DONE since (2026-07-03)
1. **Migration 0071 APPLIED** to `zzajvnhsesqrrepflrrx` — verified (table + RLS + 3 onboarding columns).
2. **DealFindrs SEND side** — `src/lib/deal-model/promote.ts` (sign + POST) +
   `POST /api/deal-model/promote` (loads latest snapshot, **refuses REJECT**, signs, sends) +
   a "Promote to F2K-Projects" button on the capture panel (hidden/blocked for STOP).
3. **Admin clear-for-build action** — `POST/GET /api/admin/deal-model/clear-for-build` +
   `manage_developer_onboarding` permission. GET returns gate status; POST **enforces**
   `canBuildEstate` (verdict != REJECT AND title present) and only then stamps
   `cleared_for_build_at` + `cleared_for_build_by`, audited. Refuses (409) with a reason when blocked.

## Remaining
- **Set the shared secret + URL** (operator/env, values NOT in this doc):
  - both repos: `DEAL_MODEL_PROMOTION_SECRET` (identical), sensitive, prod+preview.
  - DealFindrs: `F2K_PROJECTS_PROMOTION_URL` = the F2K-Projects production origin with
    `/api/deal-model/promotion` appended (operator supplies the origin).
- ~~Surface the clear-for-build button~~ **DONE** — `/admin/developer-onboarding` (new page +
  `GET /api/admin/developer-onboarding` list API + AdminSidebar nav entry). Lists every intake with
  its verdict badge, title present/missing, and gate status; the "Clear for build" button is
  **disabled until the gate passes** and confirms + logs on click. `tsc` clean.
- **Live smoke test** — pending the shared secret env being set + a deploy of both repos (the
  end-to-end promotion can't fire until `DEAL_MODEL_PROMOTION_SECRET` is live on both sides).

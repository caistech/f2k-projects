-- 0070_developer_onboarding_company_abn.sql
--
-- Capture the submitter's COMPANY / ENTITY NAME + ABN on the developer-onboarding intake.
-- A developer / land owner / agent enquiry is a business enquiry — the entity + ABN are basic
-- qualification (who are we actually dealing with, and is it a real registered entity) that the
-- form was missing. Mirrors the seafields employer-registration pattern (business_name + abn).
-- Both optional: an early-stage enquirer may not have an entity yet, and we never want to block a
-- genuine lead on a missing ABN.

ALTER TABLE public.developer_onboarding
  ADD COLUMN IF NOT EXISTS company_name TEXT,   -- developer / land-owner / agency entity name
  ADD COLUMN IF NOT EXISTS abn          TEXT;   -- 11-digit ABN (checksum-validated client-side)

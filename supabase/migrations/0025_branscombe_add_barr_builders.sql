-- 0025_branscombe_add_barr_builders.sql
--
-- Adds Chris and Bob Barr (Barr Builders) to the Branscombe notification
-- recipients list. Single shared inbox at barrbuilders@bigpond.com.
--
-- Branscombe-only — Barry Humfrey stays on Seafields, the Barrs stay on
-- Branscombe. Different builders, different estates.

INSERT INTO branscombe_notify_recipients (email, name, active)
VALUES
  ('barrbuilders@bigpond.com', 'Chris and Bob Barr (Barr Builders)', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 0036_seafields_clear_house_cost_sutcliffe.sql
--
-- Fix for Uwe's Sutcliffe Rd pricing issue (lots 236, 237, 238).
-- The public view calculates: total_price = retail_price + house_cost
-- Uwe entered what he thought was the TOTAL price in "Retail", but house_cost
-- was already set, causing the display to show retail + house (too high).
--
-- This clears house_cost so the retail_price displays as-is.
-- After this, Uwe should enter only the land component in "Land & Build Retail".

UPDATE seafields_lot_allocations
SET house_cost = NULL
WHERE lot_number IN (236, 237, 238)
  AND house_cost IS NOT NULL;

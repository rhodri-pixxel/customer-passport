-- ============================================================
-- STEP 5 — Add owner_director_email column
-- Run in the CORRECT project (plspunlkmkvplgcsncpa) SQL Editor.
-- Lets the sync store the Sales Owner's email for clean-name matching.
-- ============================================================

alter table public.handover_passports
  add column if not exists owner_director_email text;

select 'owner_director_email column added' as result;

-- The Aurora workspace name is now derived, never typed.
--
-- A deal is linked by pasting the org UUID alone (Execution → Aurora workspace);
-- the real workspace name is filled in from the Metabase export the next time
-- the catalog sync runs. Until that happens there is genuinely no name to show,
-- so org_name has to be allowed to be NULL rather than seeded with a guess —
-- storing the deal's company name there was exactly the inconsistency this is
-- meant to remove.

ALTER TABLE public.catalog_org_links ALTER COLUMN org_name DROP NOT NULL;

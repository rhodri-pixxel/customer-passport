-- Trim shared_products, one day after creating it.
--
--  · shared_with dropped. It asked which person at the customer received the
--    product, but the passport already names the client and its contacts, so it
--    was asking people to retype something the record already held. Any values
--    typed in the first day go with it — the table is a day old.
--  · L2A dropped from the allowed levels. L2A reaches customers through the
--    Aurora catalog, which the delivered_images sync already records; offering
--    it here only invited a second, hand-typed copy of the same delivery.
--
-- Safe to run more than once.

ALTER TABLE public.shared_products DROP COLUMN IF EXISTS shared_with;

-- Anything already filed as L2A becomes Other, so the tighter constraint below
-- can't fail on existing data.
UPDATE public.shared_products SET product_level = 'Other' WHERE product_level = 'L2A';

ALTER TABLE public.shared_products DROP CONSTRAINT IF EXISTS shared_products_level_check;
ALTER TABLE public.shared_products ADD CONSTRAINT shared_products_level_check
  CHECK (product_level = ANY (ARRAY['L1B'::text, 'L1C'::text, 'Other'::text]));

-- Paid vs sample classification for cataloged deliveries.
--
-- Rule of thumb: TASKING = paid work the customer ordered, ARCHIVE = unpaid
-- sample imagery. That's only a default though — sample imagery is sometimes
-- tasked too — so the SE can override it per image from the Execution tab.
--
--   NULL     not classified; the app falls back to the order_type default
--   'paid'   stays in Execution → Delivered images
--   'sample' moves to Execution → Sample data delivered
--
-- Nullable on purpose: existing rows keep working and the catalog sync doesn't
-- have to guess, it just leaves the column alone.
--
-- Written to be re-runnable: re-applying this file is a no-op rather than an
-- "already exists" error.

ALTER TABLE public.delivered_images ADD COLUMN IF NOT EXISTS delivery_kind text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivered_images_delivery_kind_check'
      AND conrelid = 'public.delivered_images'::regclass
  ) THEN
    ALTER TABLE public.delivered_images
      ADD CONSTRAINT delivered_images_delivery_kind_check
      CHECK (delivery_kind IS NULL OR delivery_kind = ANY (ARRAY['paid'::text, 'sample'::text]));
  END IF;
END $$;

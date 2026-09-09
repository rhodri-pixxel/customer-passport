-- L1B / L1C products shared with a customer, recorded by hand.
--
-- delivered_images only knows about scenes cataloged into a customer's Aurora
-- workspace, which is an L2A path. L1B and L1C go out another way — a secure
-- link, a bucket, an email — so the catalog sync never sees them and the
-- passport showed nothing for a delivery that definitely happened.
--
-- Deliberately its own table rather than manual rows inside delivered_images:
-- that table is owned by the catalog sync, which upserts on (org_id, image_id)
-- and would fight anything typed into it. It also requires an org_id, which a
-- share outside Aurora doesn't have.
--
-- Temporary in intent — when the sync learns about L1B/L1C this becomes the
-- backfill source rather than the record of truth.

CREATE TABLE IF NOT EXISTS public.shared_products (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  -- What was shared. L2A and Other are here because a delivery outside the
  -- catalog can be either, and forcing it into "L1B" would be a lie.
  product_level text NOT NULL DEFAULT 'L1B',
  image_id text,
  shared_at date DEFAULT CURRENT_DATE,
  shared_with text,          -- who at the customer received it
  link text,                 -- where it went, if there's a URL worth keeping
  note text,
  created_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shared_products_pkey') THEN
    ALTER TABLE public.shared_products ADD CONSTRAINT shared_products_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shared_products_passport_id_fkey') THEN
    ALTER TABLE public.shared_products ADD CONSTRAINT shared_products_passport_id_fkey
      FOREIGN KEY (passport_id) REFERENCES public.handover_passports(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shared_products_level_check') THEN
    ALTER TABLE public.shared_products ADD CONSTRAINT shared_products_level_check
      CHECK (product_level = ANY (ARRAY['L1B'::text, 'L1C'::text, 'L2A'::text, 'Other'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shared_products_passport
  ON public.shared_products USING btree (passport_id, shared_at DESC);

ALTER TABLE public.shared_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_shared_products ON public.shared_products;
DROP POLICY IF EXISTS insert_shared_products ON public.shared_products;
DROP POLICY IF EXISTS update_shared_products ON public.shared_products;
DROP POLICY IF EXISTS delete_shared_products ON public.shared_products;

CREATE POLICY read_shared_products ON public.shared_products
  FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY insert_shared_products ON public.shared_products
  FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY update_shared_products ON public.shared_products
  FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_shared_products ON public.shared_products
  FOR DELETE TO public USING (can_edit());

COMMENT ON TABLE public.shared_products IS
  'Hand-recorded L1B/L1C (and other non-cataloged) product shares. delivered_images covers only Aurora-cataloged L2A deliveries.';

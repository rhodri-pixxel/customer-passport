-- IPR feed: a read-only mirror of the IPR dashboard.
--
-- Images that have cleared the pipeline ("Sent to Aurora" / "Datahub upload
-- completed") are NOT QC work — most never need a human to look at them. They
-- live here rather than in quality_checks so they can't leak into the QC queue,
-- the MVP Images view, the CSV export or the Notion sync, all of which read
-- quality_checks. An SE promotes the few that do need review, which creates a
-- proper quality_checks row with an assignee; qc_id then records that link.
--
-- image_key is the canonical satellite+frame ("FF03:4320", see normalizeImageId
-- in the app) and is UNIQUE, so re-running the sync is idempotent and the same
-- frame can't land twice under two different ID spellings.

CREATE TABLE IF NOT EXISTS public.captured_images (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  image_key text NOT NULL,
  image_id text NOT NULL,
  passport_id uuid REFERENCES public.handover_passports(id) ON DELETE SET NULL,
  organization text,
  satellite text,
  bandset text,
  location text,
  processing_status text,
  cloud_cover numeric,
  ipr_info text,
  qc_id uuid REFERENCES public.quality_checks(id) ON DELETE SET NULL,
  captured_at timestamp with time zone,
  synced_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'captured_images_pkey') THEN
    ALTER TABLE public.captured_images ADD CONSTRAINT captured_images_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'captured_images_image_key_key') THEN
    ALTER TABLE public.captured_images ADD CONSTRAINT captured_images_image_key_key UNIQUE (image_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_captured_images_synced
  ON public.captured_images USING btree (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_captured_images_passport
  ON public.captured_images USING btree (passport_id);

ALTER TABLE public.captured_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_captured_images ON public.captured_images;
DROP POLICY IF EXISTS insert_captured_images ON public.captured_images;
DROP POLICY IF EXISTS update_captured_images ON public.captured_images;
DROP POLICY IF EXISTS delete_captured_images ON public.captured_images;

CREATE POLICY read_captured_images ON public.captured_images
  FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY insert_captured_images ON public.captured_images
  FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY update_captured_images ON public.captured_images
  FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_captured_images ON public.captured_images
  FOR DELETE TO public USING (can_edit());

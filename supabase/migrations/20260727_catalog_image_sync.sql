-- Catalog image sync (Metabase "Image to Catalog Mapping", question 636).
-- Images are cataloged to Aurora orgs (stable UUIDs), not HubSpot deals, so:
--   catalog_org_links  — org_id -> passport mapping, confirmed by a human once
--                        (status 'ignored' hides internal/non-customer orgs
--                        from the review list without linking them to a deal).
--   delivered_images   — one row per (org, image) delivery, upserted by the
--                        browser-side sync; passport_id denormalized from the
--                        link at sync time so the Execution tab can query it
--                        directly.

CREATE TABLE public.catalog_org_links (
  org_id text PRIMARY KEY,
  org_name text NOT NULL,
  passport_id uuid REFERENCES public.handover_passports(id) ON DELETE CASCADE,
  status text DEFAULT 'linked'::text NOT NULL,
  created_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.catalog_org_links
  ADD CONSTRAINT catalog_org_links_status_check CHECK ((status = ANY (ARRAY['linked'::text, 'ignored'::text])));
-- linked -> must point at a passport; ignored -> must not
ALTER TABLE public.catalog_org_links
  ADD CONSTRAINT catalog_org_links_status_passport_check
  CHECK ((status = 'linked' AND passport_id IS NOT NULL) OR (status = 'ignored' AND passport_id IS NULL));

CREATE TABLE public.delivered_images (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid REFERENCES public.handover_passports(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  org_name text,
  image_id text NOT NULL,
  order_type text,
  task_id text,
  delivered_at timestamp with time zone,
  synced_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.delivered_images ADD CONSTRAINT delivered_images_pkey PRIMARY KEY (id);
ALTER TABLE public.delivered_images ADD CONSTRAINT delivered_images_org_image_key UNIQUE (org_id, image_id);

CREATE INDEX idx_catalog_links_passport ON public.catalog_org_links USING btree (passport_id);
CREATE INDEX idx_delivered_images_passport ON public.delivered_images USING btree (passport_id, delivered_at DESC);

ALTER TABLE public.catalog_org_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivered_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_catalog_org_links ON public.catalog_org_links FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY insert_catalog_org_links ON public.catalog_org_links FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY update_catalog_org_links ON public.catalog_org_links FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_catalog_org_links ON public.catalog_org_links FOR DELETE TO public USING (can_edit());

CREATE POLICY read_delivered_images ON public.delivered_images FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY insert_delivered_images ON public.delivered_images FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY update_delivered_images ON public.delivered_images FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_delivered_images ON public.delivered_images FOR DELETE TO public USING (can_edit());

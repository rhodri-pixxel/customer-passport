-- ============================================================================
-- Pixxel Customer Passport — full schema snapshot
-- Dumped from project plspunlkmkvplgcsncpa on 2026-07-18 via catalog queries
-- (pg_dump unavailable on this machine — no Docker; content verified against
--  pg_catalog: tables, constraints, indexes, functions, triggers, RLS
--  policies, storage bucket + policies, extensions, cron jobs).
--
-- Running this on a fresh Supabase project recreates the entire database.
-- Order matters: extensions → tables → constraints → indexes → functions
-- → triggers → RLS → policies → storage → cron.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions (beyond Supabase defaults)
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.handover_passports (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  hubspot_deal_id text NOT NULL,
  hubspot_deal_name text,
  hubspot_stage text,
  hubspot_stage_idx integer DEFAULT 0,
  hubspot_amount numeric(12,2),
  hubspot_close_date date,
  hubspot_last_contacted timestamp with time zone,
  hubspot_last_contact_owner text,
  hubspot_synced_at timestamp with time zone,
  company text NOT NULL,
  sector text,
  deal_id_display text,
  owner_director text,
  owner_se text,
  owner_cs text,
  owner_analytics text,
  customer_team text,
  use_case text,
  pain_points text,
  support_needs text,
  data_sources text[],
  bandset text,
  cadence text,
  aoi_link text,
  feasibility_link text,
  problem_statement text,
  objectives text[],
  aoi_geojson jsonb,
  success_criteria text[],
  next_steps text,
  commercial_model text,
  sample_aoi_geojson jsonb,
  stamp_profile jsonb DEFAULT '{}'::jsonb,
  stamp_context jsonb DEFAULT '{}'::jsonb,
  stamp_execution jsonb DEFAULT '{}'::jsonb,
  last_activity_label text,
  pipeline text,
  hubspot_stage_id text,
  owner_director_email text,
  owner_se_source text DEFAULT 'hubspot'::text,
  owner_se_updated_at timestamp with time zone,
  expertise_level text,
  app_edited_fields text[] DEFAULT '{}'::text[],
  tasked_aois jsonb DEFAULT '[]'::jsonb,
  feasibility_files jsonb DEFAULT '[]'::jsonb,
  handed_to_cs boolean DEFAULT false,
  handed_to_cs_at timestamp with time zone,
  handed_to_cs_by text,
  handed_to_analytics boolean DEFAULT false,
  handed_to_analytics_at timestamp with time zone,
  handed_to_analytics_by text,
  is_eap boolean DEFAULT false,
  archived boolean DEFAULT false,
  archived_at timestamp with time zone,
  archived_reason text,
  aoi_files jsonb DEFAULT '[]'::jsonb,
  time_of_interest jsonb DEFAULT '[]'::jsonb,
  notes_synced_at timestamp with time zone,
  aurora_workspace text,
  aurora_url text,
  commercial_legal jsonb DEFAULT '[]'::jsonb,
  imagery_priorities text[] DEFAULT '{}'::text[],
  expected_value text,
  customer_cadence text,
  handed_back_to_se boolean DEFAULT false,
  handed_back_to_se_at timestamp with time zone,
  handed_back_to_se_by text,
  handed_back_to_se_note text
);

CREATE TABLE public.action_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  task text NOT NULL,
  owner text,
  due_date date,
  done boolean DEFAULT false NOT NULL,
  done_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.activity_feed (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  author text NOT NULL,
  body text NOT NULL,
  mentions text[],
  entry_type text DEFAULT 'note'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.app_users (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'viewer'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attachments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size text,
  storage_path text,
  uploaded_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.capture_log (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  entry_date date DEFAULT CURRENT_DATE NOT NULL,
  status text NOT NULL,
  fail_reason text,
  note text,
  author text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  screenshot_path text
);

CREATE TABLE public.customer_feedback (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  feedback_date date DEFAULT CURRENT_DATE NOT NULL,
  feedback_type text DEFAULT 'Client'::text,
  satisfaction text NOT NULL,
  key_insights text,
  image_bandsets text[],
  image_ids text[],
  customer_expertise text,
  software_used text,
  follow_up_date date,
  follow_up_assigned_to text,
  supporting_files text[],
  notion_page_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  source text,
  external_ref text
);

CREATE TABLE public.deal_aois (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  aoi_type text DEFAULT 'primary'::text NOT NULL,
  name text,
  center_lat numeric(10,6),
  center_lng numeric(10,6),
  area_ha numeric(10,2),
  geojson jsonb,
  poly_svg text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.deal_collaborators (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.deal_contacts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  name text,
  role text,
  email text,
  hubspot_contact_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  hs_contact_id text
);

CREATE TABLE public.deal_pocs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'Planned'::text,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.deal_risks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  severity text DEFAULT 'med'::text,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.deal_sample_data (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.edit_roster (
  email text NOT NULL
);

CREATE TABLE public.meeting_notes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid NOT NULL,
  note_date text,
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  hs_engagement_id text
);

CREATE TABLE public.notifications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid,
  recipient text NOT NULL,
  email text,
  channel text,
  event_type text,
  payload jsonb,
  sent_at timestamp with time zone,
  status text DEFAULT 'queued'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.quality_checks (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  passport_id uuid,
  organization text NOT NULL,
  usecase text,
  priority text,
  qc_result text DEFAULT 'Awaiting QC'::text NOT NULL,
  image_id text,
  type text,
  assignee text,
  assignee_email text,
  qc_notes text,
  location text,
  mvp_image boolean DEFAULT false,
  photo_evidence_path text,
  feedback_milestone date,
  created_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  notion_page_id text,
  synced_to_notion_at timestamp with time zone,
  qc_required_by date,
  bandset text,
  ipr_info text
);

-- ---------------------------------------------------------------------------
-- Primary keys, uniques, checks
-- ---------------------------------------------------------------------------
ALTER TABLE public.action_items ADD CONSTRAINT action_items_pkey PRIMARY KEY (id);
ALTER TABLE public.activity_feed ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (id);
ALTER TABLE public.app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
ALTER TABLE public.attachments ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.capture_log ADD CONSTRAINT capture_log_pkey PRIMARY KEY (id);
ALTER TABLE public.customer_feedback ADD CONSTRAINT customer_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_aois ADD CONSTRAINT deal_aois_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_collaborators ADD CONSTRAINT deal_collaborators_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_contacts ADD CONSTRAINT deal_contacts_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_pocs ADD CONSTRAINT deal_pocs_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_risks ADD CONSTRAINT deal_risks_pkey PRIMARY KEY (id);
ALTER TABLE public.deal_sample_data ADD CONSTRAINT deal_sample_data_pkey PRIMARY KEY (id);
ALTER TABLE public.edit_roster ADD CONSTRAINT edit_roster_pkey PRIMARY KEY (email);
ALTER TABLE public.handover_passports ADD CONSTRAINT handover_passports_pkey PRIMARY KEY (id);
ALTER TABLE public.meeting_notes ADD CONSTRAINT meeting_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.quality_checks ADD CONSTRAINT quality_checks_pkey PRIMARY KEY (id);
ALTER TABLE public.app_users ADD CONSTRAINT app_users_email_key UNIQUE (email);
ALTER TABLE public.handover_passports ADD CONSTRAINT handover_passports_hubspot_deal_id_key UNIQUE (hubspot_deal_id);
ALTER TABLE public.quality_checks ADD CONSTRAINT quality_checks_qc_result_check CHECK ((qc_result = ANY (ARRAY['Pass'::text, 'Fail'::text, 'Awaiting QC'::text])));
ALTER TABLE public.quality_checks ADD CONSTRAINT quality_checks_type_check CHECK ((type = ANY (ARRAY['Sample'::text, 'Paid'::text])));

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE public.action_items ADD CONSTRAINT action_items_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.activity_feed ADD CONSTRAINT activity_feed_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.app_users ADD CONSTRAINT app_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attachments ADD CONSTRAINT attachments_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.capture_log ADD CONSTRAINT capture_log_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.customer_feedback ADD CONSTRAINT customer_feedback_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_aois ADD CONSTRAINT deal_aois_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_collaborators ADD CONSTRAINT deal_collaborators_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_contacts ADD CONSTRAINT deal_contacts_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_pocs ADD CONSTRAINT deal_pocs_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_risks ADD CONSTRAINT deal_risks_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.deal_sample_data ADD CONSTRAINT deal_sample_data_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_notes ADD CONSTRAINT meeting_notes_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE SET NULL;
ALTER TABLE public.quality_checks ADD CONSTRAINT quality_checks_passport_id_fkey FOREIGN KEY (passport_id) REFERENCES handover_passports(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_actions_passport ON public.action_items USING btree (passport_id, due_date);
CREATE INDEX idx_activity_passport ON public.activity_feed USING btree (passport_id, created_at);
CREATE INDEX idx_capture_passport ON public.capture_log USING btree (passport_id, entry_date);
CREATE UNIQUE INDEX customer_feedback_external_ref_key ON public.customer_feedback USING btree (external_ref) WHERE (external_ref IS NOT NULL);
CREATE INDEX idx_feedback_passport ON public.customer_feedback USING btree (passport_id, feedback_date);
CREATE INDEX idx_passports_hubspot ON public.handover_passports USING btree (hubspot_deal_id);
CREATE INDEX idx_passports_owner_cs ON public.handover_passports USING btree (owner_cs);
CREATE INDEX idx_passports_owner_se ON public.handover_passports USING btree (owner_se);
CREATE INDEX idx_passports_pipeline ON public.handover_passports USING btree (pipeline);
CREATE INDEX idx_passports_stage ON public.handover_passports USING btree (hubspot_stage_idx);
CREATE INDEX idx_meeting_notes_hs_eng ON public.meeting_notes USING btree (hs_engagement_id);
CREATE INDEX idx_notifications_passport ON public.notifications USING btree (passport_id, created_at);
CREATE INDEX idx_quality_checks_created ON public.quality_checks USING btree (created_at DESC);
CREATE INDEX idx_quality_checks_passport ON public.quality_checks USING btree (passport_id);

-- ---------------------------------------------------------------------------
-- Functions
-- NOTE: is_admin() hardcodes the admin email — change it when migrating.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_edit()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1 from public.edit_roster
    where email = lower(auth.jwt() ->> 'email')
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_user_name()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select full_name from public.app_users where id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select role from public.app_users where id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.app_users (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when exists (select 1 from public.edit_roster where email = lower(new.email))
         then 'member' else 'viewer' end
  )
  on conflict (id) do nothing;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select lower(auth.jwt() ->> 'email') = 'rhodri@pixxel.space';
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end; $function$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_actions_updated BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_passports_updated BEFORE UPDATE ON public.handover_passports FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capture_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_aois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_pocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_sample_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies
-- NOTE (pre-existing): handover_passports has both permissive
-- "authenticated users can read/write passports" USING (true) policies AND
-- the stricter can_edit()/is_admin() policies. Permissive policies are OR'd,
-- so the (true) pair wins — the roster policies on that table are currently
-- redundant. Worth reviewing, but reproduced here exactly as deployed.
-- ---------------------------------------------------------------------------
CREATE POLICY delete_action_items ON public.action_items FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_action_items ON public.action_items FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_action_items ON public.action_items FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_action_items ON public.action_items FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_activity_feed ON public.activity_feed FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_activity_feed ON public.activity_feed FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY read_activity_feed ON public.activity_feed FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_activity_feed ON public.activity_feed FOR UPDATE TO public USING (can_edit());
CREATE POLICY "read app_users" ON public.app_users FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "update own app_user" ON public.app_users FOR UPDATE TO public USING (((auth.uid() = id) OR is_admin()));
CREATE POLICY delete_attachments ON public.attachments FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_attachments ON public.attachments FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_attachments ON public.attachments FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_attachments ON public.attachments FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_capture_log ON public.capture_log FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_capture_log ON public.capture_log FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_capture_log ON public.capture_log FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_capture_log ON public.capture_log FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_customer_feedback ON public.customer_feedback FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_customer_feedback ON public.customer_feedback FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY read_customer_feedback ON public.customer_feedback FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_customer_feedback ON public.customer_feedback FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_deal_aois ON public.deal_aois FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_deal_aois ON public.deal_aois FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_deal_aois ON public.deal_aois FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_deal_aois ON public.deal_aois FOR UPDATE TO public USING (can_edit());
CREATE POLICY "delete collaborators" ON public.deal_collaborators FOR DELETE TO public USING (can_edit());
CREATE POLICY delete_deal_collaborators ON public.deal_collaborators FOR DELETE TO public USING (can_edit());
CREATE POLICY "insert collaborators" ON public.deal_collaborators FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY "read collaborators" ON public.deal_collaborators FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY delete_deal_contacts ON public.deal_contacts FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_deal_contacts ON public.deal_contacts FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_deal_contacts ON public.deal_contacts FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_deal_contacts ON public.deal_contacts FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_deal_pocs ON public.deal_pocs FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_deal_pocs ON public.deal_pocs FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_deal_pocs ON public.deal_pocs FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_deal_pocs ON public.deal_pocs FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_deal_risks ON public.deal_risks FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_deal_risks ON public.deal_risks FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_deal_risks ON public.deal_risks FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_deal_risks ON public.deal_risks FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_deal_sample_data ON public.deal_sample_data FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_deal_sample_data ON public.deal_sample_data FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_deal_sample_data ON public.deal_sample_data FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_deal_sample_data ON public.deal_sample_data FOR UPDATE TO public USING (can_edit());
CREATE POLICY "read roster" ON public.edit_roster FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "authenticated users can read passports" ON public.handover_passports FOR SELECT TO public USING (true);
CREATE POLICY "authenticated users can write passports" ON public.handover_passports FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "delete passports admin" ON public.handover_passports FOR DELETE TO public USING (is_admin());
CREATE POLICY "insert passports editors" ON public.handover_passports FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY "read passports auth" ON public.handover_passports FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "update passports editors" ON public.handover_passports FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_meeting_notes ON public.meeting_notes FOR DELETE TO public USING (can_edit());
CREATE POLICY insert_meeting_notes ON public.meeting_notes FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_meeting_notes ON public.meeting_notes FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_meeting_notes ON public.meeting_notes FOR UPDATE TO public USING (can_edit());
CREATE POLICY delete_notifications ON public.notifications FOR DELETE TO public USING (is_admin());
CREATE POLICY insert_notifications ON public.notifications FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY read_notifications ON public.notifications FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY update_notifications ON public.notifications FOR UPDATE TO public USING (can_edit());
CREATE POLICY "delete quality_checks" ON public.quality_checks FOR DELETE TO public USING (can_edit());
CREATE POLICY "insert quality_checks" ON public.quality_checks FOR INSERT TO public WITH CHECK (can_edit());
CREATE POLICY "read quality_checks" ON public.quality_checks FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "update quality_checks" ON public.quality_checks FOR UPDATE TO public USING (can_edit());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('passport-files', 'passport-files', true)
on conflict (id) do nothing;

CREATE POLICY "passport files delete" ON storage.objects FOR DELETE TO public USING (((bucket_id = 'passport-files'::text) AND can_edit()));
CREATE POLICY "passport files insert" ON storage.objects FOR INSERT TO public WITH CHECK (((bucket_id = 'passport-files'::text) AND can_edit()));
CREATE POLICY "passport files read" ON storage.objects FOR SELECT TO public USING (((bucket_id = 'passport-files'::text) AND (auth.role() = 'authenticated'::text)));

-- ---------------------------------------------------------------------------
-- Scheduled jobs (pg_cron)
-- The live job authorizes with a bearer key — REDACTED here because this file
-- is committed. Re-create with your project's anon key (or a cron secret):
-- ---------------------------------------------------------------------------
-- select cron.schedule(
--   'hubspot-notes-sync',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/hubspot-sync',
--     headers := jsonb_build_object('Content-Type','application/json',
--                                   'Authorization','Bearer <YOUR-ANON-KEY>'),
--     body    := '{}'::jsonb
--   );
--   $$
-- );

-- ---------------------------------------------------------------------------
-- Not captured here (dashboard-side config, re-create by hand):
--   * Auth: Google provider, redirect URLs (prod + Vercel preview wildcard)
--   * Edge Function secrets: HUBSPOT_TOKEN, SLACK_BOT_TOKEN, ...
--   * Edge Functions themselves: deployed from supabase/functions/ in this repo
-- ---------------------------------------------------------------------------

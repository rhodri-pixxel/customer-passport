-- APPLIED 20 Jul 2026 to project plspunlkmkvplgcsncpa (pixxel-customer-passport).
-- Analytics Summary gets its own record, separate from CS Summary.
-- CS and Analytics may capture similar things, but they are different teams
-- with different cadences and different notes — they must not overwrite
-- each other. Additive and nullable: safe to run on a live table, no backfill.

alter table public.handover_passports
  add column if not exists analytics_cadence text,
  add column if not exists analytics_summary text,
  add column if not exists analytics_next_steps text,
  add column if not exists stamp_analytics jsonb default '{}'::jsonb;

comment on column public.handover_passports.analytics_cadence is
  'How often the Analytics team engages this customer. Independent of customer_cadence (CS).';
comment on column public.handover_passports.analytics_summary is
  'Analytics team handover notes. Independent of the CS Summary.';
comment on column public.handover_passports.analytics_next_steps is
  'What Analytics owns next. Independent of execution.next_steps.';
comment on column public.handover_passports.stamp_analytics is
  'Last updated by/at stamp for the Analytics Summary section.';

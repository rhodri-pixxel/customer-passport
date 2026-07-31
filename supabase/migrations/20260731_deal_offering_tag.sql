-- Offering tag: what the deal covers — imagery, analytics, or both.
-- Nullable = untagged (surfaced via an "Untagged" filter so SEs can backfill).
ALTER TABLE public.handover_passports ADD COLUMN offering text;
ALTER TABLE public.handover_passports
  ADD CONSTRAINT handover_passports_offering_check
  CHECK (offering = ANY (ARRAY['imagery'::text, 'analytics'::text, 'both'::text]));
CREATE INDEX idx_passports_offering ON public.handover_passports USING btree (offering);

-- Atomic array appends for attach-feasibility.
-- The edge function previously SELECTed feasibility_files / aoi_files /
-- time_of_interest, mutated them in memory (across slow storage uploads),
-- and overwrote the whole column — so a concurrent in-app edit and the
-- automated generator could silently clobber each other's entries.
-- This RPC does every mutation inside one row-locked transaction with
-- server-side dedupe, caps, and only-if-empty scalar backfill.
-- Runs with INVOKER rights: the service-role caller (edge function)
-- bypasses RLS as before; other callers can do nothing they couldn't
-- already do via a plain UPDATE.

create or replace function public.attach_feasibility_apply(
  p_id uuid,
  p_feas_entry jsonb default null,
  p_aoi_entry jsonb default null,
  p_toi_entry jsonb default null,
  p_bandset text default null,
  p_cadence text default null,
  p_data_sources text[] default null,
  p_max int default 10
) returns jsonb
language plpgsql
as $$
declare
  res jsonb := jsonb_build_object('found', true);
begin
  -- serialise concurrent attaches / edits on this passport
  perform 1 from public.handover_passports where id = p_id for update;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  if p_feas_entry is not null then
    update public.handover_passports
      set feasibility_files = coalesce(feasibility_files, '[]'::jsonb) || jsonb_build_array(p_feas_entry)
      where id = p_id
        and jsonb_array_length(coalesce(feasibility_files, '[]'::jsonb)) < p_max;
    res := res || jsonb_build_object('feas_added', found);
  end if;

  if p_aoi_entry is not null then
    update public.handover_passports h
      set aoi_files = coalesce(h.aoi_files, '[]'::jsonb) || jsonb_build_array(p_aoi_entry)
      where h.id = p_id
        and jsonb_array_length(coalesce(h.aoi_files, '[]'::jsonb)) < p_max
        and not exists (
          select 1 from jsonb_array_elements(coalesce(h.aoi_files, '[]'::jsonb)) e
          where lower(coalesce(e->>'name','')) = lower(coalesce(p_aoi_entry->>'name','')));
    res := res || jsonb_build_object('aoi_added', found);
  end if;

  if p_toi_entry is not null then
    update public.handover_passports h
      set time_of_interest = coalesce(h.time_of_interest, '[]'::jsonb) || jsonb_build_array(p_toi_entry)
      where h.id = p_id
        and not exists (
          select 1 from jsonb_array_elements(coalesce(h.time_of_interest, '[]'::jsonb)) w
          where w->>'start' = p_toi_entry->>'start' and w->>'end' = p_toi_entry->>'end');
    res := res || jsonb_build_object('toi_added', found);
  end if;

  -- scalar backfills: only where currently empty, decided server-side
  if p_bandset is not null then
    update public.handover_passports
      set bandset = p_bandset
      where id = p_id and (bandset is null or btrim(bandset) = '');
    res := res || jsonb_build_object('bandset_set', found);
  end if;

  if p_cadence is not null then
    update public.handover_passports
      set cadence = p_cadence
      where id = p_id and (cadence is null or btrim(cadence) = '');
    res := res || jsonb_build_object('cadence_set', found);
  end if;

  if p_data_sources is not null then
    update public.handover_passports
      set data_sources = p_data_sources
      where id = p_id and (data_sources is null or cardinality(data_sources) = 0);
    res := res || jsonb_build_object('data_sources_set', found);
  end if;

  return res;
end;
$$;

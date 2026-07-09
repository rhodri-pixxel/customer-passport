# ipr-sync

> ⚠️ **DORMANT — do not schedule.** The IPR portal (`ipr-image-status.portals.pixxel.dev`)
> is not reachable from Supabase's edge network (outbound fetch times out — verify
> with `{"ping":true}`). A cron here would 504 every run. Auto-population is done
> via the in-app **Sync captured images** button, which runs in the browser (on
> Pixxel's network). This function is kept only in case IPR becomes reachable from
> Supabase later; if so, deploy + schedule per the steps below and re-test with
> `{"dry_run":true}` first.

Scheduled server-side twin of the in-app **Sync captured images** button. Pulls
newly captured, QC-ready images from the IPR portal for every active **customer**
(Closed Won or handed to CS) and creates `Awaiting QC` rows in `quality_checks`,
assigned to each deal's SE.

- **Scope:** active customers only (`hubspot_stage_idx = 5` OR `handed_to_cs`), so
  a run stays inside the edge-function time limit. Use the in-app button for
  ad-hoc syncs of any deal.
- **Match:** IPR images whose AOI/target text contains the deal's `company` name.
- **Filter:** only `Sent to Aurora` / `Datahub upload completed` (see `IPR_QC_READY_STATUSES`).
- **Assignee:** the deal's `owner_se`; if the deal has no SE the row is still
  created, just unassigned (and no Slack ping).
- **Dedup:** never inserts an `image_id` that already exists in `quality_checks`.
- **Slack:** one summary DM per SE per deal (needs `SLACK_BOT_TOKEN`).

## Deploy

```bash
supabase functions deploy ipr-sync
```

Requires these secrets (the first two are provided automatically by Supabase;
`SLACK_BOT_TOKEN` is optional and only enables the SE pings):

```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-...
```

## Schedule (nightly)

In the Supabase SQL editor (needs the `pg_cron` + `pg_net` extensions, both
available on Supabase):

```sql
select cron.schedule(
  'ipr-sync-nightly',
  '0 2 * * *',                       -- 02:00 UTC daily
  $$
  select net.http_post(
    url     := 'https://<project-ref>.functions.supabase.co/ipr-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_OR_ANON_KEY>'
    )
  );
  $$
);
```

Change the cron expression to adjust frequency. To remove it:
`select cron.unschedule('ipr-sync-nightly');`

## Keeping the SE roster in sync

`SE_ROSTER` in `index.ts` mirrors `TEAM_MEMBERS.se` in
`src/CustomerPassport.jsx`. If the SE team changes, update both.

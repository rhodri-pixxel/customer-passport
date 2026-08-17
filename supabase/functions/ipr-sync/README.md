# ipr-sync

> ⚠️ **DORMANT — do not schedule. Its behaviour is also now WRONG.**
>
> Two separate reasons, both blocking:
>
> 1. **Unreachable.** The IPR portal (`ipr-image-status.portals.pixxel.dev`) is not
>    reachable from Supabase's edge network (outbound fetch times out — verify with
>    `{"ping":true}`). A cron here would 504 every run.
>    *Re-verified 2026-08-17: `{"reachable":false,"error":"The signal has been
>    aborted","ms":10006}` — still timing out at the 10s guard. Note this is a
>    network-reach problem, not a code problem: redeploying changes nothing, and
>    it is unrelated to the separate IPR `processingStatus` 500 that WAS fixed on
>    2026-08-17. Fixing it needs IPR reachable from outside Pixxel's network, or
>    this job moved onto a host inside it.*
> 2. **Out of date.** This function still writes `Awaiting QC` rows into
>    `quality_checks` assigned to each deal's SE. That behaviour was deliberately
>    removed from the app: it flooded SE queues with images nobody chose to review,
>    using a company-name match that is unreliable by design.
>
> **Do not deploy this as-is even if IPR becomes reachable.** It would undo the
> current model. Rewrite it against `captured_images` first — see below.

## What it would need to become

The app's **Sync captured images** button now writes to `captured_images`, a
read-only feed that mirrors the IPR dashboard. Nothing lands in `quality_checks`
unless a human promotes it and names an assignee. To revive this function:

- Upsert into **`captured_images`** on `image_key` (canonical satellite+frame —
  see `normalizeImageId` in `src/CustomerPassport.jsx`), never `quality_checks`.
- Set **no assignee** and **no verdict**. Ownership only exists after promotion.
- Send **no Slack**. Nobody is on the hook for a feed row.
- Mirror `mapIprItemToCaptured` in the app so both paths produce identical rows.

## What it currently does (for reference — not the desired behaviour)

- **Scope:** active customers only (`hubspot_stage_idx = 5` OR `handed_to_cs`), so
  a run stays inside the edge-function time limit.
- **Match:** IPR images whose AOI/target text contains the deal's `company` name.
- **Filter:** only `Sent to Aurora` (see `IPR_QC_READY_STATUSES`). `Datahub
  upload completed` was dropped on 2026-08-13 — IPR has retired that status.
- **Time window:** none. It requests `page=1` with a fixed page size and passes no
  `startDate`/`endDate`, so it takes whatever that first page returns and never
  paginates — anything beyond the page size is silently dropped.
- **Assignee:** the deal's `owner_se`. ← the part that must change.
- **Dedup:** raw `image_id` string match against `quality_checks`. ← also stale;
  the app now dedups on the canonical key so the same frame can't land twice
  under two different ID spellings.
- **Slack:** one summary DM per SE per deal. ← must go.

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

# action-reminders

Daily deadline nudges for open action items. For every item that is **not done**
and due in **7 / 2 / 1 / 0 days**, the owner gets @-mentioned in
`#customer-passport` once per offset.

Unlike [`ipr-sync`](../ipr-sync/README.md) this **does** work as a scheduled job:
it only talks to Supabase and Slack, both reachable from the edge network. There
is no IPR dependency here.

- **Trigger:** `due_date` is exactly today + 7, +2, +1 or +0 (UTC).
- **Skips:** items already `done`, items with no `owner`, and any offset already
  sent for that item.
- **Idempotent:** each item records which offsets have gone out in
  `action_items.reminders_sent`. Re-running, retrying, or a double-fired cron
  cannot ping anyone twice — so it's safe to run more often than daily.
- **Failure handling:** the offset is only recorded *after* Slack accepts the
  message. If Slack errors the item is left alone and retried next run, rather
  than being silently marked as sent.
- **Owner → Slack id:** read from the `slack_roster` table, not from the app.

> ⚠️ **Keep `slack_roster` in step with the team** — it's one of **four** copies
> of the roster. See [`supabase/ROSTER.md`](../../ROSTER.md) for all four and the
> joiner/leaver checklist. Note that editing the original seed migration does
> nothing once it has run; a new person needs a new migration with an
> `INSERT … ON CONFLICT`. An owner missing from the roster still gets a reminder
> — their name appears in bold instead of a real @-mention, so it posts but
> doesn't notify them.

## Test before scheduling

Dry run reports exactly what would be sent, writes nothing and posts nothing:

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/action-reminders' \
  -H 'Authorization: Bearer <SERVICE_ROLE_OR_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"dry_run":true}'
```

Response shape:

```json
{ "ok": true, "dryRun": true, "checked": 5,
  "sent":    [{ "id": "…", "owner": "Amy Zammit", "offset": 2, "dry": true }],
  "skipped": [{ "id": "…", "offset": 0, "why": "already sent" }] }
```

## Deploy

```bash
supabase functions deploy action-reminders
```

Needs `SLACK_BOT_TOKEN` (the same secret `slack-notify` uses — if that one is
already posting, nothing more to set):

```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-...
```

## Schedule (daily)

In the Supabase SQL editor — needs the `pg_cron` and `pg_net` extensions, both
available on Supabase:

```sql
select cron.schedule(
  'action-reminders-daily',
  '0 7 * * *',                       -- 07:00 UTC daily
  $$
  select net.http_post(
    url     := 'https://<project-ref>.functions.supabase.co/action-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_OR_ANON_KEY>'
    )
  );
  $$
);
```

Pick a time that lands in the morning for most of the team — the offsets are
whole days, so the exact hour only decides when the ping arrives, not which
items qualify. To remove it: `select cron.unschedule('action-reminders-daily');`

## Notes

- Reminders go to the **`#customer-passport` channel**, not a DM — same as every
  other notification in this app. Muting that channel means missing them.
- `DEFAULT_CHANNEL` must match the one in `slack-notify/index.ts`.
- Changing an item's `due_date` does **not** clear `reminders_sent`. Pushing a
  deadline out past an offset that already fired won't re-send it. If that
  becomes a problem, clear the array when the date changes.

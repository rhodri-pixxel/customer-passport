# Team roster — the four places it lives

The Pixxel roster (name → email → Slack ID) is duplicated in **four** places.
They are not generated from each other, so a joiner or leaver has to be applied
to all four or things fail quietly.

| # | Location | What it drives | How it updates |
| - | -------- | -------------- | -------------- |
| 1 | `src/CustomerPassport.jsx` → `TEAM_MEMBERS` | Every dropdown, @-mention and notification in the app. **The source of truth** — the other three mirror it. | Edit + push (Vercel) |
| 2 | `supabase/functions/ipr-sync/index.ts` → `SE_ROSTER` | Nightly IPR sync assigning new captures to the deal's SE and pinging them | Edit + `supabase functions deploy ipr-sync` |
| 3 | `supabase/functions/hubspot-sync/index.ts` → `ROSTER_NAME_BY_EMAIL` + `SLACK_ID_BY_NAME` | Resolving HubSpot deal owners to clean names, and @-mentions on sync | Edit + `supabase functions deploy hubspot-sync` |
| 4 | `slack_roster` **table** | `action-reminders` (a scheduled job can't read the browser constant) | **New migration** with an `INSERT … ON CONFLICT` |

Edge functions and the browser can't share a constant — the app's roster only
exists in the bundle, and a cron job has no bundle. Hence the copies.

## Adding someone

1. **`TEAM_MEMBERS`** in `src/CustomerPassport.jsx`, under their team
   (`owner` = Sales, `se`, `cs`, `analytics`). Only members of a team are
   pickable for that role.
2. **`SE_ROSTER`** in `ipr-sync/index.ts` — SEs only.
3. **Both maps** in `hubspot-sync/index.ts` — email→name *and* name→Slack ID.
   Add every email alias HubSpot might use (see Shridutta / Usha for the pattern).
4. **A new migration** for `slack_roster`. Do **not** edit
   `20260806_action_item_reminders.sql` — it has already run, so editing it
   changes nothing in the database:

   ```sql
   INSERT INTO public.slack_roster (name, email, slack) VALUES
     ('New Person', 'new.person@pixxel.space', 'U0XXXXXXXXX')
   ON CONFLICT (name) DO UPDATE
     SET email = excluded.email, slack = excluded.slack;
   ```

Then run the migration and deploy the two edge functions. Pushing to `main`
deploys only the Vercel app — **edge functions are a separate deploy**.

## Removing someone

Same four places. Leaving a departed person in `TEAM_MEMBERS` keeps them in
every assignment dropdown; removing them from `slack_roster` while deals still
name them means reminders post without an @-mention.

## Finding a Slack ID

Slack profile → **⋮ (More)** → *Copy member ID*. Format `U…`. A missing ID is
survivable everywhere — the person's name renders as plain text instead of a
mention, so the message posts but doesn't notify them.

## Checking for drift

Run from the repo root. Match the full roster line shape — a looser `name: "…"`
also catches the mock contacts and attachments elsewhere in the file.

```bash
# 1. app roster (the source of truth)
grep -oE '\{ name: "[^"]+", email: "[^"]*", slack: [^}]+\}' src/CustomerPassport.jsx \
  | sed 's/{ name: "//;s/", email.*//' | sort -u > /tmp/app.txt

# 2. vs hubspot-sync's name -> Slack map
grep -oE '"[A-Z][^"]+":"U[A-Z0-9]+"' supabase/functions/hubspot-sync/index.ts \
  | sed 's/":"U.*//;s/^"//' | sort -u > /tmp/hs.txt
comm -23 /tmp/app.txt /tmp/hs.txt      # expect only people whose slack is null

# 3. vs ipr-sync's SE roster
sed -n '/^  se: \[/,/^  \],/p' src/CustomerPassport.jsx \
  | grep -oE 'name: "[^"]+"' | sed 's/name: "//;s/"//' | sort > /tmp/appse.txt
grep -oE '^  "[^"]+": \{ email' supabase/functions/ipr-sync/index.ts \
  | sed 's/^  "//;s/": { email//' | sort > /tmp/iprse.txt
diff /tmp/appse.txt /tmp/iprse.txt      # expect no output

# 4. vs the slack_roster seed (plus any later INSERT migrations)
grep -ohE "^  \('[^']+'" supabase/migrations/*.sql \
  | sed "s/^  ('//;s/'//" | sort -u > /tmp/seed.txt
comm -23 /tmp/app.txt /tmp/seed.txt     # expect no output
```

A person with `slack: null` legitimately shows up in check 2 — they have no ID
to map. Everything else is drift.

That check is how Archita Dey turned up missing from `hubspot-sync` on
2026-08-09, three days after being added everywhere else.

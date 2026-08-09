# Team roster — the four places it lives (plus edit access)

> **Do this first for any joiner: add their email to the `edit_roster` table.**
> It is separate from everything below, has no seed in this repo, and is the
> difference between a working app and a broken one — see [Edit access](#edit-access-the-one-that-actually-breaks-things).


The Pixxel roster (name → email → Slack ID) is duplicated in **four** places.
They are not generated from each other, so a joiner or leaver has to be applied
to all four or things fail quietly.

| # | Location | What it drives | How it updates |
| - | -------- | -------------- | -------------- |
| 1 | `src/CustomerPassport.jsx` → `TEAM_MEMBERS` | Every dropdown, @-mention and notification in the app. **The source of truth** — the other three mirror it. | Edit + push (Vercel) |
| 2 | `supabase/functions/ipr-sync/index.ts` → `SE_ROSTER` | Nightly IPR sync assigning new captures to the deal's SE and pinging them | Edit + `supabase functions deploy ipr-sync` |
| 3 | `supabase/functions/hubspot-sync/index.ts` → **three** lists: `SE_EMAILS`, `ROSTER_NAME_BY_EMAIL`, `SLACK_ID_BY_NAME` | `SE_EMAILS` decides who fills the SE slot vs "Additional People" when syncing HubSpot's PSE field; the other two resolve owners to clean names and @-mentions | Edit + `supabase functions deploy hubspot-sync` |
| 4 | `slack_roster` **table** | `action-reminders` (a scheduled job can't read the browser constant) | **New migration** with an `INSERT … ON CONFLICT` |

Edge functions and the browser can't share a constant — the app's roster only
exists in the bundle, and a cron job has no bundle. Hence the copies.

## Adding someone

0. **`edit_roster`** — the SQL insert under [Edit access](#edit-access-the-one-that-actually-breaks-things).
   Do this one first; skipping it is the only step that leaves a visibly broken app.
1. **`TEAM_MEMBERS`** in `src/CustomerPassport.jsx`, under their team
   (`owner` = Sales, `se`, `cs`, `analytics`). Only members of a team are
   pickable for that role.
2. **`SE_ROSTER`** in `ipr-sync/index.ts` — SEs only.
3. **All three lists** in `hubspot-sync/index.ts` — `SE_EMAILS` (SEs only, near
   the top of the file, easy to miss because it's ~890 lines above the other
   two), then email→name and name→Slack ID. Add every email alias HubSpot might
   use (see Shridutta / Usha for the pattern).
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

## Edit access — the one that actually breaks things

`TEAM_MEMBERS` decides what the **UI** lets someone do. The **database** decides
separately, via `can_edit()`, which reads the `edit_roster` table:

```sql
select exists (select 1 from public.edit_roster
               where email = lower(auth.jwt() ->> 'email'));
```

`edit_roster` has no seed in this repo — it is maintained by hand. So the two
gates can disagree, and the failure mode depends on which way:

| In `TEAM_MEMBERS` | In `edit_roster` | What they see |
| --- | --- | --- |
| ✅ | ✅ | Working app |
| ❌ | — | Read-only banner + "Request edit access" button. Honest and self-explaining. |
| ✅ | ❌ | **The bad one.** Full edit UI, every save fails with a raw `Save failed: 401/403…` toast. Looks like the app is broken, not like a permissions problem. |

Adding someone to `TEAM_MEMBERS` without adding them to `edit_roster` puts them
in that third row. Run this in the SQL editor as part of onboarding:

```sql
INSERT INTO public.edit_roster (email) VALUES ('new.person@pixxel.space')
ON CONFLICT (email) DO NOTHING;

-- Check who currently has edit rights
SELECT email FROM public.edit_roster ORDER BY email;
```

Emails are compared lowercased — store them lowercase.

## Removing someone

Same four places, plus `DELETE FROM public.edit_roster WHERE email = '…'` —
that's the one that actually revokes write access, and it should go first.
Leaving a departed person in `TEAM_MEMBERS` keeps them in every assignment
dropdown; removing them from `slack_roster` while deals still name them means
reminders post without an @-mention.

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

# 5. SE emails: app se team vs hubspot-sync's SE_EMAILS
sed -n '/^  se: \[/,/^  \],/p' src/CustomerPassport.jsx \
  | grep -oE 'email: "[^"]+"' | sed 's/email: "//;s/"//' | sort > /tmp/appse_mail.txt
sed -n '/^const SE_EMAILS = new Set(\[/,/^\]);/p' supabase/functions/hubspot-sync/index.ts \
  | grep -oE '"[^"]+"' | tr -d '"' | sort > /tmp/hsse_mail.txt
diff /tmp/appse_mail.txt /tmp/hsse_mail.txt   # expect no output
```

A person with `slack: null` legitimately shows up in check 2 — they have no ID
to map. Everything else is drift.

That check is how Archita Dey turned up missing from `hubspot-sync` on
2026-08-09, three days after being added everywhere else.

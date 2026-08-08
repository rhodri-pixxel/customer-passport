# slack-notify

Posts formatted messages to **#customer-passport** on Slack. Called from the app
(`sendSlackNotification` in `src/CustomerPassport.jsx`), never directly by a user.

## Deploy

```bash
supabase functions deploy slack-notify
```

**This is a separate deploy from the app.** Pushing to `main` ships the React app
to Vercel; it does *not* touch edge functions. If the app starts sending a new
event type and the function hasn't been redeployed, that notification type stops
working — which is exactly how QC assignment pings went missing for weeks.

Needs the `SLACK_BOT_TOKEN` secret set on the project.

## Events

| `event`                        | Message                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `assignment`                   | Someone assigned to a role on a deal                            |
| `deal_summary` / `notify_all`  | Deal snapshot — stage, ACV, readiness, owners                   |
| `mention`                      | One person @-mentioned, with the note text                      |
| `collaborator`                 | Someone added as an additional contact                          |
| `image_update` / `qc_assignment` | An image / QC entry assigned, updated or completed            |
| *anything else*                | Generic fallback that says the event wasn't recognised          |

An unknown event no longer throws. A 500 here is invisible to whoever pressed
Save, so a generic message that says "this function may need redeploying" beats
silence every time.

## `image_update`

One post per change, mentioning **every recipient together** rather than a
message each — `#customer-passport` is shared, and four near-identical pings for
the same image teaches people to mute it.

The app decides who is on it: the entry's assignee plus the linked deal's owners
for each role in `IMAGE_NOTIFY_ROLES` (`src/CustomerPassport.jsx`). That is
currently **SE and CS only** — sales directors and analytics are deliberately
left off. Adding a role is a one-line change there; this function needs no edit.

Payload:

```jsonc
{
  "event": "image_update",
  "action": "assigned" | "updated" | "completed",
  "recipients": [{ "name": "Amy Zammit", "slack": "U050FJYSEUU" }],
  "actor": "Amy Zammit",              // who pressed Save
  "company": "Acme Corp",
  "image_id": "FF03 4320",
  "usecase": "Forest Monitoring",
  "bandset": "Vegetation",
  "qc_result": "Pass",
  "assignee": "Amy Zammit",
  "date_captured": "2026-08-01",
  "se_qc_completed_on": "2026-08-08",
  "qc_notes": "…",
  "changes": "• QC result: Awaiting QC → Pass\n• QC notes updated",
  "passport_id": "<uuid>"             // becomes the deep link to the passport
}
```

`changes` is what makes a "Save changes" ping worth opening — without it every
edit reads identically. The app builds it with `qcChangeSummary()`.

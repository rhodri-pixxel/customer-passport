// action-reminders — daily deadline nudges for open action items.
//
// Runs on a schedule (see README). For every action item that is still open and
// due in 7 / 2 / 1 / 0 days, @-mentions the owner in Slack once per offset.
//
// Unlike ipr-sync this genuinely works as a cron: it only talks to Supabase and
// Slack, both reachable from the edge network. Nothing here touches IPR.
//
// Idempotent by design. Each item records which offsets it has already sent in
// action_items.reminders_sent, so a re-run, a retry, or a double-fired cron
// can't ping anyone twice. Run it as often as you like.
//
// POST body (all optional):
//   { "dry_run": true }   report what would be sent, write nothing, post nothing
//
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SLACK_API = "https://slack.com/api/chat.postMessage";
const DEFAULT_CHANNEL = "C0BB1DC6LNB"; // #customer-passport — must match slack-notify
const APP_BASE_URL = "https://customer-passport.vercel.app";

// Days before the due date that trigger a nudge. 0 = due today.
const OFFSETS = [7, 2, 1, 0];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// YYYY-MM-DD for "today + n days", in UTC to match the date column.
function dayOffset(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mention(name: string, slack: string | null): string {
  return slack ? `<@${slack}>` : `*${name}*`;
}

function reminderMessage(item: any, offset: number, slack: string | null, company: string, dealUrl: string | null) {
  const when = offset === 0 ? "*today*"
    : offset === 1 ? "*tomorrow*"
    : `in *${offset} days*`;
  const urgency = offset === 0 ? "🔴" : offset === 1 ? "🟠" : offset === 2 ? "🟡" : "🗓️";
  const deal = dealUrl ? `<${dealUrl}|${company}>` : `*${company}*`;
  return {
    text: `Action item due ${offset === 0 ? "today" : `in ${offset} day(s)`}: ${item.task}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${urgency} ${mention(item.owner, slack)} — action item due ${when} on ${deal}`,
        },
      },
      { type: "section", text: { type: "mrkdwn", text: `> ${item.task}` } },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Due ${item.due_date}` }],
      },
      { type: "divider" },
    ],
  };
}

async function postToSlack(token: string, message: any) {
  const res = await fetch(SLACK_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: DEFAULT_CHANNEL, ...message }),
  });
  const data = await res.json();
  return data.ok ? { ok: true } : { ok: false, error: data.error };
}

serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const slackToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!slackToken) throw new Error("SLACK_BOT_TOKEN secret not set");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let dryRun = false;
    try { dryRun = !!(await req.json())?.dry_run; } catch (_) { /* no body */ }

    // One date per offset; a single query covers all four.
    const dates = OFFSETS.map(dayOffset);
    const { data: items, error } = await sb
      .from("action_items")
      .select("id, passport_id, task, owner, due_date, reminders_sent")
      .eq("done", false)
      .in("due_date", dates);
    if (error) throw new Error(`action_items: ${error.message}`);

    const { data: roster } = await sb.from("slack_roster").select("name, slack");
    const slackByName: Record<string, string | null> = {};
    for (const r of roster || []) slackByName[r.name] = r.slack;

    // Company names for the deal link, fetched once for the passports involved.
    const passportIds = [...new Set((items || []).map((i: any) => i.passport_id).filter(Boolean))];
    const companyById: Record<string, string> = {};
    if (passportIds.length) {
      const { data: deals } = await sb
        .from("handover_passports").select("id, company").in("id", passportIds);
      for (const d of deals || []) companyById[d.id] = d.company;
    }

    const sent: any[] = [];
    const skipped: any[] = [];

    for (const item of items || []) {
      const offset = OFFSETS[dates.indexOf(item.due_date)];
      if (offset === undefined) continue;
      const already: number[] = item.reminders_sent || [];
      if (already.includes(offset)) { skipped.push({ id: item.id, offset, why: "already sent" }); continue; }
      if (!item.owner) { skipped.push({ id: item.id, offset, why: "no owner" }); continue; }

      const slack = slackByName[item.owner] ?? null;
      const company = companyById[item.passport_id] || "a deal";
      const dealUrl = item.passport_id ? `${APP_BASE_URL}/?deal=${item.passport_id}` : null;

      if (dryRun) { sent.push({ id: item.id, owner: item.owner, offset, dry: true }); continue; }

      const res = await postToSlack(slackToken, reminderMessage(item, offset, slack, company, dealUrl));
      if (!res.ok) { skipped.push({ id: item.id, offset, why: `slack: ${res.error}` }); continue; }

      // Only record the offset once Slack has accepted it, so a failure retries
      // on the next run rather than being silently marked as done.
      await sb.from("action_items")
        .update({ reminders_sent: [...already, offset] })
        .eq("id", item.id);

      sent.push({ id: item.id, owner: item.owner, offset });
    }

    return new Response(JSON.stringify({ ok: true, dryRun, checked: (items || []).length, sent, skipped }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  } catch (e) {
    console.error("action-reminders error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e && (e as any).message) || String(e) }), {
      status: 500, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }
});

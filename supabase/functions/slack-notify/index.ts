// supabase/functions/slack-notify/index.ts
// Deploy: supabase functions deploy slack-notify
// Sends formatted messages to #customer-passport on Slack.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SLACK_API = "https://slack.com/api/chat.postMessage";
const DEFAULT_CHANNEL = "C0BB1DC6LNB"; // #customer-passport
const APP_BASE_URL = "https://customer-passport.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Render a person as a Slack @-mention if we have their Slack ID, else plain name
function mention(name, slackId) {
  return slackId ? `<@${slackId}>` : (name || "");
}

function assignmentMessage(p) {
  const acv = p.amount ? `$${(p.amount / 1000).toFixed(0)}k` : "TBD";
  const who = mention(p.person, p.person_slack);
  const deal = p.deal_url ? `<${p.deal_url}|${p.company}>` : `*${p.company}*`;
  const openCta = p.deal_url ? `Open the <${p.deal_url}|Customer Passport>` : "Open the Customer Passport";
  return {
    text: `${p.person} assigned as ${p.role} on ${p.company}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "🛰️ New Assignment — Customer Passport", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `${who} has been assigned as *${p.role}* on ${deal}` } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Deal ID*\n${p.dealId}` },
        { type: "mrkdwn", text: `*Stage*\n${p.stage}` },
        { type: "mrkdwn", text: `*ACV*\n${acv}` },
        { type: "mrkdwn", text: `*Handover Readiness*\n${p.readiness}%` },
      ]},
      { type: "context", elements: [
        { type: "mrkdwn", text: `Assigned by ${p.assignedBy} · ${openCta} to view the full briefing` },
      ]},
      { type: "divider" },
    ],
  };
}

function dealSummaryMessage(p) {
  const acv = p.amount ? `$${(p.amount / 1000).toFixed(0)}k` : "TBD";
  const o = p.owners || {};
  const ownerLines = [
    o.owner     ? `• Sales Owner: ${o.owner}` : null,
    o.se        ? `• Sales Engineering: ${o.se}` : null,
    o.cs        ? `• Customer Success: ${o.cs}` : null,
    o.analytics ? `• Analytics: ${o.analytics}` : null,
  ].filter(Boolean).join("\n");

  return {
    text: `Deal update — ${p.company}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🌍 Deal Update — ${p.company}`, emoji: true } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Stage*\n${p.stage}` },
        { type: "mrkdwn", text: `*ACV*\n${acv}` },
        { type: "mrkdwn", text: `*Readiness*\n${p.readiness}%` },
        { type: "mrkdwn", text: `*Deal ID*\n${p.dealId}` },
      ]},
      { type: "section", text: { type: "mrkdwn", text: `*Owners*\n${ownerLines || "_None assigned_"}` } },
      { type: "context", elements: [
        { type: "mrkdwn", text: `Posted by ${p.postedBy} from the ${p.deal_url ? `<${p.deal_url}|Customer Passport>` : "Customer Passport"}` },
      ]},
      { type: "divider" },
    ],
  };
}

function mentionMessage(p) {
  const who = mention(p.mentionedPerson, p.mentioned_slack);
  // Link the deal name to its passport when a deal_url is provided; otherwise
  // fall back to the plain bold name (keeps older callers working).
  const deal = p.deal_url ? `<${p.deal_url}|${p.company}>` : `*${p.company}*`;
  return {
    text: `${p.mentionedPerson} mentioned on ${p.company}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `👋 ${who} — you were mentioned by *${p.mentionedBy}* on ${deal} (${p.dealId})` } },
      { type: "section", text: { type: "mrkdwn", text: `> ${p.noteText}` } },
      { type: "divider" },
    ],
  };
}

function collaboratorMessage(p) {
  const who = mention(p.person, p.person_slack);
  const deal = p.deal_url ? `<${p.deal_url}|${p.company}>` : `*${p.company}*`;
  return {
    text: `${p.person} added as an additional contact on ${p.company}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `👋 ${who} — you've been added as an additional contact on ${deal}` } },
      ...(p.addedBy ? [{ type: "context", elements: [{ type: "mrkdwn", text: `Added by ${p.addedBy}` }] }] : []),
      { type: "divider" },
    ],
  };
}

async function postToSlack(token, channelId, message) {
  const res = await fetch(SLACK_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelId, ...message }),
  });
  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.error };
  return { ok: true, ts: data.ts };
}

serve(async function(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const slackToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!slackToken) throw new Error("SLACK_BOT_TOKEN secret not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const body = await req.json();
    const event = body.event;
    // Deep-link to the deal's passport. Built from passport_id (canonical prod URL)
    // so EVERY notification links the deal, regardless of which caller sent it.
    body.deal_url = body.passport_id ? `${APP_BASE_URL}/?deal=${body.passport_id}` : (body.deal_url || null);
    // Always post to #customer-passport regardless of any channel_id passed in
    const targetChannel = DEFAULT_CHANNEL;

    let message;
    if (event === "assignment") {
      message = assignmentMessage(body);
    } else if (event === "deal_summary" || event === "notify_all") {
      message = dealSummaryMessage(body);
    } else if (event === "mention") {
      message = mentionMessage(body);
    } else if (event === "collaborator") {
      message = collaboratorMessage(body);
    } else {
      throw new Error("Unknown event type: " + event);
    }

    const result = await postToSlack(slackToken, targetChannel, message);

    if (body.passport_id) {
      await supabase.from("notifications").insert({
        passport_id: body.passport_id,
        recipient: body.person || body.postedBy || "team",
        channel: "slack",
        event_type: event,
        payload: body,
        sent_at: result.ok ? new Date().toISOString() : null,
        status: result.ok ? "sent" : "failed",
      });
    }

    return new Response(JSON.stringify(result), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  } catch (e) {
    console.error("slack-notify error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e && e.message) || String(e) }), {
      status: 500, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }
});

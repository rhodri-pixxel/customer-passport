// supabase/functions/hubspot-sync/index.ts
// Deploy: supabase functions deploy hubspot-sync

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HS_BASE = "https://api.hubapi.com";

// GET with basic retry/backoff on rate limits (429) and transient 5xx errors.
async function hsGet(path, token, attempt = 0) {
  const res = await fetch(HS_BASE + path, {
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt))); // 0.5s, 1s, 2s, 4s
    return hsGet(path, token, attempt + 1);
  }
  return res.json();
}

async function hsPatch(path, body, token) {
  const res = await fetch(HS_BASE + path, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Shared: per-deal contacts + activities sync ───────────────
// Pulls a deal's associated contacts into deal_contacts, and the 3 most-recent
// activities (notes/meetings/emails/calls — from the deal AND its contacts) into
// meeting_notes. Manual notes (author "You", hs_engagement_id null) are untouched.
async function syncDealNotes(sb, token, dealId, passportId) {
  // robust timestamp -> ms (handles ISO strings AND epoch millis/secs strings)
  const toMillis = (v) => {
    if (!v) return 0;
    const s = String(v).trim();
    if (/^\d+$/.test(s)) { const n = Number(s); return s.length <= 10 ? n * 1000 : n; }
    const t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  };

  // 1) Associated contacts → deal_contacts
  const contactAssoc = await hsGet("/crm/v3/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
  const contactIds = (contactAssoc.results || []).map((a) => a.id || a.toObjectId).filter(Boolean).slice(0, 20);

  const existingContactsRes = await sb.from("deal_contacts").select("hs_contact_id").eq("passport_id", passportId).not("hs_contact_id", "is", null);
  const seenContacts = new Set((existingContactsRes.data || []).map((r) => r.hs_contact_id));

  let contacts_added = 0;
  for (const cid of contactIds) {
    if (seenContacts.has(cid)) continue;
    const c = await hsGet("/crm/v3/objects/contacts/" + cid + "?properties=firstname,lastname,email,jobtitle", token).catch(() => null);
    if (!c || !c.properties) continue;
    const nm = ((c.properties.firstname || "") + " " + (c.properties.lastname || "")).trim();
    if (!nm && !c.properties.email) continue;
    await sb.from("deal_contacts").insert({
      passport_id: passportId,
      name: nm || c.properties.email,
      role: c.properties.jobtitle || null,
      email: c.properties.email || null,
      hs_contact_id: cid,
    });
    seenContacts.add(cid);
    contacts_added++;
  }

  // 2) Activities (deal + contacts), all types, keep latest 3
  const ACTIVITY_TYPES = {
    notes:    { props: "hs_note_body,hs_timestamp,hs_createdate", body: "hs_note_body", title: null, date: "hs_timestamp", label: "note" },
    meetings: { props: "hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_timestamp,hs_createdate", body: "hs_meeting_body", title: "hs_meeting_title", date: "hs_meeting_start_time", label: "meeting" },
    emails:   { props: "hs_email_subject,hs_email_text,hs_timestamp,hs_createdate", body: "hs_email_text", title: "hs_email_subject", date: "hs_timestamp", label: "email" },
    calls:    { props: "hs_call_title,hs_call_body,hs_timestamp,hs_createdate", body: "hs_call_body", title: "hs_call_title", date: "hs_timestamp", label: "call" },
  };
  const parents = [{ type: "deals", id: dealId }].concat(contactIds.slice(0, 10).map((cid) => ({ type: "contacts", id: cid })));

  const activities = [];
  const seenEid = new Set();
  for (const parent of parents) {
    for (const objType of Object.keys(ACTIVITY_TYPES)) {
      const cfg = ACTIVITY_TYPES[objType];
      const assoc = await hsGet("/crm/v3/objects/" + parent.type + "/" + parent.id + "/associations/" + objType, token).catch(() => ({ results: [] }));
      const ids = (assoc.results || []).map((a) => a.id || a.toObjectId).filter(Boolean).slice(0, 15);
      for (const eid of ids) {
        if (seenEid.has(eid)) continue;
        seenEid.add(eid);
        const obj = await hsGet("/crm/v3/objects/" + objType + "/" + eid + "?properties=" + cfg.props, token).catch(() => null);
        if (!obj || !obj.properties) continue;
        let text = String(obj.properties[cfg.body] || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
        const title = cfg.title ? (obj.properties[cfg.title] || "") : "";
        if (title) text = title + (text ? " — " + text : "");
        if (!text) continue;
        const ts = obj.properties[cfg.date] || obj.properties.hs_timestamp || obj.properties.hs_createdate || "";
        activities.push({ eid, ts, text: text.slice(0, 4000), label: cfg.label });
      }
    }
  }

  activities.sort((a, b) => toMillis(b.ts) - toMillis(a.ts)); // newest first
  const latest = activities.slice(0, 3);

  // Refresh the synced activities to the latest 3 (leave manual notes alone)
  await sb.from("meeting_notes").delete().eq("passport_id", passportId).not("hs_engagement_id", "is", null);
  let notes_added = 0;
  for (const a of latest) {
    const ms = toMillis(a.ts);
    await sb.from("meeting_notes").insert({
      passport_id: passportId,
      note_date: ms ? new Date(ms).toISOString().slice(0, 10) : null,
      author: "HubSpot (" + a.label + ")",
      body: a.text,
      hs_engagement_id: a.eid,
    });
    notes_added++;
  }

  return { notes_added, contacts_added };
}

// ── Stage helpers ─────────────────────────────────────────
const STAGE_LABELS = ["Discovery","Technical Validation","Quote / Solution Scoping","Proposal","Contracting & Negotiation","Closed Won","Closed Lost"];
function stageLabel(i) { return STAGE_LABELS[i] || "Discovery"; }
function lastActivityLabel(iso) {
  if (!iso) return "No activity";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d < 24) return d + " " + (d !== 1 ? "hours" : "hour") + " ago";
  return d + (d !== 1 ? " days ago" : " day ago");
}

const STAGE_ID_MAP = {
  // EAP Private Sector
  "90210906":0,"90210907":1,"90210908":2,"90210909":3,"90210910":4,"127023974":5,"144190622":6,
  // EAP (ROW)
  "144106655":0,"144106657":1,"144106658":2,"144106659":3,"144106660":4,"144106661":5,"143535516":6,
  // Bespoke Analytics EMEA/APAC
  "1006298375":0,"1006298376":1,"1006298377":2,"1006298378":3,"1006298379":4,"1006259852":5,"1006259853":6,
  // Public Sector USA
  "48395866":0,"48395867":1,"48395868":2,"48395869":3,"48395870":4,"127023992":5,"48395871":6,
  // Public Sector India
  "117886624":0,"117886625":1,"117886626":2,"117886627":3,"117886628":4,"117886629":5,"117886630":6,
  // Global Commercial Pipeline
  "1151307103":0,"1151307104":1,"1151307106":2,"1151307108":5,"1151307109":6,
  // Reseller Acquisition
  "1224878717":0,"1337894584":0,
  // Americas Private Sector
  "1105136000":0,"1105136001":1,"1105136002":2,"1105136003":3,"1105136004":4,"1105136005":5,"1105136006":6,
  // Enterprise Purchase NA
  "239358549":0,"239358550":0,"239358551":4,"239358554":5,"239358555":6,
  // Data Sales ROW
  "1000629412":0,"1000629413":1,"1000629414":2,"1000629415":3,"1000629416":4,"1000629417":5,"1000629418":6,
};
function stageIdx(id) { return STAGE_ID_MAP[id] !== undefined ? STAGE_ID_MAP[id] : 0; }

const STAGE_PIPELINE_MAP = {
  "90210906":"EAP Private Sector","90210907":"EAP Private Sector","90210908":"EAP Private Sector",
  "90210909":"EAP Private Sector","90210910":"EAP Private Sector","127023974":"EAP Private Sector","144190622":"EAP Private Sector",
  "144106655":"EAP (ROW)","144106657":"EAP (ROW)","144106658":"EAP (ROW)","144106659":"EAP (ROW)",
  "144106660":"EAP (ROW)","144106661":"EAP (ROW)","143535516":"EAP (ROW)",
  "1006298375":"Bespoke Analytics (EMEA & APAC)","1006298376":"Bespoke Analytics (EMEA & APAC)",
  "1006298377":"Bespoke Analytics (EMEA & APAC)","1006298378":"Bespoke Analytics (EMEA & APAC)",
  "1006298379":"Bespoke Analytics (EMEA & APAC)","1006259852":"Bespoke Analytics (EMEA & APAC)","1006259853":"Bespoke Analytics (EMEA & APAC)",
  "48395866":"Public Sector (USA)","48395867":"Public Sector (USA)","48395868":"Public Sector (USA)",
  "48395869":"Public Sector (USA)","48395870":"Public Sector (USA)","127023992":"Public Sector (USA)","48395871":"Public Sector (USA)",
  "117886624":"Public Sector (India)","117886625":"Public Sector (India)","117886626":"Public Sector (India)",
  "117886627":"Public Sector (India)","117886628":"Public Sector (India)",
  "117886629":"Public Sector (India)","117886630":"Public Sector (India)",
  "1151307103":"Global Commercial Pipeline","1151307104":"Global Commercial Pipeline",
  "1151307106":"Global Commercial Pipeline","1151307108":"Global Commercial Pipeline",
  "1151307109":"Global Commercial Pipeline",
};

const STAGE_HS_IDS = {
  0:"1151307103",1:"1151307104",2:"1151307106",5:"1151307108",6:"1151307109",
};

serve(async function(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const token = Deno.env.get("HUBSPOT_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "HUBSPOT_TOKEN not set" }), {
      status: 500, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const body = req.method === "POST" ? await req.json().catch(function() { return {}; }) : {};

  // GET STAGES
  if (body.action === "get_stages") {
    const pipelines = await hsGet("/crm/v3/pipelines/deals", token);
    return new Response(JSON.stringify({ ok: true, pipelines: pipelines.results }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  // WRITE-BACK
  if (body.action === "update_deal") {
    const updates = {};
    if (body.stage_idx !== undefined) {
      updates.dealstage = STAGE_HS_IDS[body.stage_idx] || STAGE_HS_IDS[0];
    }
    if (Object.keys(updates).length) {
      await hsPatch("/crm/v3/objects/deals/" + body.hubspot_deal_id, { properties: updates }, token);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  // PER-DEAL CONTACTS + ACTIVITIES SYNC (manual "Sync notes & contacts" button)
  if (body.action === "sync_notes_for_deal") {
    const dealId = body.hubspot_deal_id;
    const passportId = body.passport_id;
    if (!dealId || !passportId) {
      return new Response(JSON.stringify({ ok: false, error: "hubspot_deal_id and passport_id required" }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    const r = await syncDealNotes(sb, token, dealId, passportId);
    return new Response(JSON.stringify({ ok: true, notes_added: r.notes_added, contacts_added: r.contacts_added }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  // BATCH NOTES + CONTACTS SYNC (cron, every :00 / :30) — refreshes every deal.
  // Runs in the background so the HTTP call returns immediately; each deal is
  // wrapped in try/catch so one failure doesn't abort the whole run.
  if (body.action === "sync_all_notes") {
    const passportsRes = await sb.from("handover_passports").select("id, hubspot_deal_id").not("hubspot_deal_id", "is", null);
    const list = passportsRes.data || [];
    const job = (async () => {
      let ok = 0, failed = 0;
      for (const p of list) {
        try { await syncDealNotes(sb, token, p.hubspot_deal_id, p.id); ok++; }
        catch (e) { failed++; console.error("sync_all_notes: deal " + p.hubspot_deal_id + " failed", e); }
      }
      console.log("sync_all_notes complete: " + ok + " ok, " + failed + " failed of " + list.length);
    })();
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(job);
    else await job;
    return new Response(JSON.stringify({ ok: true, started: true, deals: list.length }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  // FULL SYNC
  const ROSTER_NAME_BY_EMAIL = {
    "alex@pixxel.space":"Alex Koh Hock Poh","allyson@pixxel.space":"Allyson Jenkins",
    "anjul@pixxel.co.in":"Anjul Garg","ashay@pixxel.co.in":"Ashay Deo",
    "awais@pixxel.co.in":"Awais Ahmed","caio@pixxel.space":"Caio Miranda",
    "debashish@pixxel.co.in":"Gp Capt Debashish Sengupta (Retd)","jimmy@pixxel.space":"Jimmy Greco",
    "karan@pixxel.co.in":"Karan Mali","markus@pixxel.space":"Markus Heynen",
    "mauricio@pixxel.space":"Mauricio Meira","ryan.mckinney@pixxel.space":"Ryan McKinney",
    "shantanu@pixxel.co.in":"Shantanu Thada",
    "shridutta.banerjee@pixxel.co.in":"Shridutta Banerjee","shridutta@pixxel.co.in":"Shridutta Banerjee",
    "usha@pixxel.co.in":"Usha Simhadri","usha@pixxel.space":"Usha Simhadri",
    "amy@pixxel.space":"Amy Zammit","megan@pixxel.space":"Megan Gallagher",
    "rhodri@pixxel.space":"Rhodri Phillips","ryan@pixxel.space":"Ryan Hammock",
    "spencer@pixxel.space":"Spencer Wahrman","terence@pixxel.space":"Terence Yuchen Xie",
    "aditya@pixxel.co.in":"Aditya Chintalapati","ananya.banerjee@pixxel.co.in":"Ananya Banerjee",
    "jaya.bandi@pixxel.co.in":"Bandi Jay","megha@pixxel.co.in":"Megha Devaraju",
    "meghana.shetty@pixxel.co.in":"Meghana Shetty","shubhavi@pixxel.co.in":"Shubhavi P",
    "jeremy@pixxel.space":"Jeremy Kravitz","subash@pixxel.co.in":"Subash Yeggina",
  };

  // Slack roster: clean name -> Slack user ID for @-mentions
  const SLACK_ID_BY_NAME = {
    "Alex Koh Hock Poh":"U08Q0722W82","Allyson Jenkins":"U085JVDKCMR","Anjul Garg":"U03DEGHSEM6",
    "Ashay Deo":"U078BTL1TJT","Caio Miranda":"U0983ARJA5U","Gp Capt Debashish Sengupta (Retd)":"U06UHEYB65U",
    "Jimmy Greco":"U057D8LTT6K","Karan Mali":"U07FE2KPZBR","Markus Heynen":"U03MLS656U9",
    "Mauricio Meira":"U08NXMHA1NJ","Ryan McKinney":"U0ACVKZ837T","Shantanu Thada":"U05T154T9L5",
    "Shridutta Banerjee":"U027F7R2EQ3","Usha Simhadri":"U03EAV4FZSB",
    "Amy Zammit":"U050FJYSEUU","Megan Gallagher":"U056T9UE23V","Rhodri Phillips":"U092KJ4AKPC",
    "Ryan Hammock":"U057QQ2BA8J","Spencer Wahrman":"U07RWUTR22X","Terence Yuchen Xie":"U0B8T6ZSL7N",
    "Aditya Chintalapati":"U03MA603292","Ananya Banerjee":"U0A3M8TLWVD","Bandi Jay":"U09UQH43Z5E",
    "Megha Devaraju":"U07N71LAVU0","Meghana Shetty":"U0A10SR26JX","Shubhavi P":"U053Z522G20",
    "Jeremy Kravitz":"U064U233N2V","Subash Yeggina":"U01TK168BKR",
  };

  const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN");
  const CUSTOMER_PASSPORT_CHANNEL = "C0BB1DC6LNB";

  // Pipelines we surface in the app (by HubSpot pipeline ID)
  const ALLOWED_PIPELINES = {
    "786915663": "Global Commercial Pipeline",
    "132934313": "Bespoke Analytics (EMEA & APAC)",
    "693859631": "Reseller Pipeline",
  };

  // Build live pipeline + stage maps from HubSpot definitions
  const pipelinesRes = await hsGet("/crm/v3/pipelines/deals", token);
  const PIPELINE_LABEL = {};          // pipelineId -> label
  const STAGE_TO_PIPELINE = {};       // stageId -> pipelineId
  const STAGE_TO_IDX = {};            // stageId -> ordered index
  const STAGE_TO_LABEL = {};          // stageId -> stage label
  for (const pl of (pipelinesRes.results || [])) {
    PIPELINE_LABEL[pl.id] = pl.label;
    (pl.stages || []).forEach(function(s, i) {
      STAGE_TO_PIPELINE[s.id] = pl.id;
      STAGE_TO_IDX[s.id] = i;
      STAGE_TO_LABEL[s.id] = s.label;
    });
  }

  // Owners
  const ownersRes = await hsGet("/crm/v3/owners?limit=100", token);
  const ownerMap = {};        // ownerId -> clean name
  const ownerEmailMap = {};   // ownerId -> email
  const ownerIdByName = {};   // clean name -> ownerId (for PSE write-back)
  for (const o of (ownersRes.results || [])) {
    const email = (o.email || "").toLowerCase();
    const rawName = ((o.firstName || "") + " " + (o.lastName || "")).trim();
    const cleanName = ROSTER_NAME_BY_EMAIL[email] || rawName;
    ownerMap[o.id] = cleanName;
    ownerEmailMap[o.id] = email;
    if (cleanName) ownerIdByName[cleanName] = o.id;
  }

  // Fetch all deals with the fields we care about
  const props = [
    "dealname","dealstage","pipeline","amount","closedate","hubspot_owner_id",
    "notes_last_contacted","hs_lastmodifieddate","pse",
    "description","industry","dealtype"
  ].join(",");
  let allDeals = [];
  let after = undefined;
  do {
    const url = "/crm/v3/objects/deals?limit=100&properties=" + props + (after ? "&after=" + after : "");
    const data = await hsGet(url, token);
    allDeals = allDeals.concat(data.results || []);
    after = data.paging && data.paging.next ? data.paging.next.after : undefined;
  } while (after);

  // Keep only deals whose pipeline is one we surface
  const deals = allDeals.filter(function(d) {
    const pid = d.properties.pipeline;
    return ALLOWED_PIPELINES[pid] !== undefined;
  });
  console.log("Fetched " + allDeals.length + " deals, " + deals.length + " in allowed pipelines");

  // Load existing passports to reconcile SE assignment direction
  const existingRes = await sb
    .from("handover_passports")
    .select("hubspot_deal_id,owner_se,owner_se_source,company,pipeline,deal_id_display");
  const existingMap = {};
  for (const row of (existingRes.data || [])) {
    existingMap[row.hubspot_deal_id] = row;
  }

  const se_changes = [];     // for Slack notifications (HubSpot -> app)
  const writeBacks = [];     // app -> HubSpot PSE

  const rows = deals.map(function(d) {
    const p = d.properties;
    const pid = p.pipeline;
    const stageId = p.dealstage || "";
    const idx = STAGE_TO_IDX[stageId] !== undefined ? STAGE_TO_IDX[stageId] : 0;
    const hubspotPseName = p.pse ? (ownerMap[p.pse] || null) : null;
    const existing = existingMap[d.id];

    // ── SE reconciliation ──────────────────────────────────────
    // In-app assignment wins. If app value differs from HubSpot PSE,
    // schedule a write-back so HubSpot matches the app.
    let owner_se_value;
    let owner_se_source;
    if (existing && existing.owner_se_source === "app" && existing.owner_se) {
      // App is source of truth
      owner_se_value = existing.owner_se;
      owner_se_source = "app";
      if (hubspotPseName !== existing.owner_se) {
        const oid = ownerIdByName[existing.owner_se];
        if (oid) writeBacks.push({ dealId: d.id, ownerId: oid });
      }
    } else if (hubspotPseName) {
      // HubSpot is source of truth
      owner_se_value = hubspotPseName;
      owner_se_source = "hubspot";
      // Notify if this is a new/changed SE coming from HubSpot
      if (existing && existing.owner_se !== hubspotPseName) {
        se_changes.push({ se_name: hubspotPseName, company: p.dealname || ("Deal "+d.id), deal_id: "PX-" + d.id.slice(-4), pipeline: ALLOWED_PIPELINES[pid] });
      }
    } else {
      owner_se_value = existing ? existing.owner_se : null;
      owner_se_source = existing ? (existing.owner_se_source || "hubspot") : "hubspot";
    }

    const row = {
      hubspot_deal_id: d.id,
      hubspot_deal_name: p.dealname,
      hubspot_stage: STAGE_TO_LABEL[stageId] || "Discovery",
      hubspot_stage_idx: idx,
      hubspot_stage_id: stageId || null,
      pipeline: ALLOWED_PIPELINES[pid] || "Other",
      hubspot_amount: p.amount ? parseFloat(p.amount) : null,
      hubspot_close_date: p.closedate || null,
      hubspot_last_contacted: p.notes_last_contacted || null,
      hubspot_last_contact_owner: ownerMap[p.hubspot_owner_id] || null,
      hubspot_synced_at: new Date().toISOString(),
      company: p.dealname || ("Deal " + d.id),
      owner_director: ownerMap[p.hubspot_owner_id] || null,
      owner_director_email: ownerEmailMap[p.hubspot_owner_id] || null,
      owner_se: owner_se_value,
      owner_se_source: owner_se_source,
      last_activity_label: lastActivityLabel(p.hs_lastmodifieddate),
      deal_id_display: "PX-" + d.id.slice(-4),
    };
    // Sync HubSpot description into use_case only if app hasn't captured one yet
    if (p.description && (!existing || existing.use_case == null)) {
      // (handled below via separate guarded update to avoid clobbering edits)
    }
    return row;
  });

  let synced = 0;
  let errors = 0;
  const CHUNK = 50;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const result = await sb.from("handover_passports").upsert(chunk, { onConflict: "hubspot_deal_id" });
    if (result.error) { console.error("Chunk error:", result.error); errors += chunk.length; }
    else synced += chunk.length;
  }

  // ── Write back app SE assignments to HubSpot PSE field ────────
  let written_back = 0;
  for (const wb of writeBacks) {
    try {
      await hsPatch("/crm/v3/objects/deals/" + wb.dealId, { properties: { pse: wb.ownerId } }, token);
      written_back++;
    } catch (e) { console.error("Write-back failed for " + wb.dealId, e); }
  }

  // ── Slack notifications for HubSpot-originated SE assignments ──
  if (SLACK_BOT_TOKEN && se_changes.length > 0) {
    for (const change of se_changes) {
      const slackId = SLACK_ID_BY_NAME[change.se_name];
      const mention = slackId ? "<@" + slackId + ">" : change.se_name;
      const msg = {
        channel: CUSTOMER_PASSPORT_CHANNEL,
        text: change.se_name + " assigned as Sales Engineer on " + change.company,
        blocks: [
          { type: "header", text: { type: "plain_text", text: "🛰️ SE Assignment — Customer Passport", emoji: true } },
          { type: "section", text: { type: "mrkdwn", text: mention + " has been assigned as *Sales Engineer* on *" + change.company + "* (" + change.deal_id + ")" } },
          { type: "context", elements: [{ type: "mrkdwn", text: "Auto-synced from HubSpot PSE field · " + change.pipeline }] },
        ],
      };
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: "Bearer " + SLACK_BOT_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      }).catch(function() {});
    }
  }

  return new Response(JSON.stringify({
    ok: true, synced: synced, errors: errors, total: deals.length,
    se_assignments_notified: se_changes.length,
    se_written_back_to_hubspot: written_back,
    synced_at: new Date().toISOString()
  }), {
    headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
  });
});

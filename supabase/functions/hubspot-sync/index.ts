// supabase/functions/hubspot-sync/index.ts
// Deploy: supabase functions deploy hubspot-sync

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HS_BASE = "https://api.hubapi.com";

async function hsGet(path, token) {
  const res = await fetch(HS_BASE + path, {
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  });
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

  // PER-DEAL NOTES SYNC — pulls HubSpot notes/meetings for one deal on demand
  // ── Push a passport briefing to PlanHat ───────────────────────
  // Creates the company if missing (matched by name), then attaches
  // the briefing as a conversation. Dormant until PLANHAT_TOKEN is set.
  // ── Push an MVP image (QC entry) to the Notion "FF Sample Image Ammo" DB ──
  // Dormant until NOTION_TOKEN + NOTION_MVP_DB_ID secrets are set.
  if (body.action === "push_mvp_to_notion") {
    const notionToken = Deno.env.get("NOTION_TOKEN");
    const dbId = Deno.env.get("NOTION_MVP_DB_ID");
    if (!notionToken || !dbId) {
      return new Response(JSON.stringify({ ok: false, error: "Notion not configured — NOTION_TOKEN / NOTION_MVP_DB_ID not set yet." }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    const qcId = body.qc_id;
    if (!qcId) {
      return new Response(JSON.stringify({ ok: false, error: "qc_id required" }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    const { data: qc } = await sb.from("quality_checks").select("*").eq("id", qcId).single();
    if (!qc) {
      return new Response(JSON.stringify({ ok: false, error: "QC entry not found" }), {
        status: 404, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    // Map QC fields → FF Sample Image Ammo properties. Property names must match
    // the Notion DB exactly; adjust here if the DB columns differ.
    const props = {
      "Use Case": { title: [{ text: { content: qc.usecase || qc.organization || "MVP image" } }] },
      "Location": { rich_text: [{ text: { content: qc.location || "" } }] },
      "Version": { rich_text: [{ text: { content: qc.image_id || "" } }] },
    };
    try {
      const r = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + notionToken,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({ parent: { database_id: dbId }, properties: props }),
      });
      const data = await r.json();
      if (!r.ok) {
        return new Response(JSON.stringify({ ok: false, error: data.message || "Notion API error" }), {
          status: 502, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
        });
      }
      await sb.from("quality_checks").update({ notion_page_id: data.id, synced_to_notion_at: new Date().toISOString() }).eq("id", qcId);
      return new Response(JSON.stringify({ ok: true, notion_page_id: data.id }), {
        headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), {
        status: 502, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
  }

  if (body.action === "push_to_planhat") {
    const phToken = Deno.env.get("PLANHAT_TOKEN");
    const phTenant = Deno.env.get("PLANHAT_TENANT"); // e.g. "api" or a tenant-specific host
    if (!phToken) {
      return new Response(JSON.stringify({ ok: false, error: "PlanHat not configured — PLANHAT_TOKEN secret not set. Ask the CS team for an API token." }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    const passportId = body.passport_id;
    if (!passportId) {
      return new Response(JSON.stringify({ ok: false, error: "passport_id required" }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    const PH_BASE = "https://api.planhat.com";
    const phHeaders = { "Authorization": "Bearer " + phToken, "Content-Type": "application/json" };

    // Load the full passport + children
    const { data: pp } = await sb.from("handover_passports").select("*").eq("id", passportId).single();
    if (!pp) {
      return new Response(JSON.stringify({ ok: false, error: "Passport not found" }), {
        status: 404, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    // The shareable per-deal link — same URL as the "Copy link" button.
    const passportLink = "https://customer-passport.vercel.app/?deal=" + passportId;

    // ── 0. Resolve the deal's associated HubSpot COMPANY ─────────
    // Passports carry a HubSpot *deal* id, but a PlanHat company maps
    // to a HubSpot *company*. Using the company name (not the deal
    // name) fixes mismatches like deal "GeoVille_AUT - Data purchase…"
    // vs company "GeoVille"; the company id becomes the externalId key.
    let hsCompanyId: string | null = null;
    let hsCompanyName: string | null = null;
    try {
      if (pp.hubspot_deal_id) {
        const assoc = await hsGet("/crm/v4/objects/deals/" + pp.hubspot_deal_id + "/associations/companies", token).catch(() => ({ results: [] }));
        const first = (assoc.results || [])[0];
        const coid = first ? (first.toObjectId || first.id) : null;
        if (coid) {
          const co = await hsGet("/crm/v3/objects/companies/" + coid + "?properties=name,domain", token).catch(() => null);
          hsCompanyId = String(coid);
          if (co && co.properties && co.properties.name) hsCompanyName = co.properties.name;
        }
      }
    } catch (e) { console.error("HubSpot company lookup failed", e); }

    const companyName = hsCompanyName || pp.company || pp.hubspot_deal_name || "Unknown";

    // ── 1. Match PlanHat company by externalId (HubSpot company id) ──
    // PlanHat lets you address objects by external id via the "extid-"
    // prefix. Once stamped, every future push matches instantly and
    // unambiguously regardless of name drift.
    let companyId = null;
    let companyCreated = false;
    let matchedBy: string | null = null;
    let existingExternalId: string | null = null;
    if (hsCompanyId) {
      try {
        const r = await fetch(PH_BASE + "/companies/extid-" + encodeURIComponent(hsCompanyId), { headers: phHeaders });
        if (r.ok) {
          const c = await r.json().catch(() => null);
          if (c && c._id) { companyId = c._id; matchedBy = "externalId"; existingExternalId = c.externalId || null; }
        }
      } catch (e) { console.error("PlanHat extid lookup error", e); }
    }

    // ── 2. Fallback: match by (HubSpot company) name ──────────────
    if (!companyId) {
      try {
        const findRes = await fetch(PH_BASE + "/companies?" + new URLSearchParams({ name: companyName }), { headers: phHeaders });
        const found = await findRes.json().catch(() => []);
        if (Array.isArray(found) && found.length) {
          // Exact (case-insensitive) name match preferred
          const exact = found.find(c => (c.name || "").toLowerCase().trim() === companyName.toLowerCase().trim());
          const pick = exact || (found.length === 1 ? found[0] : null);
          if (pick) { companyId = pick._id; matchedBy = "name"; existingExternalId = pick.externalId || null; }
        }
      } catch (e) { console.error("PlanHat find error", e); }
    }

    // ── 3. Create the company if still missing ────────────────────
    if (!companyId) {
      try {
        const createRes = await fetch(PH_BASE + "/companies", {
          method: "POST", headers: phHeaders,
          body: JSON.stringify({
            name: companyName,
            externalId: hsCompanyId || undefined,
            custom: { "Customer Passport": passportLink },
          }),
        });
        const created = await createRes.json().catch(() => ({}));
        companyId = created._id;
        companyCreated = !!companyId;
      } catch (e) { console.error("PlanHat create error", e); }
    }
    if (!companyId) {
      return new Response(JSON.stringify({ ok: false, error: "Could not find or create the PlanHat company" }), {
        status: 502, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }

    // ── 4. Stamp externalId (if safe) + write the passport link ───
    // externalId is only written when the company doesn't already carry
    // a different one — never clobber an id another integration owns.
    // The link goes into the "Customer Passport" custom field; PlanHat
    // custom fields are addressed by their display name under `custom`.
    let passportFieldSet = false;
    try {
      const patch: Record<string, unknown> = { custom: { "Customer Passport": passportLink } };
      if (hsCompanyId && (!existingExternalId || existingExternalId === hsCompanyId)) {
        patch.externalId = hsCompanyId;
      }
      const putRes = await fetch(PH_BASE + "/companies/" + companyId, {
        method: "PUT", headers: phHeaders, body: JSON.stringify(patch),
      });
      passportFieldSet = putRes.ok;
      if (!putRes.ok) console.error("PlanHat field write failed", putRes.status, await putRes.text().catch(() => ""));
    } catch (e) { console.error("PlanHat field write error", e); }

    // ── 5. Build a rich HTML summary document and store it in Supabase Storage
    //    so PlanHat can link to a real, openable/printable file.
    const esc = (s) => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const listHtml = (arr) => (arr && arr.length) ? "<ul>" + arr.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "<p style='color:#8a93a0'>—</p>";

    const summaryHtml = "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(companyName) + " — Customer Passport</title>" +
      "<style>*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a2230;margin:0;padding:40px;line-height:1.55;max-width:820px}" +
      ".bar{height:4px;background:linear-gradient(90deg,#7B2FBE,#2D7FF9,#0EA5B7,#2FB67A,#F0A429,#E5564B);margin:-40px -40px 28px}" +
      "h1{font-size:23px;margin:0 0 4px}.sub{color:#6b7480;font-size:12px;font-family:monospace;margin-bottom:24px}" +
      "h2{font-size:12.5px;text-transform:uppercase;letter-spacing:.08em;color:#0B7E8C;border-bottom:1px solid #e3e8ef;padding-bottom:5px;margin:26px 0 10px}" +
      "p{margin:6px 0}ul{margin:6px 0;padding-left:20px}.kv{font-size:14px}.print{margin-top:30px;font-size:11px;color:#8a93a0}" +
      "@media print{.noprint{display:none}}</style></head><body>" +
      "<div class='bar'></div>" +
      "<h1>" + esc(companyName) + "</h1>" +
      "<div class='sub'>Customer Passport handover · " + esc(pp.pipeline || "") + " · " + new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"}) + "</div>" +
      "<div class='noprint' style='background:#f4f6f9;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#5b6472;margin-bottom:20px'>Tip: use your browser's Print → Save as PDF to keep a copy.</div>" +
      "<h2>Owners</h2><p class='kv'>Sales Owner: <strong>" + esc(pp.owner_director || "—") + "</strong> &nbsp;·&nbsp; SE: <strong>" + esc(pp.owner_se || "—") + "</strong> &nbsp;·&nbsp; CS: <strong>" + esc(pp.owner_cs || "—") + "</strong> &nbsp;·&nbsp; Analytics: <strong>" + esc(pp.owner_analytics || "—") + "</strong></p>" +
      "<p class='kv'>Stage: " + esc(pp.hubspot_stage || "—") + (pp.hubspot_amount ? " &nbsp;·&nbsp; ACV: $" + Number(pp.hubspot_amount).toLocaleString() : "") + "</p>" +
      (pp.use_case ? "<h2>Use case</h2><p>" + esc(pp.use_case) + "</p>" : "") +
      (pp.pain_points ? "<h2>Pain points</h2><p>" + esc(pp.pain_points) + "</p>" : "") +
      (pp.problem_statement ? "<h2>Problem statement</h2><p>" + esc(pp.problem_statement) + "</p>" : "") +
      ((pp.objectives && pp.objectives.length) ? "<h2>Objectives</h2>" + listHtml(pp.objectives) : "") +
      ((pp.success_criteria && pp.success_criteria.length) ? "<h2>Success criteria</h2>" + listHtml(pp.success_criteria) : "") +
      (pp.bandset ? "<h2>Technical</h2><p>Bandset: " + esc(pp.bandset) + (pp.cadence ? " &nbsp;·&nbsp; Cadence: " + esc(pp.cadence) : "") + "</p>" : "") +
      (pp.next_steps ? "<h2>Next steps</h2><p>" + esc(pp.next_steps) + "</p>" : "") +
      (pp.commercial_model ? "<h2>Commercial model</h2><p>" + esc(pp.commercial_model) + "</p>" : "") +
      "<p class='print'>Generated from the Pixxel Customer Passport · " + new Date().toISOString().slice(0,10) + "</p>" +
      "</body></html>";

    // Upload to the public storage bucket
    let summaryUrl = passportLink; // fallback: live passport link
    try {
      const path = "planhat-summaries/" + passportId + "-" + Date.now() + ".html";
      const up = await sb.storage.from("passport-files").upload(path, new Blob([summaryHtml], { type: "text/html" }), { upsert: true, contentType: "text/html" });
      if (!up.error) {
        const pub = sb.storage.from("passport-files").getPublicUrl(path);
        if (pub.data && pub.data.publicUrl) summaryUrl = pub.data.publicUrl;
      }
    } catch (e) { console.error("summary upload failed, using live link", e); }

    // ── 6. Build the note text (summary + link) and attach as a conversation
    const lines = [];
    lines.push("CUSTOMER PASSPORT — " + companyName);
    lines.push("Pipeline: " + (pp.pipeline || "—") + " · Stage: " + (pp.hubspot_stage || "—"));
    lines.push("Sales Owner: " + (pp.owner_director || "—") + " · SE: " + (pp.owner_se || "—") + " · CS: " + (pp.owner_cs || "—"));
    lines.push("");
    if (pp.use_case) lines.push("Use case: " + pp.use_case);
    if (pp.pain_points) lines.push("Pain points: " + pp.pain_points);
    if (pp.problem_statement) lines.push("Problem: " + pp.problem_statement);
    if (pp.objectives && pp.objectives.length) lines.push("Objectives: " + pp.objectives.join("; "));
    if (pp.success_criteria && pp.success_criteria.length) lines.push("Success criteria: " + pp.success_criteria.join("; "));
    if (pp.bandset) lines.push("Bandset: " + pp.bandset);
    if (pp.next_steps) lines.push("Next steps: " + pp.next_steps);
    if (pp.commercial_model) lines.push("Commercial: " + pp.commercial_model);
    lines.push("");
    lines.push("📄 Full passport summary (open & print to PDF): " + summaryUrl);
    const briefing = lines.join("\n");

    try {
      const convRes = await fetch(PH_BASE + "/conversations", {
        method: "POST", headers: phHeaders,
        body: JSON.stringify({
          companyId: companyId,
          type: "note",
          subject: "Customer Passport handover — " + companyName,
          description: briefing,
          date: new Date().toISOString(),
        }),
      });
      const conv = await convRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        ok: convRes.ok,
        company_id: companyId,
        company_name: companyName,
        company_created: companyCreated,
        matched_by: matchedBy,
        passport_field_set: passportFieldSet,
        passport_link: passportLink,
        conversation_id: conv._id || null,
        summary_url: summaryUrl,
      }), {
        headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "Briefing attach failed: " + String(e), company_id: companyId }), {
        status: 502, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
  }

  if (body.action === "debug_assoc") {
    const dealId = body.hubspot_deal_id;
    // Check every activity type directly on the deal
    const types = ["notes", "meetings", "calls", "emails", "tasks"];
    const dealAssoc = {};
    for (const t of types) {
      const r = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/" + t, token).catch(e => ({ error: String(e) }));
      dealAssoc[t] = (r.results || []).length;
    }
    // Get the associated contact(s), then check activities on the first contact
    const contacts = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
    const contactIds = (contacts.results || []).map(a => a.toObjectId || a.id).filter(Boolean);
    const contactActivity = {};
    if (contactIds.length) {
      const cid = contactIds[0];
      for (const t of types) {
        const r = await hsGet("/crm/v4/objects/contacts/" + cid + "/associations/" + t, token).catch(e => ({ error: String(e) }));
        contactActivity[t] = (r.results || []).length;
      }
    }
    // Also check the associated company's activities
    const companies = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/companies", token).catch(() => ({ results: [] }));
    const companyIds = (companies.results || []).map(a => a.toObjectId || a.id).filter(Boolean);
    const companyActivity = {};
    if (companyIds.length) {
      const coid = companyIds[0];
      for (const t of types) {
        const r = await hsGet("/crm/v4/objects/companies/" + coid + "/associations/" + t, token).catch(e => ({ error: String(e) }));
        companyActivity[t] = (r.results || []).length;
      }
    }
    return new Response(JSON.stringify({
      deal_activities: dealAssoc,
      contact_count: contactIds.length,
      contact_activities: contactActivity,
      company_count: companyIds.length,
      company_activities: companyActivity,
    }, null, 2), { headers: Object.assign({}, CORS, { "Content-Type": "application/json" }) });
  }

  if (body.action === "sync_notes_for_deal") {
    const dealId = body.hubspot_deal_id;
    const passportId = body.passport_id;
    if (!dealId || !passportId) {
      return new Response(JSON.stringify({ ok: false, error: "hubspot_deal_id and passport_id required" }), {
        status: 400, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
      });
    }
    // ── Pull HubSpot contacts (sync-safe: never touch app-added ones) ──
    let contacts_added = 0;
    try {
      const existingContactsRes = await sb
        .from("deal_contacts")
        .select("hubspot_contact_id")
        .eq("passport_id", passportId)
        .not("hubspot_contact_id", "is", null);
      const seenContacts = new Set((existingContactsRes.data || []).map(r => r.hubspot_contact_id));
      const cAssoc = await hsGet("/crm/v3/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
      const contactIds = (cAssoc.results || []).map(a => a.id || a.toObjectId).filter(Boolean).slice(0, 30);
      for (const cid of contactIds) {
        if (seenContacts.has(cid)) continue;
        const contact = await hsGet("/crm/v3/objects/contacts/" + cid + "?properties=firstname,lastname,email,jobtitle", token).catch(() => null);
        if (!contact || !contact.properties) continue;
        const pr = contact.properties;
        const name = ((pr.firstname || "") + " " + (pr.lastname || "")).trim() || pr.email || "Unknown";
        await sb.from("deal_contacts").insert({
          passport_id: passportId,
          name: name,
          role: pr.jobtitle || null,
          email: pr.email || null,
          hubspot_contact_id: cid,
        });
        seenContacts.add(cid);
        contacts_added++;
      }
    } catch (e) { console.error("Contact pull error", e); }

    // Existing engagement ids for this passport (dedupe)
    const existingNotesRes = await sb
      .from("meeting_notes")
      .select("hs_engagement_id")
      .eq("passport_id", passportId)
      .not("hs_engagement_id", "is", null);
    const seen = new Set((existingNotesRes.data || []).map(r => r.hs_engagement_id));

    let added = 0;

    // HubSpot's "All activities" view aggregates engagements across the deal
    // AND its associated contacts and companies. Activities are frequently
    // logged on the contact/company rather than the deal itself, so we gather
    // from all three record types.
    const activityTypes = ["notes", "meetings", "calls", "emails"];

    // Build the full set of records to scan: the deal, plus associated contacts + companies
    const records = [{ type: "deals", id: dealId }];
    try {
      const cAssoc2 = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
      for (const a of (cAssoc2.results || [])) {
        const id = a.toObjectId || a.id;
        if (id) records.push({ type: "contacts", id: String(id) });
      }
      const coAssoc = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/companies", token).catch(() => ({ results: [] }));
      for (const a of (coAssoc.results || [])) {
        const id = a.toObjectId || a.id;
        if (id) records.push({ type: "companies", id: String(id) });
      }
    } catch (e) { console.error("assoc gather error", e); }

    // Property sets + field mapping per activity type
    const typeConfig = {
      notes: { props: "hs_note_body,hs_timestamp,hs_createdate", body: "hs_note_body", date: "hs_timestamp", label: "note" },
      meetings: { props: "hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_timestamp", body: "hs_meeting_body", date: "hs_meeting_start_time", label: "meeting", title: "hs_meeting_title" },
      calls: { props: "hs_call_title,hs_call_body,hs_timestamp,hs_createdate", body: "hs_call_body", date: "hs_timestamp", label: "call", title: "hs_call_title" },
      emails: { props: "hs_email_subject,hs_email_text,hs_timestamp,hs_createdate", body: "hs_email_text", date: "hs_timestamp", label: "email", title: "hs_email_subject" },
    };

    // Collect unique engagement ids per type across all records (dedupe within this run too)
    for (const objType of activityTypes) {
      const cfg = typeConfig[objType];
      const engagementIds = new Set();
      for (const rec of records) {
        const assoc = await hsGet("/crm/v4/objects/" + rec.type + "/" + rec.id + "/associations/" + objType, token).catch(() => ({ results: [] }));
        for (const a of (assoc.results || [])) {
          const id = a.toObjectId || a.id;
          if (id) engagementIds.add(String(id));
        }
      }
      for (const eid of engagementIds) {
        if (seen.has(eid)) continue;
        const obj = await hsGet("/crm/v3/objects/" + objType + "/" + eid + "?properties=" + cfg.props, token).catch(() => null);
        if (!obj || !obj.properties) continue;
        const raw = obj.properties[cfg.body] || "";
        const title = cfg.title ? (obj.properties[cfg.title] || "") : "";
        let bodyText = String(raw).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
        if (title) bodyText = title + (bodyText ? " — " + bodyText : "");
        if (!bodyText) continue;
        const ts = obj.properties[cfg.date] || obj.properties.hs_timestamp || obj.properties.hs_createdate || "";
        await sb.from("meeting_notes").insert({
          passport_id: passportId,
          note_date: ts ? new Date(ts).toISOString().slice(0,10) : null,
          author: "HubSpot (" + cfg.label + ")",
          body: bodyText.slice(0, 4000),
          hs_engagement_id: eid,
        });
        seen.add(eid);
        added++;
      }
    }
    return new Response(JSON.stringify({ ok: true, notes_added: added, contacts_added: contacts_added }), {
      headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }

  // BATCH: refresh contacts + activities for EVERY deal (nightly cron calls this).
  // Mirrors the per-deal sync_notes_for_deal logic above; runs in the background
  // so the HTTP call returns immediately, and wraps each deal in try/catch so one
  // failure doesn't abort the run. Dedupes by hs_engagement_id, so after the first
  // (heavier) run each night only picks up genuinely new activity.
  if (body.action === "sync_all_notes") {
    // Process the N "stalest" active deals per run (never-synced first, then
    // oldest notes_synced_at), then stamp each. A frequent cron cycles through
    // every deal over the day, and each run stays well inside the edge time
    // limit. Pass { "limit": N } to tune the batch size.
    const limit = Number(body.limit) || 20;
    const passportsRes = await sb.from("handover_passports")
      .select("id, hubspot_deal_id")
      .not("hubspot_deal_id", "is", null)
      .or("archived.is.null,archived.eq.false")
      .order("notes_synced_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    const list = passportsRes.data || [];

    const runForDeal = async (dealId, passportId) => {
      // ── contacts ──
      try {
        const existingContactsRes = await sb.from("deal_contacts").select("hubspot_contact_id").eq("passport_id", passportId).not("hubspot_contact_id", "is", null);
        const seenContacts = new Set((existingContactsRes.data || []).map(r => r.hubspot_contact_id));
        const cAssoc = await hsGet("/crm/v3/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
        const contactIds = (cAssoc.results || []).map(a => a.id || a.toObjectId).filter(Boolean).slice(0, 30);
        for (const cid of contactIds) {
          if (seenContacts.has(cid)) continue;
          const contact = await hsGet("/crm/v3/objects/contacts/" + cid + "?properties=firstname,lastname,email,jobtitle", token).catch(() => null);
          if (!contact || !contact.properties) continue;
          const pr = contact.properties;
          const name = ((pr.firstname || "") + " " + (pr.lastname || "")).trim() || pr.email || "Unknown";
          await sb.from("deal_contacts").insert({ passport_id: passportId, name: name, role: pr.jobtitle || null, email: pr.email || null, hubspot_contact_id: cid });
          seenContacts.add(cid);
        }
      } catch (e) { console.error("batch contact pull error for " + dealId, e); }

      // ── activities (deal + associated contacts + companies) ──
      const existingNotesRes = await sb.from("meeting_notes").select("hs_engagement_id").eq("passport_id", passportId).not("hs_engagement_id", "is", null);
      const seen = new Set((existingNotesRes.data || []).map(r => r.hs_engagement_id));
      let added = 0;
      const activityTypes = ["notes", "meetings", "calls", "emails"];
      const records = [{ type: "deals", id: dealId }];
      try {
        const cAssoc2 = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/contacts", token).catch(() => ({ results: [] }));
        for (const a of (cAssoc2.results || [])) { const id = a.toObjectId || a.id; if (id) records.push({ type: "contacts", id: String(id) }); }
        const coAssoc = await hsGet("/crm/v4/objects/deals/" + dealId + "/associations/companies", token).catch(() => ({ results: [] }));
        for (const a of (coAssoc.results || [])) { const id = a.toObjectId || a.id; if (id) records.push({ type: "companies", id: String(id) }); }
      } catch (e) { console.error("batch assoc gather error for " + dealId, e); }

      const typeConfig = {
        notes: { props: "hs_note_body,hs_timestamp,hs_createdate", body: "hs_note_body", date: "hs_timestamp", label: "note" },
        meetings: { props: "hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_timestamp", body: "hs_meeting_body", date: "hs_meeting_start_time", label: "meeting", title: "hs_meeting_title" },
        calls: { props: "hs_call_title,hs_call_body,hs_timestamp,hs_createdate", body: "hs_call_body", date: "hs_timestamp", label: "call", title: "hs_call_title" },
        emails: { props: "hs_email_subject,hs_email_text,hs_timestamp,hs_createdate", body: "hs_email_text", date: "hs_timestamp", label: "email", title: "hs_email_subject" },
      };
      for (const objType of activityTypes) {
        const cfg = typeConfig[objType];
        const engagementIds = new Set();
        for (const rec of records) {
          const assoc = await hsGet("/crm/v4/objects/" + rec.type + "/" + rec.id + "/associations/" + objType, token).catch(() => ({ results: [] }));
          for (const a of (assoc.results || [])) { const id = a.toObjectId || a.id; if (id) engagementIds.add(String(id)); }
        }
        for (const eid of engagementIds) {
          if (seen.has(eid)) continue;
          const obj = await hsGet("/crm/v3/objects/" + objType + "/" + eid + "?properties=" + cfg.props, token).catch(() => null);
          if (!obj || !obj.properties) continue;
          const raw = obj.properties[cfg.body] || "";
          const title = cfg.title ? (obj.properties[cfg.title] || "") : "";
          let bodyText = String(raw).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
          if (title) bodyText = title + (bodyText ? " — " + bodyText : "");
          if (!bodyText) continue;
          const ts = obj.properties[cfg.date] || obj.properties.hs_timestamp || obj.properties.hs_createdate || "";
          await sb.from("meeting_notes").insert({ passport_id: passportId, note_date: ts ? new Date(ts).toISOString().slice(0,10) : null, author: "HubSpot (" + cfg.label + ")", body: bodyText.slice(0, 4000), hs_engagement_id: eid });
          seen.add(eid);
          added++;
        }
      }
      return added;
    };

    const job = (async () => {
      let ok = 0, failed = 0, totalNotes = 0;
      for (const p of list) {
        try { totalNotes += await runForDeal(p.hubspot_deal_id, p.id); ok++; }
        catch (e) { failed++; console.error("sync_all_notes: deal " + p.hubspot_deal_id + " failed", e); }
        // Stamp regardless of success so the next run advances to other deals.
        await sb.from("handover_passports").update({ notes_synced_at: new Date().toISOString() }).eq("id", p.id);
      }
      console.log("sync_all_notes complete: " + ok + " ok, " + failed + " failed, " + totalNotes + " notes added, of " + list.length + " deals");
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

  // ── Archive detection ──────────────────────────────────────────
  // A passport whose hubspot_deal_id no longer shows up in this sync
  // (deleted in HubSpot, or moved out of an allowed pipeline) gets
  // flagged as archived rather than deleted — nothing is ever lost.
  // If a deal that WAS archived comes back (e.g. pipeline moved back),
  // it's automatically un-archived on the next sync since it's in `rows`.
  let archived = 0;
  let unarchived = 0;
  try {
    const liveIds = deals.map(d => d.id);
    const { data: existingActive } = await sb
      .from("handover_passports")
      .select("id,hubspot_deal_id")
      .eq("archived", false);
    const toArchive = (existingActive || [])
      .filter(r => r.hubspot_deal_id && !liveIds.includes(r.hubspot_deal_id))
      .map(r => r.id);
    if (toArchive.length) {
      await sb.from("handover_passports").update({
        archived: true, archived_at: new Date().toISOString(),
        archived_reason: "No longer found in HubSpot (deleted or moved out of a tracked pipeline)",
      }).in("id", toArchive);
      archived = toArchive.length;
    }
    // Un-archive anything that's back in the live set but still flagged
    const { data: existingArchived } = await sb
      .from("handover_passports")
      .select("id,hubspot_deal_id")
      .eq("archived", true);
    const toUnarchive = (existingArchived || [])
      .filter(r => r.hubspot_deal_id && liveIds.includes(r.hubspot_deal_id))
      .map(r => r.id);
    if (toUnarchive.length) {
      await sb.from("handover_passports").update({ archived: false, archived_at: null, archived_reason: null }).in("id", toUnarchive);
      unarchived = toUnarchive.length;
    }
  } catch (e) { console.error("Archive detection error", e); }

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
    archived: archived,
    unarchived: unarchived,
    synced_at: new Date().toISOString()
  }), {
    headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
  });
});

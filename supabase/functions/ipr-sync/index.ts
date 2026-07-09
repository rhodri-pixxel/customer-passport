// supabase/functions/ipr-sync/index.ts
// Scheduled server-side twin of the in-app "Sync captured images" button.
// For every active *customer* (Closed Won or handed to CS) it pulls newly
// captured, QC-ready images from the IPR portal (matched to the deal by company
// name), creates Awaiting-QC rows in quality_checks assigned to the deal's SE,
// and pings that SE on Slack. Scoping to customers keeps the run inside the
// edge-function time limit; use the in-app button for ad-hoc syncs of any deal.
//
// Deploy:  supabase functions deploy ipr-sync
// Schedule (run every night — see supabase/functions/ipr-sync/README below):
//   select cron.schedule('ipr-sync-nightly','0 2 * * *', $$
//     select net.http_post(
//       url := 'https://<project>.functions.supabase.co/ipr-sync',
//       headers := jsonb_build_object('Content-Type','application/json',
//                                     'Authorization','Bearer <SERVICE_ROLE_OR_ANON>'))$$);

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IPR_API = "https://ipr-image-status.portals.pixxel.dev";
// Processing states meaning an image is captured + ready for our team to QC.
const IPR_QC_READY_STATUSES = ["Sent to Aurora", "Datahub upload completed"];

// SE roster — mirrors TEAM_MEMBERS.se in src/CustomerPassport.jsx. Kept in sync
// manually; only used to resolve an assignee's email + Slack id.
const SE_ROSTER: Record<string, { email: string; slack: string | null }> = {
  "Amy Zammit": { email: "amy@pixxel.space", slack: "U050FJYSEUU" },
  "Megan Gallagher": { email: "megan@pixxel.space", slack: "U056T9UE23V" },
  "Rhodri Phillips": { email: "rhodri@pixxel.space", slack: "U092KJ4AKPC" },
  "Ryan Hammock": { email: "ryan@pixxel.space", slack: "U057QQ2BA8J" },
  "Spencer Wahrman": { email: "spencer@pixxel.space", slack: "U07RWUTR22X" },
  "Terence Yuchen Xie": { email: "terence@pixxel.space", slack: "U0B8T6ZSL7N" },
};

function iprImageId(item: any): string {
  return [String(item.satellite_id || "").trim(), String(item.image_id || "").trim()]
    .filter(Boolean).join(" ");
}

async function iprFetch(params: Record<string, string>) {
  const qs = new URLSearchParams({ page: "1", pageSize: "200", ...params });
  const r = await fetch(`${IPR_API}/api/metadata/detailed?${qs.toString()}`);
  if (!r.ok) throw new Error(`IPR ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const items = Array.isArray(data) ? data : (data.items || []);
  return items as any[];
}

function mapItemToQc(item: any, deal: any) {
  const seName: string | null = deal.owner_se || null;
  const se = seName ? SE_ROSTER[seName] : null;
  const cloud = item.cloud_cover_percentage != null ? `${Math.round(item.cloud_cover_percentage)}% cloud` : "";
  const iprInfo = [item.processing_status || "", cloud].filter(Boolean).join(" · ");
  const location = item.aoi_id
    || (item.latitude != null && item.longitude != null ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : "");
  return {
    organization: deal.company || item.aoi_id || "Unknown",
    passport_id: deal.id,
    usecase: "",
    bandset: item.bandset || "",
    qc_result: "Awaiting QC",
    image_id: iprImageId(item),
    type: "Sample",
    assignee: seName,
    assignee_email: se ? se.email : null,
    qc_notes: "",
    ipr_info: iprInfo,
    location,
    mvp_image: false,
    created_by: "IPR auto-sync",
  };
}

serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN");

  // dry_run validates the scope + matching without inserting rows or pinging Slack.
  // ping does a single 10s-bounded fetch to the IPR portal to test reachability.
  let dryRun = false, ping = false;
  try { const b = await req.json(); dryRun = !!b?.dry_run; ping = !!b?.ping; } catch (_) { /* no body */ }

  if (ping) {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${IPR_API}/api/metadata/detailed?pageSize=1`, { signal: ctrl.signal });
      clearTimeout(to);
      return new Response(JSON.stringify({ reachable: true, status: r.status, ms: Date.now() - t0 }), { headers: Object.assign({}, CORS, { "Content-Type": "application/json" }) });
    } catch (e) {
      return new Response(JSON.stringify({ reachable: false, error: String(e && e.message || e), ms: Date.now() - t0 }), { headers: Object.assign({}, CORS, { "Content-Type": "application/json" }) });
    }
  }

  try {
    // Active *customers* only — Closed Won (stage idx 5) or already handed to CS.
    // This matches the "images captured for customers" intent and keeps the run
    // well inside the edge-function time limit (~54 deals vs ~337 active).
    const { data: deals, error: dealErr } = await sb
      .from("handover_passports")
      .select("id,company,owner_se,owner_cs")
      .eq("archived", false)
      .or("hubspot_stage_idx.eq.5,handed_to_cs.eq.true");
    if (dealErr) throw dealErr;

    // Existing QC image ids (lowercased) — never create a duplicate.
    const { data: existingRows } = await sb
      .from("quality_checks").select("image_id").limit(10000);
    const existing = new Set(
      (existingRows || []).map((r: any) => String(r.image_id || "").trim().toLowerCase()).filter(Boolean),
    );

    const toInsert: any[] = [];
    const perDealNew: Record<string, { deal: any; count: number }> = {};
    const withCompany = (deals || []).filter((d: any) => d.company)
      .map((d: any) => ({ ...d, _needle: String(d.company).toLowerCase() }));

    // Pull ALL QC-ready images in a couple of calls (one per status), then match
    // them to customers locally by company name. Querying IPR once per deal was
    // ~108 slow calls and blew the edge time limit; this is ~2 calls total.
    const readyImages: any[] = [];
    for (const status of IPR_QC_READY_STATUSES) {
      try {
        const got = await iprFetch({ processingStatus: status, pageSize: "5000" });
        readyImages.push(...got);
      } catch (e) { console.error("IPR fetch failed for status", status, e); }
    }

    for (const item of readyImages) {
      const id = iprImageId(item).toLowerCase();
      if (!id || existing.has(id)) continue;
      const hay = `${item.aoi_id || ""} ${item.target || ""}`.toLowerCase();
      if (!hay.trim()) continue;
      const deal = withCompany.find((d: any) => hay.includes(d._needle));
      if (!deal) continue;
      existing.add(id);
      toInsert.push(mapItemToQc(item, deal));
      const key = deal.id;
      if (!perDealNew[key]) perDealNew[key] = { deal, count: 0 };
      perDealNew[key].count++;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true,
        customers_scanned: withCompany.length,
        images_scanned: readyImages.length,
        would_add: toInsert.length,
        deals_with_new: Object.keys(perDealNew).length,
      }, null, 2), { headers: Object.assign({}, CORS, { "Content-Type": "application/json" }) });
    }

    // Insert in chunks.
    let added = 0;
    const CHUNK = 100;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await sb.from("quality_checks").insert(chunk);
      if (error) { console.error("Insert chunk error", error); }
      else added += chunk.length;
    }

    // Slack: one summary DM per SE per deal with new images.
    let notified = 0;
    if (SLACK_BOT_TOKEN) {
      for (const { deal, count } of Object.values(perDealNew)) {
        const seName: string | null = deal.owner_se || null;
        const slackId = seName ? (SE_ROSTER[seName]?.slack || null) : null;
        if (!slackId || !count) continue;
        const msg = {
          channel: slackId,
          text: `${count} new image${count === 1 ? "" : "s"} awaiting QC for ${deal.company}`,
          blocks: [
            { type: "section", text: { type: "mrkdwn", text: `🛰️ *${count}* new image${count === 1 ? "" : "s"} captured for *${deal.company}* ${count === 1 ? "is" : "are"} awaiting your QC in the Customer Passport.` } },
            { type: "context", elements: [{ type: "mrkdwn", text: "Auto-synced from IPR · assigned to you as SE" }] },
          ],
        };
        const ok = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: { Authorization: "Bearer " + SLACK_BOT_TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify(msg),
        }).then(r => r.json()).then(j => j && j.ok).catch(() => false);
        if (ok) notified++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      customers_scanned: withCompany.length,
      images_scanned: readyImages.length,
      added,
      se_notified: notified,
      synced_at: new Date().toISOString(),
    }), { headers: Object.assign({}, CORS, { "Content-Type": "application/json" }) });
  } catch (e) {
    console.error("ipr-sync error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e && e.message || e) }), {
      status: 500, headers: Object.assign({}, CORS, { "Content-Type": "application/json" }),
    });
  }
});

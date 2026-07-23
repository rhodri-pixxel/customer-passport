// supabase/functions/attach-feasibility/index.ts
// Called by the internal Feasibility Report Generator (Streamlit, runs on the
// office network) to attach a generated feasibility report to a passport.
// The generator can't be replaced by an edge function because only machines
// on the office network can reach the Static Feasibility Tool — so the
// generator pushes results here instead.
//
// Actions (POST JSON):
//   { action: "list" }
//       → non-archived passports for the generator's picker.
//   { action: "attach", passport_id, author?, pdf: {name, b64},
//     gdoc_url?, note_body?, aoi?: {name, b64}, hubspot?: boolean,
//     fields?: { bandset?, cadence?, data_sources?, window?: {start,end,label} } }
//     hubspot: true also uploads the PDF to HubSpot Files and pins it to
//     the passport's deal as a note attachment (uses HUBSPOT_TOKEN).
//       → uploads the PDF to passport-files storage, appends it to
//         feasibility_files (Profile → Technical requirements) and inserts an
//         attachments row (CS Summary → Attachments); adds the AOI to
//         aoi_files if a file of that name isn't already there; backfills
//         bandset / cadence / data_sources / time_of_interest ONLY when the
//         passport doesn't already have them; posts the Google Doc link as a
//         Notes-tab entry (activity_feed).
//
// Auth: callers must send the shared secret in the `x-attach-secret` header
// (env ATTACH_FEASIBILITY_SECRET) on top of the platform's JWT check.
//
// Deploy:  supabase functions deploy attach-feasibility
// Secret:  supabase secrets set ATTACH_FEASIBILITY_SECRET=<random>

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-attach-secret",
};
const JSON_HEADERS = Object.assign({}, CORS, { "Content-Type": "application/json" });
const STORAGE_BUCKET = "passport-files";
const MAX_FILES = 10; // mirrors the app's cap on feasibility_files / aoi_files

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Constant-time string compare for the shared secret (a plain !== leaks
// match-length timing).
function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// Same sanitisation + naming convention as uploadFile() in the frontend.
async function uploadToStorage(sb: any, passportId: string, name: string,
                               bytes: Uint8Array, contentType: string) {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${passportId}/${Date.now()}_${safeName}`;
  const { error } = await sb.storage.from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return path;
}

serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = Deno.env.get("ATTACH_FEASIBILITY_SECRET");
  if (!secret || !safeEqual(req.headers.get("x-attach-secret") || "", secret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* no body */ }

  try {
    if (body.action === "list") {
      const { data, error } = await sb
        .from("handover_passports")
        .select("id,company,hubspot_deal_name,hubspot_stage,handed_to_cs")
        .eq("archived", false)
        .order("company");
      if (error) throw error;
      return json({ ok: true, passports: data || [] });
    }

    if (body.action !== "attach") {
      return json({ ok: false, error: "unknown action" }, 400);
    }

    const passportId = String(body.passport_id || "");
    if (!passportId) return json({ ok: false, error: "passport_id required" }, 400);
    if (!body.pdf?.b64 || !body.pdf?.name) {
      return json({ ok: false, error: "pdf {name, b64} required" }, 400);
    }
    const author = String(body.author || "Feasibility Generator");

    const { data: p, error: pErr } = await sb
      .from("handover_passports")
      .select("id,company,hubspot_deal_id,bandset,cadence,data_sources," +
              "time_of_interest,feasibility_files,aoi_files")
      .eq("id", passportId).single();
    if (pErr || !p) return json({ ok: false, error: "passport not found" }, 404);

    const done: string[] = [];
    const skipped: string[] = [];

    // All passport-column mutations go through the attach_feasibility_apply
    // RPC (one row-locked transaction, server-side dedupe/caps/backfill).
    // The old pattern — SELECT arrays, mutate in memory across slow storage
    // uploads, overwrite the columns — silently dropped a concurrent user's
    // edit. The stale `p` row below is only used for messages and cheap
    // pre-checks; it is never written back.

    // ── 1. PDF → storage, then atomic append ───────────────────────────
    const pdfBytes = b64ToBytes(body.pdf.b64);
    const pdfPath = await uploadToStorage(sb, passportId, body.pdf.name,
                                          pdfBytes, "application/pdf");
    const feasEntry = { name: body.pdf.name, url: pdfPath, type: "file" };

    const { error: attErr } = await sb.from("attachments").insert({
      passport_id: passportId,
      file_name: body.pdf.name,
      file_type: "application/pdf",
      file_size: `${(pdfBytes.length / 1024).toFixed(0)} KB`,
      storage_path: pdfPath,
      uploaded_by: author,
    });
    if (attErr) skipped.push(`attachments row failed: ${attErr.message}`);
    else done.push("PDF added to attachments (CS Summary)");

    // ── 2. AOI upload (duplicate pre-check only avoids a wasted upload;
    //       the RPC enforces dedupe against the live row) ────────────────
    let aoiEntry: Record<string, unknown> | null = null;
    if (body.aoi?.b64 && body.aoi?.name) {
      const aoiFiles = Array.isArray(p.aoi_files) ? p.aoi_files : [];
      const exists = aoiFiles.some((f: any) =>
        String(f?.name || "").toLowerCase() === String(body.aoi.name).toLowerCase());
      if (exists) {
        skipped.push(`AOI '${body.aoi.name}' already attached`);
      } else {
        const aoiPath = await uploadToStorage(sb, passportId, body.aoi.name,
          b64ToBytes(body.aoi.b64), "application/geo+json");
        aoiEntry = { name: body.aoi.name, url: aoiPath, type: "file" };
      }
    }

    // ── 3. Atomic apply: appends + only-if-empty backfills ─────────────
    const f = body.fields || {};
    const toiEntry = (f.window?.start && f.window?.end)
      ? { start: String(f.window.start), end: String(f.window.end),
          label: String(f.window.label || "Feasibility study window") }
      : null;
    const { data: applied, error: rpcErr } = await sb.rpc("attach_feasibility_apply", {
      p_id: passportId,
      p_feas_entry: feasEntry,
      p_aoi_entry: aoiEntry,
      p_toi_entry: toiEntry,
      p_bandset: f.bandset ? String(f.bandset) : null,
      p_cadence: f.cadence ? String(f.cadence) : null,
      p_data_sources: (Array.isArray(f.data_sources) && f.data_sources.length)
        ? f.data_sources.map(String) : null,
      p_max: MAX_FILES,
    });
    if (rpcErr) throw rpcErr;
    const a: Record<string, boolean> = applied || {};
    if (a.feas_added) done.push("PDF added to feasibility files");
    else skipped.push(`feasibility_files already has ${MAX_FILES} entries — PDF ` +
                      "uploaded to storage but not listed; remove one and re-attach");
    if (aoiEntry) {
      if (a.aoi_added) done.push("AOI added to AOI files");
      else skipped.push(`AOI '${body.aoi.name}' not added (already attached or at the ${MAX_FILES}-file cap)`);
    }
    if (toiEntry) {
      if (a.toi_added) done.push("time-of-interest window added");
      else skipped.push("time-of-interest window already present");
    }
    if (f.bandset && a.bandset_set) done.push("bandset set");
    if (f.cadence && a.cadence_set) done.push("cadence set");
    if (Array.isArray(f.data_sources) && f.data_sources.length && a.data_sources_set) {
      done.push("data sources set");
    }

    // ── 4. PDF → HubSpot deal attachments (upload file + pin via note) ─
    // HubSpot surfaces record "Attachments" through engagements, so the
    // file is uploaded to the Files API and attached to a note that is
    // associated with the deal (associationTypeId 214 = note→deal).
    if (body.hubspot) {
      const hsToken = Deno.env.get("HUBSPOT_TOKEN");
      const dealId = p.hubspot_deal_id;
      if (!hsToken) {
        skipped.push("HubSpot: HUBSPOT_TOKEN not configured on the function");
      } else if (!dealId) {
        skipped.push("HubSpot: passport has no hubspot_deal_id");
      } else {
        try {
          const form = new FormData();
          form.append("file",
                      new Blob([pdfBytes], { type: "application/pdf" }),
                      body.pdf.name);
          form.append("options", JSON.stringify(
            { access: "PRIVATE", overwrite: false }));
          form.append("folderPath", "/feasibility-reports");
          const up = await fetch("https://api.hubapi.com/files/v3/files", {
            method: "POST",
            headers: { Authorization: `Bearer ${hsToken}` },
            body: form,
          });
          if (!up.ok) {
            throw new Error(`file upload ${up.status}: ` +
                            (await up.text()).slice(0, 200));
          }
          const fileId = (await up.json()).id;
          const note = await fetch(
            "https://api.hubapi.com/crm/v3/objects/notes", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${hsToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                properties: {
                  hs_timestamp: new Date().toISOString(),
                  hs_note_body:
                    (body.note_body ? String(body.note_body).trim() :
                     "Feasibility report attached.") +
                    (body.gdoc_url ?
                     `\nGoogle Doc: ${body.gdoc_url}` : ""),
                  hs_attachment_ids: String(fileId),
                },
                associations: [{
                  to: { id: String(dealId) },
                  types: [{ associationCategory: "HUBSPOT_DEFINED",
                            associationTypeId: 214 }],
                }],
              }),
            });
          if (!note.ok) {
            throw new Error(`note create ${note.status}: ` +
                            (await note.text()).slice(0, 200));
          }
          done.push("PDF attached to the HubSpot deal");
        } catch (e) {
          skipped.push(`HubSpot attach failed: ${String((e as any)?.message || e)}`);
        }
      }
    }

    // ── 5. Google Doc link → Notes tab (activity_feed) ─────────────────
    if (body.gdoc_url) {
      const noteBody = (body.note_body ? String(body.note_body).trim() + "\n" : "") +
        `Feasibility report (Google Doc): ${body.gdoc_url}`;
      const { error: noteErr } = await sb.from("activity_feed").insert({
        passport_id: passportId, author, body: noteBody,
        mentions: [], entry_type: "note",
      });
      if (noteErr) skipped.push(`note failed: ${noteErr.message}`);
      else done.push("Google Doc link posted to Notes");
    }

    return json({ ok: true, company: p.company, done, skipped, pdf_path: pdfPath });
  } catch (e) {
    console.error("attach-feasibility error:", e);
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});

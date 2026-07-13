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
//     gdoc_url?, note_body?, aoi?: {name, b64},
//     fields?: { bandset?, cadence?, data_sources?, window?: {start,end,label} } }
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
  if (!secret || req.headers.get("x-attach-secret") !== secret) {
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
      .select("id,company,bandset,cadence,data_sources,time_of_interest," +
              "feasibility_files,aoi_files")
      .eq("id", passportId).single();
    if (pErr || !p) return json({ ok: false, error: "passport not found" }, 404);

    const done: string[] = [];
    const skipped: string[] = [];
    const patch: Record<string, unknown> = {};

    // ── 1. PDF → storage → feasibility_files + attachments row ─────────
    const pdfBytes = b64ToBytes(body.pdf.b64);
    const pdfPath = await uploadToStorage(sb, passportId, body.pdf.name,
                                          pdfBytes, "application/pdf");
    const feasFiles = Array.isArray(p.feasibility_files) ? p.feasibility_files : [];
    if (feasFiles.length < MAX_FILES) {
      patch.feasibility_files =
        [...feasFiles, { name: body.pdf.name, url: pdfPath, type: "file" }];
      done.push("PDF added to feasibility files");
    } else {
      skipped.push(`feasibility_files already has ${MAX_FILES} entries — PDF ` +
                   "uploaded to storage but not listed; remove one and re-attach");
    }
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

    // ── 2. AOI → aoi_files (only if that filename isn't already there) ─
    if (body.aoi?.b64 && body.aoi?.name) {
      const aoiFiles = Array.isArray(p.aoi_files) ? p.aoi_files : [];
      const exists = aoiFiles.some((f: any) =>
        String(f?.name || "").toLowerCase() === String(body.aoi.name).toLowerCase());
      if (exists) {
        skipped.push(`AOI '${body.aoi.name}' already attached`);
      } else if (aoiFiles.length >= MAX_FILES) {
        skipped.push(`aoi_files already has ${MAX_FILES} entries`);
      } else {
        const aoiPath = await uploadToStorage(sb, passportId, body.aoi.name,
          b64ToBytes(body.aoi.b64), "application/geo+json");
        patch.aoi_files =
          [...aoiFiles, { name: body.aoi.name, url: aoiPath, type: "file" }];
        done.push("AOI added to AOI files");
      }
    }

    // ── 3. Backfill technical requirements ONLY where currently empty ──
    const f = body.fields || {};
    if (f.bandset && !p.bandset) { patch.bandset = String(f.bandset); done.push("bandset set"); }
    if (f.cadence && !p.cadence) { patch.cadence = String(f.cadence); done.push("cadence set"); }
    if (Array.isArray(f.data_sources) && f.data_sources.length &&
        !(Array.isArray(p.data_sources) && p.data_sources.length)) {
      patch.data_sources = f.data_sources.map(String);
      done.push("data sources set");
    }
    if (f.window?.start && f.window?.end) {
      const toi = Array.isArray(p.time_of_interest) ? p.time_of_interest : [];
      const dup = toi.some((w: any) => w?.start === f.window.start && w?.end === f.window.end);
      if (dup) {
        skipped.push("time-of-interest window already present");
      } else {
        patch.time_of_interest = [...toi, {
          start: String(f.window.start),
          end: String(f.window.end),
          label: String(f.window.label || "Feasibility study window"),
        }];
        done.push("time-of-interest window added");
      }
    }

    if (Object.keys(patch).length) {
      const { error: upErr } = await sb.from("handover_passports")
        .update(patch).eq("id", passportId);
      if (upErr) throw upErr;
    }

    // ── 4. Google Doc link → Notes tab (activity_feed) ─────────────────
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

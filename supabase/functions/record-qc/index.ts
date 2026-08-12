// record-qc — write an automated image-QC result into the Quality Checks tab.
//
// The Groundstation QC pipeline screens a scene (cloud/haze, band registration,
// striping, geolocation, SNR) and produces a verdict plus an SE recommendation
// (RE-TASK / REPROCESS / USE WITH CAVEATS / FIT FOR USE). This endpoint files
// that result against the customer's passport, so the Quality Checks tab is the
// record of what actually happened without anyone retyping it.
//
// UPSERT, not insert: QC gets re-run as the pipeline improves, so a repeat call
// for the same (organization, image_id) UPDATES the existing row. Re-running a
// batch must not litter the tab with duplicates.
//
// It will not silently overwrite a HUMAN verdict. If the existing row was last
// touched by a person (created_by is not this pipeline) and already reads Pass
// or Fail, the automated result is appended to the notes and the verdict is
// left alone unless `force` is set. A person looked at the pixels; a script
// did not.
//
// Auth: shared secret in `x-attach-secret` (env RECORD_QC_SECRET, falling back
// to ATTACH_FEASIBILITY_SECRET so no new secret is needed to deploy), on top of
// the platform JWT check — the same pattern as attach-feasibility.
//
// Deploy:  supabase functions deploy record-qc
// Secret:  supabase secrets set RECORD_QC_SECRET=<random>   (optional)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-attach-secret",
};
const JSON_HEADERS = Object.assign({}, CORS, { "Content-Type": "application/json" });
const STORAGE_BUCKET = "passport-files";
const PIPELINE = "Groundstation QC";
const MAX_EVIDENCE = 4;

// The table's CHECK constraint allows exactly these three.
const ALLOWED_RESULT = ["Pass", "Fail", "Awaiting QC"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Constant-time compare for the shared secret (a plain !== leaks match-length
// timing) — same helper as attach-feasibility.
function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function uploadEvidence(sb: any, key: string, name: string,
                              bytes: Uint8Array, contentType: string) {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = key + "/" + Date.now() + "_" + safeName;
  const { error } = await sb.storage.from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error("storage upload failed: " + error.message);
  return path;
}

serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = Deno.env.get("RECORD_QC_SECRET")
    || Deno.env.get("ATTACH_FEASIBILITY_SECRET");
  if (!secret || !safeEqual(req.headers.get("x-attach-secret") || "", secret)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* no body */ }

  const organization = String(body.organization || body.company || "").trim();
  const imageId = String(body.image_id || "").trim();
  if (!organization) return json({ ok: false, error: "organization required" }, 400);
  if (!imageId) return json({ ok: false, error: "image_id required" }, 400);

  const qcResult = String(body.qc_result || "Awaiting QC");
  if (ALLOWED_RESULT.indexOf(qcResult) === -1) {
    return json({
      ok: false,
      error: "qc_result must be one of " + ALLOWED_RESULT.join(", ")
        + " (got " + qcResult + ")",
    }, 400);
  }

  // ---- find the passport, so the entry lands on the right deal -----------
  let passportId: string | null = body.passport_id || null;
  if (!passportId) {
    const { data } = await sb.from("handover_passports")
      .select("id, company").ilike("company", organization).limit(1);
    if (data && data.length) passportId = data[0].id;
    if (!passportId) {
      const { data: fuzzy } = await sb.from("handover_passports")
        .select("id, company").ilike("company", "%" + organization + "%").limit(2);
      // accept a fuzzy match only when it is unambiguous
      if (fuzzy && fuzzy.length === 1) passportId = fuzzy[0].id;
    }
  }

  // ---- is there already a row for this image? ----------------------------
  const { data: existingRows } = await sb.from("quality_checks")
    .select("id, qc_result, created_by, qc_notes")
    .eq("organization", organization)
    .eq("image_id", imageId)
    .order("created_at", { ascending: false })
    .limit(1);
  const existing = (existingRows && existingRows.length) ? existingRows[0] : null;

  const humanVerdict = !!existing
    && existing.created_by !== PIPELINE
    && ["Pass", "Fail"].indexOf(existing.qc_result) !== -1;
  const deferToHuman = humanVerdict && body.force !== true;

  // ---- evidence: the QC sheet / overview PNG -----------------------------
  let evidencePath: string | null = null;
  const evidence = Array.isArray(body.evidence)
    ? body.evidence.slice(0, MAX_EVIDENCE) : [];
  if (evidence.length) {
    try {
      const key = passportId || organization.replace(/[^a-zA-Z0-9._-]/g, "_");
      const first = evidence[0];
      evidencePath = await uploadEvidence(
        sb, key, String(first.name || "qc.png"),
        b64ToBytes(String(first.b64 || "")),
        String(first.content_type || "image/png"));
    } catch (e) {
      // evidence is a nice-to-have; never lose the verdict over an upload
      console.error("evidence upload failed:", String(e));
    }
  }

  const row: Record<string, unknown> = {
    organization: organization,
    image_id: imageId,
    qc_notes: String(body.qc_notes || "").slice(0, 4000),
    created_by: PIPELINE,
  };
  if (passportId) row.passport_id = passportId;
  if (body.usecase) row.usecase = String(body.usecase);
  if (body.bandset) row.bandset = String(body.bandset);
  if (body.ipr_info) row.ipr_info = String(body.ipr_info).slice(0, 2000);
  if (body.location) row.location = String(body.location);
  if (body.type) {
    row.type = ["Sample", "Paid"].indexOf(body.type) !== -1 ? body.type : "Sample";
  }
  if (body.assignee) row.assignee = String(body.assignee);
  if (body.assignee_email) row.assignee_email = String(body.assignee_email);
  if (typeof body.mvp_image === "boolean") row.mvp_image = body.mvp_image;
  if (body.qc_required_by) row.qc_required_by = body.qc_required_by;
  if (evidencePath) row.photo_evidence_path = evidencePath;
  if (!deferToHuman) row.qc_result = qcResult;

  let action = "";
  let id = "";
  if (existing) {
    // Never destroy notes a person wrote. If the existing row was authored by
    // a human, keep their text and append ours underneath - their note is the
    // context for why the entry exists at all.
    const humanNotes = existing.created_by !== PIPELINE
      && String(existing.qc_notes || "").trim();
    if (humanNotes && !deferToHuman && body.replace_notes !== true) {
      const stamp = new Date().toISOString().slice(0, 10);
      row.qc_notes = existing.qc_notes + "\n\n[" + stamp + " " + PIPELINE
        + "] " + row.qc_notes;
      // created_by DOES become the pipeline here, deliberately. If we set the
      // verdict, we own the verdict - and the row must stay updatable on the
      // next run. Leaving authorship with the human made the guard below
      // mistake our own Pass for theirs and freeze the row after one write
      // (caught testing FF02 14937). Their words are preserved above; what
      // changes hands is only responsibility for the Pass/Fail.
    }
    if (deferToHuman) {
      // Leave the row untouched. Appending "automated verdict X" on every
      // run grows the notes without bound (four test calls, four lines), and
      // the caller already learns the outcome from this response.
      return json({
        ok: true, id: existing.id, action: "skipped (human verdict kept)",
        organization: organization, image_id: imageId,
        qc_result: existing.qc_result, automated_verdict: qcResult,
        passport_linked: !!passportId,
        note: "a person set this verdict; pass force:true to override",
      });
    }
    const { error } = await sb.from("quality_checks").update(row).eq("id", existing.id);
    if (error) return json({ ok: false, error: error.message }, 500);
    id = existing.id;
    action = deferToHuman ? "annotated (human verdict kept)" : "updated";
  } else {
    const { data, error } = await sb.from("quality_checks")
      .insert(row).select("id").single();
    if (error) return json({ ok: false, error: error.message }, 500);
    id = data.id;
    action = "created";
  }

  return json({
    ok: true,
    id: id,
    action: action,
    organization: organization,
    image_id: imageId,
    qc_result: deferToHuman ? existing.qc_result : qcResult,
    passport_linked: !!passportId,
    evidence_path: evidencePath,
  });
});

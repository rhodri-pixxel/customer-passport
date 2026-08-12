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


// Which customer does this image belong to? The QC pipeline knows the scene,
// not the account, so resolve it from delivered_images - the catalog sync,
// i.e. the record of what was actually delivered to whom.
//
// Id formats do not agree across systems: the catalog writes "FF03 0000004320",
// the QC tab shows both that and "FF02 14937", and the pipeline knows
// "FF02_20260711_00501045_0000014937_L2A". So match on the DIGITS, then
// confirm the satellite when both sides carry one. An ambiguous match returns
// null rather than a guess - filing QC against the wrong customer is worse
// than filing none.
function idDigits(s: string): string {
  const nums = String(s || "").match(/\d+/g) || [];
  if (!nums.length) return "";
  // the frame id is the longest run of digits (dates are 8, frames 4-10)
  const best = nums.reduce((a, b) => (b.length >= a.length ? b : a), "");
  return best.replace(/^0+/, "") || "0";
}
function satOf(s: string): string {
  const m = String(s || "").toUpperCase().match(/FF\d{2}/);
  return m ? m[0] : "";
}

async function resolveOrg(sb: any, imageId: string, sceneName: string) {
  const digits = idDigits(imageId) || idDigits(sceneName);
  if (!digits) return { org: null, why: "no numeric id to match on" };
  const sat = satOf(imageId) || satOf(sceneName);
  const { data, error } = await sb.from("delivered_images")
    .select("org_name, org_id, passport_id, image_id")
    .ilike("image_id", "%" + digits + "%")
    .limit(50);
  if (error) return { org: null, why: "lookup failed: " + error.message };
  const hits = (data || []).filter((r: any) => {
    if (idDigits(r.image_id) !== digits) return false;
    const rs = satOf(r.image_id);
    return !sat || !rs || rs === sat;
  });
  if (!hits.length) {
    // delivered_images only holds what has actually been DELIVERED, and most
    // QC'd scenes are samples or tasking - measured, it covered 1 of 9 real
    // ids. So fall back to the Quality Checks tab itself: if someone has
    // already filed an entry for this image, the customer is settled.
    const { data: qcRows } = await sb.from("quality_checks")
      .select("organization, image_id, passport_id")
      .ilike("image_id", "%" + digits + "%")
      .limit(50);
    const qcHits = (qcRows || []).filter((r: any) => {
      if (idDigits(r.image_id) !== digits) return false;
      const rs = satOf(r.image_id);
      return !sat || !rs || rs === sat;
    });
    const qcOrgs = Array.from(new Set(qcHits.map((h: any) => h.organization).filter(Boolean)));
    if (qcOrgs.length === 1) {
      return { org: qcOrgs[0], passport_id: qcHits[0].passport_id || null,
               why: "matched an existing Quality Checks entry" };
    }
    if (qcOrgs.length > 1) {
      return { org: null, why: "ambiguous - existing QC entries name " + qcOrgs.join(" / ") };
    }
    return { org: null, why: "not in delivered_images or the Quality Checks tab" };
  }
  const orgs = Array.from(new Set(hits.map((h: any) => h.org_name).filter(Boolean)));
  if (orgs.length > 1) {
    return { org: null, why: "ambiguous - delivered to " + orgs.join(" / ") };
  }
  return { org: orgs[0] || null, passport_id: hits[0].passport_id || null,
           why: "matched delivered_images" };
}

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

  let organization = String(body.organization || body.company || "").trim();
  const imageId = String(body.image_id || "").trim();
  if (!imageId) return json({ ok: false, error: "image_id required" }, 400);

  // No customer given? Resolve it from what was actually delivered.
  let orgSource = "supplied";
  if (!organization) {
    const res = await resolveOrg(sb, imageId, String(body.scene || ""));
    if (!res.org) {
      return json({ ok: false, error: "could not resolve customer: " + res.why,
                    image_id: imageId, hint: "pass organization explicitly" }, 409);
    }
    organization = res.org;
    orgSource = res.why;
    if (res.passport_id && !body.passport_id) body.passport_id = res.passport_id;
  }

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
  // Match the same way the resolver does - on DIGITS, not exact text. An
  // exact match would treat "FF01 15348" and "FF01 0000015348" as different
  // images and create a second row for the same scene (caught filing
  // TheiaX FF01 15348). Prefer the OLDEST row so an entry a person started
  // stays the one of record.
  const wantDigits = idDigits(imageId);
  const wantSat = satOf(imageId);
  const { data: candidateRows } = await sb.from("quality_checks")
    .select("id, qc_result, created_by, qc_notes, image_id, created_at")
    .eq("organization", organization)
    .ilike("image_id", "%" + wantDigits + "%")
    .order("created_at", { ascending: true })
    .limit(50);
  const matches = (candidateRows || []).filter((r: any) => {
    if (idDigits(r.image_id) !== wantDigits) return false;
    const rs = satOf(r.image_id);
    return !wantSat || !rs || rs === wantSat;
  });
  const existing = matches.length ? matches[0] : null;

  // Self-heal duplicates, but ONLY ones this pipeline created. An exact-text
  // match used to treat "FF01 15348" and "FF01 0000015348" as different
  // images, so a second row could appear for one scene. Rows a person made
  // are never touched.
  let removed = 0;
  if (matches.length > 1) {
    const extras = matches.slice(1)
      .filter((r: any) => r.created_by === PIPELINE)
      .map((r: any) => r.id);
    if (extras.length) {
      const { error: delErr } = await sb.from("quality_checks")
        .delete().in("id", extras);
      if (!delErr) removed = extras.length;
    }
  }
  const duplicates = matches.length > 1 ? matches.length : 0;

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
    image_id: imageId,   // replaced below when a row already exists
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
    row.image_id = existing.image_id;   // keep the id format already on file
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
        passport_linked: !!passportId, duplicate_rows_removed: removed,
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
    org_source: orgSource,
    duplicate_rows: duplicates, duplicate_rows_removed: removed,
    evidence_path: evidencePath,
  });
});

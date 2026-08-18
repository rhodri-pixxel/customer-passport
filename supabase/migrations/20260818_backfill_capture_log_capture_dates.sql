-- One-off data repair, paired with the code fix in the same release.
--
-- logQcToCaptureLog used to stamp every mirrored QC entry with the date it ran
-- (`new Date()`), so a July capture reviewed in August was filed under August
-- and sat out of order with the Tasked/Captured events it belongs beside. New
-- entries now use the QC entry's date_captured; this corrects the ones already
-- written.
--
-- HOW ROWS ARE MATCHED
--   Auto-created entries carry a note beginning "Image {image_id} …" built from
--   the QC entry, and share its passport_id. That pair is the join. Entries
--   typed by hand don't follow that shape and are left alone — correct, since a
--   hand-entered date was never wrong.
--
-- SAFETY
--   · Touches capture_log.entry_date only. Nothing else is written.
--   · Skips rows whose QC entry has no date_captured — nothing better to use.
--   · Idempotent: the `<>` guard means a second run changes nothing.
--   · NOT reversible. Run step 1 and read the output before running step 2.
--
-- Both statements below share the same `mapped` CTE, so the preview shows
-- exactly the rows the update will touch — they cannot drift apart.

-- ─────────────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW. Changes nothing. Read the output before step 2.
-- ─────────────────────────────────────────────────────────────────────
WITH mapped AS (
  SELECT
    cl.id                            AS log_id,
    cl.passport_id,
    cl.status,
    cl.entry_date                    AS dated_now,
    m.date_captured                  AS would_become,
    cl.note
  FROM public.capture_log cl
  JOIN LATERAL (
    -- The QC entry this log line was generated from. LIMIT 1 with an explicit
    -- order so a scene logged twice can't make the result depend on planner whim.
    SELECT qc.date_captured
    FROM public.quality_checks qc
    WHERE qc.passport_id = cl.passport_id
      AND qc.image_id IS NOT NULL
      AND qc.image_id <> ''
      AND cl.note LIKE 'Image ' || qc.image_id || '%'
      AND qc.date_captured IS NOT NULL
    ORDER BY qc.created_at DESC
    LIMIT 1
  ) m ON true
  WHERE cl.status IN ('QC Passed', 'QC Failed')
    AND cl.entry_date <> m.date_captured
)
SELECT
  hp.company,
  mapped.status,
  mapped.dated_now,
  mapped.would_become,
  (mapped.would_become - mapped.dated_now) AS days_moved,
  left(mapped.note, 70) AS note
FROM mapped
LEFT JOIN public.handover_passports hp ON hp.id = mapped.passport_id
ORDER BY hp.company, mapped.dated_now DESC;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 2 — APPLY. Uncomment and run only once step 1 lists what you expect.
-- ─────────────────────────────────────────────────────────────────────
-- WITH mapped AS (
--   SELECT cl.id AS log_id, m.date_captured AS would_become
--   FROM public.capture_log cl
--   JOIN LATERAL (
--     SELECT qc.date_captured
--     FROM public.quality_checks qc
--     WHERE qc.passport_id = cl.passport_id
--       AND qc.image_id IS NOT NULL
--       AND qc.image_id <> ''
--       AND cl.note LIKE 'Image ' || qc.image_id || '%'
--       AND qc.date_captured IS NOT NULL
--     ORDER BY qc.created_at DESC
--     LIMIT 1
--   ) m ON true
--   WHERE cl.status IN ('QC Passed', 'QC Failed')
--     AND cl.entry_date <> m.date_captured
-- )
-- UPDATE public.capture_log cl
-- SET entry_date = mapped.would_become
-- FROM mapped
-- WHERE cl.id = mapped.log_id;

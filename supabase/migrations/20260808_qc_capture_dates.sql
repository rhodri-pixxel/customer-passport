-- QC entry dates: what the field was actually being used for.
--
-- `feedback_milestone` was a date on quality_checks that everyone filled in with
-- the date the image was CAPTURED — the label said one thing, the data said
-- another. Rename it in the UI by moving to a column that says what it holds,
-- and add the second date the QC workflow actually needs: when the SE finished
-- reviewing it.
--
--   date_captured        when the satellite acquired the image. Auto-filled from
--                        IPR when the entry is promoted from the feed, otherwise
--                        typed by the CS/SE logging the entry.
--   se_qc_completed_on   when the SE marked it Pass/Fail. Auto-stamped to today
--                        the first time the result leaves "Awaiting QC"; still
--                        hand-editable for entries reviewed before they're logged.

ALTER TABLE public.quality_checks
  ADD COLUMN IF NOT EXISTS date_captured date,
  ADD COLUMN IF NOT EXISTS se_qc_completed_on date;

-- Carry the existing values across — they were capture dates all along.
UPDATE public.quality_checks
   SET date_captured = feedback_milestone
 WHERE date_captured IS NULL
   AND feedback_milestone IS NOT NULL;

-- Best-effort backfill of the completion date for entries that are already
-- Pass/Fail: created_at is the closest thing we have to "when it was reviewed".
UPDATE public.quality_checks
   SET se_qc_completed_on = created_at::date
 WHERE se_qc_completed_on IS NULL
   AND qc_result IN ('Pass', 'Fail');

COMMENT ON COLUMN public.quality_checks.date_captured IS
  'Acquisition date of the image. Auto-filled from IPR where known. Replaces feedback_milestone.';
COMMENT ON COLUMN public.quality_checks.se_qc_completed_on IS
  'Date the SE completed the QC (auto-stamped when the result first becomes Pass/Fail).';
COMMENT ON COLUMN public.quality_checks.feedback_milestone IS
  'DEPRECATED — superseded by date_captured. Kept only so the backfill above is reversible; drop once verified.';

-- Once the app has been running on date_captured for a release or two:
--   ALTER TABLE public.quality_checks DROP COLUMN feedback_milestone;

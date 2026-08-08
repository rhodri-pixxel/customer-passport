-- Structured failure reasons on QC entries.
--
-- Marking an image failed on the Execution tab's capture log has always asked
-- WHY (BBR, cloud cover, striping…). Marking it Fail on a QC entry asked
-- nothing, so the reason lived in free-text notes or nowhere at all, and the two
-- records of the same failure weren't comparable.
--
-- Same column shape and same string format as capture_log.fail_reason
-- ("BBR, Other: colour balance") so a failed QC entry hands its reasons straight
-- to the capture-log entry it mirrors, with no translation.

ALTER TABLE public.quality_checks
  ADD COLUMN IF NOT EXISTS fail_reasons text;

COMMENT ON COLUMN public.quality_checks.fail_reasons IS
  'Comma-separated QC failure reasons, same vocabulary and format as capture_log.fail_reason. Only meaningful when qc_result = ''Fail''.';

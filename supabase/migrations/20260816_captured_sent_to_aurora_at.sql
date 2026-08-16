-- The IPR feed's rolling window is measured on WHEN AN IMAGE REACHED AURORA,
-- not when it was captured.
--
-- Scenes get reprocessed: an image captured months ago can fail, be re-run on a
-- newer pipeline, pass, and only then be sent to Aurora. That image is new work
-- for the QC team the day it lands, however old the capture is. Windowing on
-- capture date would have hidden exactly those.
--
-- sent_to_aurora_at is IPR's `status_timestamp` — the moment the row reached its
-- current processing_status, which for the statuses we mirror is the moment it
-- was sent to Aurora. captured_at (IPR's `start_time`) stays, but is now
-- display-only: shown in the feed, carried onto a promoted QC entry's
-- "Date captured", and never used for the window.

ALTER TABLE public.captured_images
  ADD COLUMN IF NOT EXISTS sent_to_aurora_at timestamp with time zone;

-- Existing rows have no status timestamp recorded. Seed from synced_at — when we
-- first saw the image, which for a feed row is within a day or so of it landing.
-- The next sync overwrites this with the real value for anything still in window.
UPDATE public.captured_images
   SET sent_to_aurora_at = synced_at
 WHERE sent_to_aurora_at IS NULL;

-- The feed sorts and prunes on this column.
CREATE INDEX IF NOT EXISTS idx_captured_images_sent_to_aurora
  ON public.captured_images USING btree (sent_to_aurora_at DESC);

COMMENT ON COLUMN public.captured_images.sent_to_aurora_at IS
  'IPR status_timestamp — when the image reached its QC-ready status. Drives the feed''s rolling window and sort order.';
COMMENT ON COLUMN public.captured_images.captured_at IS
  'IPR start_time — when the satellite acquired the image. Display only; a reprocessed scene can be far older than the window.';

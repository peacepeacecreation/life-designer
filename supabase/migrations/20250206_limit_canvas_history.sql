-- Add automatic cleanup of old canvas history versions
-- Keep only last 50 versions per canvas

-- Function to cleanup old versions (keep only last 50)
CREATE OR REPLACE FUNCTION cleanup_old_canvas_history()
RETURNS TRIGGER AS $$
DECLARE
  version_count INTEGER;
  versions_to_delete INTEGER;
BEGIN
  -- Count total versions for this canvas
  SELECT COUNT(*)
  INTO version_count
  FROM canvas_history
  WHERE canvas_id = NEW.canvas_id;

  -- If more than 50, delete oldest ones
  IF version_count > 50 THEN
    versions_to_delete := version_count - 50;

    DELETE FROM canvas_history
    WHERE id IN (
      SELECT id
      FROM canvas_history
      WHERE canvas_id = NEW.canvas_id
      ORDER BY version_number ASC
      LIMIT versions_to_delete
    );

    -- Optionally log cleanup
    -- RAISE NOTICE 'Cleaned up % old versions for canvas %', versions_to_delete, NEW.canvas_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after insert
DROP TRIGGER IF EXISTS cleanup_canvas_history_trigger ON canvas_history;
CREATE TRIGGER cleanup_canvas_history_trigger
  AFTER INSERT ON canvas_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_canvas_history();

-- Alternative: Cleanup based on age (older than 30 days)
-- Uncomment if you prefer time-based cleanup instead of count-based

-- CREATE OR REPLACE FUNCTION cleanup_old_canvas_history_by_age()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM canvas_history
--   WHERE created_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Schedule to run daily (requires pg_cron extension)
-- -- SELECT cron.schedule('cleanup-canvas-history', '0 2 * * *', 'SELECT cleanup_old_canvas_history_by_age()');

COMMENT ON FUNCTION cleanup_old_canvas_history() IS 'Automatically keeps only last 50 versions per canvas';

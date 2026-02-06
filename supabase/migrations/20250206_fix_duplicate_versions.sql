-- Fix canvas history trigger to skip duplicate versions
-- Only save when nodes or edges actually change

-- Drop old trigger
DROP TRIGGER IF EXISTS canvas_history_trigger ON canvas_workspaces;

-- Drop old function
DROP FUNCTION IF EXISTS create_canvas_history_snapshot();

-- Create improved function that checks for changes
CREATE OR REPLACE FUNCTION create_canvas_history_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  last_nodes JSONB;
  last_edges JSONB;
  has_changes BOOLEAN := true;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM canvas_history
  WHERE canvas_id = NEW.id;

  -- For updates, check if data actually changed
  IF TG_OP = 'UPDATE' THEN
    -- Get the last saved version
    SELECT nodes, edges
    INTO last_nodes, last_edges
    FROM canvas_history
    WHERE canvas_id = NEW.id
    ORDER BY version_number DESC
    LIMIT 1;

    -- Compare with new data
    -- If both nodes and edges are identical, skip saving
    IF last_nodes IS NOT NULL AND last_edges IS NOT NULL THEN
      IF last_nodes = NEW.nodes AND last_edges = NEW.edges THEN
        has_changes := false;
      END IF;
    END IF;
  END IF;

  -- Only insert if there are actual changes or it's a new canvas
  IF has_changes THEN
    INSERT INTO canvas_history (
      canvas_id,
      user_id,
      nodes,
      edges,
      title,
      version_number,
      change_description
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.nodes,
      NEW.edges,
      NEW.title,
      next_version,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Initial version'
        ELSE 'Updated version'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER canvas_history_trigger
  AFTER INSERT OR UPDATE ON canvas_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_canvas_history_snapshot();

COMMENT ON FUNCTION create_canvas_history_snapshot() IS 'Creates history snapshots only when nodes or edges actually change';

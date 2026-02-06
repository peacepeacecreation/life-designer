-- Canvas History/Versioning Table
-- Автоматично зберігає всі зміни canvas для можливості відновлення

CREATE TABLE IF NOT EXISTS canvas_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Snapshot of canvas data
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT,

  -- Version info
  version_number INTEGER NOT NULL,
  change_description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for fast lookups
  CONSTRAINT canvas_history_canvas_version_unique UNIQUE (canvas_id, version_number)
);

-- Index for fast canvas lookups
CREATE INDEX IF NOT EXISTS idx_canvas_history_canvas_id ON canvas_history(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_history_created_at ON canvas_history(created_at DESC);

-- Enable RLS
ALTER TABLE canvas_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own canvas history"
  ON canvas_history FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert their own canvas history"
  ON canvas_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Function to automatically create history snapshots
CREATE OR REPLACE FUNCTION create_canvas_history_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM canvas_history
  WHERE canvas_id = NEW.id;

  -- Insert history record
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
    'Auto-saved version'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create history on every canvas update
DROP TRIGGER IF EXISTS canvas_history_trigger ON canvas_workspaces;
CREATE TRIGGER canvas_history_trigger
  AFTER INSERT OR UPDATE ON canvas_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_canvas_history_snapshot();

-- Function to restore canvas from history
CREATE OR REPLACE FUNCTION restore_canvas_from_history(
  p_canvas_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_history_record RECORD;
BEGIN
  -- Get the history record
  SELECT nodes, edges, title
  INTO v_history_record
  FROM canvas_history
  WHERE canvas_id = p_canvas_id
    AND version_number = p_version_number
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'History version not found or access denied';
  END IF;

  -- Update the canvas (this will also create a new history entry)
  UPDATE canvas_workspaces
  SET
    nodes = v_history_record.nodes,
    edges = v_history_record.edges,
    title = v_history_record.title
  WHERE id = p_canvas_id
    AND user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE canvas_history IS 'Stores version history of canvas workspaces for recovery';
COMMENT ON FUNCTION create_canvas_history_snapshot() IS 'Automatically creates history snapshots on canvas updates';
COMMENT ON FUNCTION restore_canvas_from_history(UUID, INTEGER) IS 'Restores canvas to a specific version from history';

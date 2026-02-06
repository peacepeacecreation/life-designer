-- Add manual save slots feature
-- Users can save up to 10 named versions manually

-- Add fields to canvas_history
ALTER TABLE canvas_history
ADD COLUMN IF NOT EXISTS save_type TEXT DEFAULT 'auto' CHECK (save_type IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS save_name TEXT,
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_canvas_history_save_type ON canvas_history(canvas_id, save_type, created_at DESC);

-- Update cleanup function to respect manual saves
CREATE OR REPLACE FUNCTION cleanup_old_canvas_history()
RETURNS TRIGGER AS $$
DECLARE
  auto_version_count INTEGER;
  manual_version_count INTEGER;
  versions_to_delete INTEGER;
BEGIN
  -- Count auto versions for this canvas
  SELECT COUNT(*)
  INTO auto_version_count
  FROM canvas_history
  WHERE canvas_id = NEW.canvas_id
    AND save_type = 'auto';

  -- Count manual versions for this canvas
  SELECT COUNT(*)
  INTO manual_version_count
  FROM canvas_history
  WHERE canvas_id = NEW.canvas_id
    AND save_type = 'manual';

  -- Cleanup auto versions (keep only last 50)
  IF auto_version_count > 50 THEN
    versions_to_delete := auto_version_count - 50;

    DELETE FROM canvas_history
    WHERE id IN (
      SELECT id
      FROM canvas_history
      WHERE canvas_id = NEW.canvas_id
        AND save_type = 'auto'
      ORDER BY version_number ASC
      LIMIT versions_to_delete
    );
  END IF;

  -- Cleanup manual versions (keep only last 10)
  IF manual_version_count > 10 THEN
    versions_to_delete := manual_version_count - 10;

    DELETE FROM canvas_history
    WHERE id IN (
      SELECT id
      FROM canvas_history
      WHERE canvas_id = NEW.canvas_id
        AND save_type = 'manual'
        AND is_protected = false  -- Don't delete protected saves
      ORDER BY created_at ASC
      LIMIT versions_to_delete
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add function to create manual save
CREATE OR REPLACE FUNCTION create_manual_save(
  p_canvas_id UUID,
  p_save_name TEXT,
  p_is_protected BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_canvas RECORD;
  v_next_version INTEGER;
  v_new_id UUID;
BEGIN
  -- Get canvas data
  SELECT user_id, nodes, edges, title
  INTO v_canvas
  FROM canvas_workspaces
  WHERE id = p_canvas_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canvas not found';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM canvas_history
  WHERE canvas_id = p_canvas_id;

  -- Create manual save
  INSERT INTO canvas_history (
    canvas_id,
    user_id,
    nodes,
    edges,
    title,
    version_number,
    save_type,
    save_name,
    is_protected,
    change_description
  ) VALUES (
    p_canvas_id,
    v_canvas.user_id,
    v_canvas.nodes,
    v_canvas.edges,
    v_canvas.title,
    v_next_version,
    'manual',
    p_save_name,
    p_is_protected,
    'Manual save: ' || COALESCE(p_save_name, 'Unnamed')
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing records to be 'auto' type
UPDATE canvas_history
SET save_type = 'auto'
WHERE save_type IS NULL;

COMMENT ON COLUMN canvas_history.save_type IS 'auto = automatic autosave, manual = user-created save slot';
COMMENT ON COLUMN canvas_history.save_name IS 'User-given name for manual saves (e.g., "v1.0", "before presentation")';
COMMENT ON COLUMN canvas_history.is_protected IS 'If true, manual save will not be auto-deleted even if > 10 slots';
COMMENT ON FUNCTION create_manual_save(UUID, TEXT, BOOLEAN) IS 'Create a manual save slot for a canvas';

-- Save Slots System - Like save slots in video games
-- Each slot has its own snapshot + separate autosave history

-- Table for save slots
CREATE TABLE IF NOT EXISTS canvas_save_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
  slot_name TEXT, -- Optional user-given name

  -- Current state of this slot
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each canvas can have max 5 slots
  CONSTRAINT unique_canvas_slot UNIQUE (canvas_id, slot_number)
);

-- Add slot_id to canvas_history to track which slot each version belongs to
ALTER TABLE canvas_history
ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES canvas_save_slots(id) ON DELETE CASCADE;

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_canvas_save_slots_canvas ON canvas_save_slots(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_save_slots_user ON canvas_save_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_history_slot ON canvas_history(slot_id, created_at DESC);

-- Update cleanup function to work per slot
CREATE OR REPLACE FUNCTION cleanup_old_canvas_history()
RETURNS TRIGGER AS $$
DECLARE
  version_count INTEGER;
  versions_to_delete INTEGER;
BEGIN
  -- If this is a slot-based save, count versions for THIS SLOT only
  IF NEW.slot_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO version_count
    FROM canvas_history
    WHERE slot_id = NEW.slot_id
      AND save_type = 'auto';

    -- Keep only last 50 versions PER SLOT
    IF version_count > 50 THEN
      versions_to_delete := version_count - 50;

      DELETE FROM canvas_history
      WHERE id IN (
        SELECT id
        FROM canvas_history
        WHERE slot_id = NEW.slot_id
          AND save_type = 'auto'
        ORDER BY created_at ASC
        LIMIT versions_to_delete
      );
    END IF;
  ELSE
    -- Legacy behavior for non-slot saves (main canvas)
    SELECT COUNT(*)
    INTO version_count
    FROM canvas_history
    WHERE canvas_id = NEW.canvas_id
      AND slot_id IS NULL
      AND save_type = 'auto';

    IF version_count > 50 THEN
      versions_to_delete := version_count - 50;

      DELETE FROM canvas_history
      WHERE id IN (
        SELECT id
        FROM canvas_history
        WHERE canvas_id = NEW.canvas_id
          AND slot_id IS NULL
          AND save_type = 'auto'
        ORDER BY created_at ASC
        LIMIT versions_to_delete
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to save to a specific slot
CREATE OR REPLACE FUNCTION save_to_slot(
  p_canvas_id UUID,
  p_slot_number INTEGER,
  p_nodes JSONB,
  p_edges JSONB,
  p_slot_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_slot_id UUID;
  v_slot_exists BOOLEAN;
BEGIN
  -- Get user_id from canvas
  SELECT user_id INTO v_user_id
  FROM canvas_workspaces
  WHERE id = p_canvas_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canvas not found';
  END IF;

  -- Check if slot exists
  SELECT id, true INTO v_slot_id, v_slot_exists
  FROM canvas_save_slots
  WHERE canvas_id = p_canvas_id
    AND slot_number = p_slot_number;

  IF v_slot_exists THEN
    -- Update existing slot
    UPDATE canvas_save_slots
    SET
      nodes = p_nodes,
      edges = p_edges,
      slot_name = COALESCE(p_slot_name, slot_name),
      last_modified_at = now()
    WHERE id = v_slot_id;
  ELSE
    -- Create new slot
    INSERT INTO canvas_save_slots (
      canvas_id,
      user_id,
      slot_number,
      slot_name,
      nodes,
      edges
    ) VALUES (
      p_canvas_id,
      v_user_id,
      p_slot_number,
      p_slot_name,
      p_nodes,
      p_edges
    )
    RETURNING id INTO v_slot_id;
  END IF;

  RETURN v_slot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to load a slot
CREATE OR REPLACE FUNCTION load_slot(
  p_canvas_id UUID,
  p_slot_number INTEGER
)
RETURNS TABLE (
  slot_id UUID,
  nodes JSONB,
  edges JSONB,
  slot_name TEXT,
  last_modified_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    canvas_save_slots.nodes,
    canvas_save_slots.edges,
    canvas_save_slots.slot_name,
    canvas_save_slots.last_modified_at
  FROM canvas_save_slots
  WHERE canvas_id = p_canvas_id
    AND slot_number = p_slot_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE canvas_save_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slots"
  ON canvas_save_slots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own slots"
  ON canvas_save_slots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own slots"
  ON canvas_save_slots FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own slots"
  ON canvas_save_slots FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE canvas_save_slots IS 'Save slots like in video games - each slot has separate autosave history';
COMMENT ON FUNCTION save_to_slot(UUID, INTEGER, JSONB, JSONB, TEXT) IS 'Save current canvas state to a specific slot';
COMMENT ON FUNCTION load_slot(UUID, INTEGER) IS 'Load canvas state from a specific slot';

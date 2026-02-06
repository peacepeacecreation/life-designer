-- Canvas Activity Events
-- Tracks user actions in canvas: creating blocks, completing prompts, etc.

CREATE TABLE IF NOT EXISTS canvas_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event type (what happened)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'block_created',
    'goal_created',
    'block_deleted',
    'block_renamed',
    'prompt_added',
    'prompt_deleted',
    'prompt_completed',
    'prompt_uncompleted',
    'clockify_started',
    'clockify_stopped'
  )),

  -- Target entity
  target_id TEXT NOT NULL, -- node.id or "node.id:prompt.id" for prompts

  -- Event data (flexible JSON for different event types)
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Optional: link to slot if using save slots
  slot_id UUID REFERENCES canvas_save_slots(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_canvas_events_canvas ON canvas_events(canvas_id, created_at DESC);
CREATE INDEX idx_canvas_events_user ON canvas_events(user_id, created_at DESC);
CREATE INDEX idx_canvas_events_type ON canvas_events(event_type, created_at DESC);
CREATE INDEX idx_canvas_events_slot ON canvas_events(slot_id, created_at DESC);

-- RLS Policies
ALTER TABLE canvas_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own canvas events"
  ON canvas_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own canvas events"
  ON canvas_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Cleanup function: keep only last 500 events per canvas
CREATE OR REPLACE FUNCTION cleanup_old_canvas_events()
RETURNS TRIGGER AS $$
DECLARE
  event_count INTEGER;
  events_to_delete INTEGER;
BEGIN
  -- Count events for this canvas
  SELECT COUNT(*)
  INTO event_count
  FROM canvas_events
  WHERE canvas_id = NEW.canvas_id;

  -- Keep only last 500 events
  IF event_count > 500 THEN
    events_to_delete := event_count - 500;

    DELETE FROM canvas_events
    WHERE id IN (
      SELECT id
      FROM canvas_events
      WHERE canvas_id = NEW.canvas_id
      ORDER BY created_at ASC
      LIMIT events_to_delete
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup old events
CREATE TRIGGER trigger_cleanup_canvas_events
  AFTER INSERT ON canvas_events
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_canvas_events();

COMMENT ON TABLE canvas_events IS 'Activity log for canvas actions: creating blocks, completing prompts, etc. Keeps last 500 events per canvas.';
COMMENT ON COLUMN canvas_events.event_type IS 'Type of event: block_created, prompt_completed, clockify_started, etc.';
COMMENT ON COLUMN canvas_events.target_id IS 'ID of affected entity: node.id or "node.id:prompt.id" for prompts';
COMMENT ON COLUMN canvas_events.event_data IS 'Flexible JSONB data specific to event type';

-- Calendar Events Table
-- Stores user calendar events with optional goal associations and Google Calendar sync

-- ============================================================================
-- TABLE: calendar_events
-- ============================================================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic event information
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Time and duration
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE NOT NULL,

  -- Goal association (optional)
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- Visual customization
  color TEXT,

  -- Google Calendar synchronization
  google_event_id TEXT,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Full-text search support
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C')
  ) STORED,

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user queries
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);

-- Index for goal association queries
CREATE INDEX idx_calendar_events_goal_id ON calendar_events(goal_id);

-- Index for time-based queries (most common)
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON calendar_events(end_time);

-- Composite index for efficient date range queries
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time, end_time);

-- Index for Google Calendar sync
CREATE INDEX idx_calendar_events_google_event_id ON calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;

-- Index for full-text search
CREATE INDEX idx_calendar_events_search ON calendar_events USING GIN(search_vector);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on calendar_events table
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own calendar events
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own calendar events
CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendar events
CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own calendar events
CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE calendar_events IS 'Stores user calendar events with optional goal associations and Google Calendar synchronization';
COMMENT ON COLUMN calendar_events.title IS 'Event title (required)';
COMMENT ON COLUMN calendar_events.description IS 'Event description or notes';
COMMENT ON COLUMN calendar_events.location IS 'Event location (physical or virtual)';
COMMENT ON COLUMN calendar_events.start_time IS 'Event start time with timezone';
COMMENT ON COLUMN calendar_events.end_time IS 'Event end time with timezone';
COMMENT ON COLUMN calendar_events.all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN calendar_events.goal_id IS 'Associated goal (optional, nullified if goal is deleted)';
COMMENT ON COLUMN calendar_events.color IS 'Custom color for the event (hex format)';
COMMENT ON COLUMN calendar_events.google_event_id IS 'Google Calendar event ID for synchronization';
COMMENT ON COLUMN calendar_events.google_calendar_id IS 'Google Calendar ID where this event exists';
COMMENT ON COLUMN calendar_events.last_synced_at IS 'Last time this event was synced with Google Calendar';
COMMENT ON COLUMN calendar_events.search_vector IS 'Full-text search vector (auto-generated from title, description, location)';

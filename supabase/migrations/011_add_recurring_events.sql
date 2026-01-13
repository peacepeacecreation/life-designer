-- Migration: Add recurring_events table
-- Description: Store recurring events patterns with user association and goal linking
-- Created: 2026-01-13

-- Create recurring_events table
CREATE TABLE IF NOT EXISTS recurring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL, -- Format: "HH:MM" (e.g., "13:00")
  duration INTEGER NOT NULL, -- Duration in minutes
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER NOT NULL DEFAULT 1, -- Every N days/weeks/months
  days_of_week INTEGER[], -- For weekly recurrence: [1,2,3,4,5] for weekdays
  end_date TIMESTAMPTZ, -- When recurrence ends (optional)
  recurrence_count INTEGER, -- Or number of occurrences (optional)
  color TEXT,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT valid_interval CHECK (interval > 0),
  CONSTRAINT valid_duration CHECK (duration > 0),
  CONSTRAINT end_date_or_count CHECK (
    (end_date IS NULL AND recurrence_count IS NULL) OR
    (end_date IS NOT NULL AND recurrence_count IS NULL) OR
    (end_date IS NULL AND recurrence_count IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_recurring_events_user_id ON recurring_events(user_id);
CREATE INDEX idx_recurring_events_goal_id ON recurring_events(goal_id);
CREATE INDEX idx_recurring_events_is_active ON recurring_events(is_active);
CREATE INDEX idx_recurring_events_created_at ON recurring_events(created_at DESC);

-- Enable RLS
ALTER TABLE recurring_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recurring events"
  ON recurring_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recurring events"
  ON recurring_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring events"
  ON recurring_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring events"
  ON recurring_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_recurring_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_events_updated_at
  BEFORE UPDATE ON recurring_events
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_events_updated_at();

-- Add comment
COMMENT ON TABLE recurring_events IS 'Stores recurring event patterns for calendar';
COMMENT ON COLUMN recurring_events.start_time IS 'Time in HH:MM format (24-hour)';
COMMENT ON COLUMN recurring_events.duration IS 'Duration in minutes';
COMMENT ON COLUMN recurring_events.frequency IS 'Recurrence frequency: daily, weekly, or monthly';
COMMENT ON COLUMN recurring_events.interval IS 'Repeat every N days/weeks/months';
COMMENT ON COLUMN recurring_events.days_of_week IS 'For weekly: array of days (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN recurring_events.end_date IS 'When recurrence ends (mutually exclusive with recurrence_count)';
COMMENT ON COLUMN recurring_events.recurrence_count IS 'Number of occurrences (mutually exclusive with end_date)';

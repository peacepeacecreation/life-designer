-- Migration: Add weekly snapshots for historical tracking
-- Description: Store immutable snapshots of goals and recurring events settings for each week
-- Created: 2026-01-13

-- ============================================================================
-- Main weekly snapshots table
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Week boundaries (Monday 00:00 to Sunday 23:59)
  week_start_date TIMESTAMPTZ NOT NULL,
  week_end_date TIMESTAMPTZ NOT NULL,

  -- Overall statistics for the week
  total_available_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_allocated_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_completed_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_scheduled_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_time_hours NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  is_frozen BOOLEAN NOT NULL DEFAULT false, -- If manually frozen/saved by user
  snapshot_hash TEXT, -- Hash of all data for change detection

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one snapshot per user per week
  CONSTRAINT unique_user_week UNIQUE(user_id, week_start_date)
);

-- ============================================================================
-- Goal snapshots - settings at the time of snapshot
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_goal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES weekly_snapshots(id) ON DELETE CASCADE,

  -- Goal reference (may be NULL if goal was deleted after snapshot)
  goal_id UUID, -- No FK constraint - goal may be deleted

  -- Goal settings at snapshot time
  goal_name TEXT NOT NULL,
  goal_description TEXT,
  goal_category TEXT NOT NULL CHECK (goal_category IN ('work_startups', 'learning', 'health_sports', 'hobbies')),
  goal_priority TEXT NOT NULL CHECK (goal_priority IN ('critical', 'high', 'medium', 'low')),
  goal_status TEXT NOT NULL CHECK (goal_status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'abandoned', 'ongoing')),
  goal_color TEXT,
  goal_icon_url TEXT,
  goal_url TEXT,

  -- Time allocation (critical for historical tracking)
  time_allocated NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (time_allocated >= 0),

  -- Financial settings
  currency TEXT,
  payment_type TEXT CHECK (payment_type IN ('hourly', 'fixed')),
  hourly_rate NUMERIC(10,2),
  fixed_rate NUMERIC(10,2),
  fixed_rate_period TEXT CHECK (fixed_rate_period IN ('week', 'month')),

  -- Goal timeline
  is_ongoing BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  target_end_date TIMESTAMPTZ,

  -- Statistics (calculated from events)
  time_completed NUMERIC(10,2) NOT NULL DEFAULT 0,
  time_scheduled NUMERIC(10,2) NOT NULL DEFAULT 0,
  time_unscheduled NUMERIC(10,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Recurring event snapshots - settings at the time of snapshot
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_recurring_event_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES weekly_snapshots(id) ON DELETE CASCADE,

  -- Recurring event reference (may be NULL if deleted after snapshot)
  recurring_event_id UUID, -- No FK constraint - may be deleted

  -- Link to goal snapshot (not direct goal_id)
  goal_snapshot_id UUID REFERENCES weekly_goal_snapshots(id) ON DELETE SET NULL,

  -- Event settings at snapshot time
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL, -- Format: "HH:MM"
  duration INTEGER NOT NULL CHECK (duration > 0), -- Duration in minutes
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  days_of_week INTEGER[], -- For weekly recurrence
  color TEXT,

  -- Status at snapshot time
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_weekly_snapshots_user_id ON weekly_snapshots(user_id);
CREATE INDEX idx_weekly_snapshots_week_start ON weekly_snapshots(week_start_date DESC);
CREATE INDEX idx_weekly_snapshots_user_week ON weekly_snapshots(user_id, week_start_date DESC);

CREATE INDEX idx_weekly_goal_snapshots_snapshot_id ON weekly_goal_snapshots(snapshot_id);
CREATE INDEX idx_weekly_goal_snapshots_goal_id ON weekly_goal_snapshots(goal_id);

CREATE INDEX idx_weekly_recurring_event_snapshots_snapshot_id ON weekly_recurring_event_snapshots(snapshot_id);
CREATE INDEX idx_weekly_recurring_event_snapshots_recurring_event_id ON weekly_recurring_event_snapshots(recurring_event_id);
CREATE INDEX idx_weekly_recurring_event_snapshots_goal_snapshot_id ON weekly_recurring_event_snapshots(goal_snapshot_id);

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recurring_event_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for weekly_snapshots
-- ============================================================================
CREATE POLICY "Users can view own weekly snapshots"
  ON weekly_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own weekly snapshots"
  ON weekly_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly snapshots"
  ON weekly_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly snapshots"
  ON weekly_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies for weekly_goal_snapshots
-- ============================================================================
CREATE POLICY "Users can view own goal snapshots"
  ON weekly_goal_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_goal_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own goal snapshots"
  ON weekly_goal_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_goal_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own goal snapshots"
  ON weekly_goal_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_goal_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own goal snapshots"
  ON weekly_goal_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_goal_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies for weekly_recurring_event_snapshots
-- ============================================================================
CREATE POLICY "Users can view own recurring event snapshots"
  ON weekly_recurring_event_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_recurring_event_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own recurring event snapshots"
  ON weekly_recurring_event_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_recurring_event_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recurring event snapshots"
  ON weekly_recurring_event_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_recurring_event_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recurring event snapshots"
  ON weekly_recurring_event_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_snapshots ws
      WHERE ws.id = weekly_recurring_event_snapshots.snapshot_id
      AND ws.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Triggers to update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_weekly_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weekly_snapshots_updated_at
  BEFORE UPDATE ON weekly_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_snapshots_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE weekly_snapshots IS 'Immutable snapshots of weekly statistics and metadata';
COMMENT ON TABLE weekly_goal_snapshots IS 'Goal settings at the time of snapshot - preserved even if goal deleted';
COMMENT ON TABLE weekly_recurring_event_snapshots IS 'Recurring event settings at snapshot time - preserved even if event deleted';

COMMENT ON COLUMN weekly_snapshots.is_frozen IS 'True if manually saved/frozen by user (vs auto-generated)';
COMMENT ON COLUMN weekly_snapshots.snapshot_hash IS 'Hash for detecting if underlying data changed after snapshot creation';
COMMENT ON COLUMN weekly_goal_snapshots.goal_id IS 'Reference to goal - may be NULL if goal deleted after snapshot';
COMMENT ON COLUMN weekly_goal_snapshots.time_allocated IS 'Hours allocated per week at snapshot time - critical for historical accuracy';
COMMENT ON COLUMN weekly_recurring_event_snapshots.recurring_event_id IS 'Reference to recurring event - may be NULL if deleted after snapshot';

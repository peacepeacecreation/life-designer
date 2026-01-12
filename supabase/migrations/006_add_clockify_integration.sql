-- ============================================================================
-- CLOCKIFY INTEGRATION MIGRATION
-- ============================================================================
-- This migration adds support for Clockify time tracking integration
-- Tables: clockify_connections, clockify_projects, clockify_project_goal_mappings,
--         time_entries, clockify_sync_logs
-- ============================================================================

-- ============================================================================
-- TABLE: clockify_connections
-- Stores user Clockify API connections with encrypted credentials
-- ============================================================================
CREATE TABLE clockify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Clockify credentials (encrypted)
  api_key_encrypted TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  clockify_user_id TEXT NOT NULL,

  -- Connection status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  last_sync_error TEXT,

  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  sync_direction TEXT DEFAULT 'import_only' CHECK (sync_direction IN ('import_only', 'export_only', 'bidirectional')),
  sync_frequency_minutes INTEGER DEFAULT 30 CHECK (sync_frequency_minutes >= 5),

  -- Webhook configuration (for future use)
  webhook_id TEXT,
  webhook_secret TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Only one active connection per user per workspace
  CONSTRAINT unique_user_workspace UNIQUE (user_id, workspace_id)
);

COMMENT ON TABLE clockify_connections IS 'Stores Clockify API connections per user with encrypted credentials';
COMMENT ON COLUMN clockify_connections.api_key_encrypted IS 'Encrypted Clockify API key using AES-GCM';
COMMENT ON COLUMN clockify_connections.sync_direction IS 'MVP: only import_only is supported';

-- ============================================================================
-- TABLE: clockify_projects
-- Cached Clockify projects from user workspaces
-- ============================================================================
CREATE TABLE clockify_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES clockify_connections(id) ON DELETE CASCADE,

  -- Clockify project data
  clockify_project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  color TEXT,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,

  -- Metadata
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_connection_project UNIQUE (connection_id, clockify_project_id)
);

COMMENT ON TABLE clockify_projects IS 'Cached Clockify projects from user workspaces';

-- ============================================================================
-- TABLE: clockify_project_goal_mappings
-- Maps Clockify projects to Life Designer goals
-- ============================================================================
CREATE TABLE clockify_project_goal_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clockify_project_id UUID NOT NULL REFERENCES clockify_projects(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Mapping settings
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  auto_categorize BOOLEAN DEFAULT TRUE NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_project_goal_mapping UNIQUE (clockify_project_id, goal_id)
);

COMMENT ON TABLE clockify_project_goal_mappings IS 'Maps Clockify projects to Life Designer goals';
COMMENT ON COLUMN clockify_project_goal_mappings.auto_categorize IS 'If true, future time entries from this project will auto-assign to the goal';

-- ============================================================================
-- TABLE: time_entries
-- Unified time tracking entries from all sources (Clockify, calendar, manual)
-- ============================================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic time entry information
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Goal association
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- Clockify sync metadata
  clockify_entry_id TEXT,
  clockify_project_id UUID REFERENCES clockify_projects(id) ON DELETE SET NULL,
  is_billable BOOLEAN DEFAULT FALSE,

  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'clockify', 'calendar_event')),
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending_push')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT unique_clockify_entry UNIQUE (user_id, clockify_entry_id)
);

COMMENT ON TABLE time_entries IS 'Unified time tracking entries from Clockify, calendar events, and manual input';
COMMENT ON COLUMN time_entries.source IS 'Source of the time entry: manual, clockify, or calendar_event';
COMMENT ON COLUMN time_entries.sync_status IS 'MVP: only synced and pending_push are used';
COMMENT ON COLUMN time_entries.end_time IS 'NULL means timer is currently running';

-- ============================================================================
-- TABLE: clockify_sync_logs
-- Audit trail of sync operations
-- ============================================================================
CREATE TABLE clockify_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES clockify_connections(id) ON DELETE CASCADE,

  -- Sync operation details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook', 'manual')),
  direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),

  -- Statistics
  entries_imported INTEGER DEFAULT 0,
  entries_exported INTEGER DEFAULT 0,
  entries_updated INTEGER DEFAULT 0,
  entries_skipped INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE clockify_sync_logs IS 'Audit trail of Clockify sync operations';
COMMENT ON COLUMN clockify_sync_logs.sync_type IS 'MVP: manual and incremental are primary types';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Clockify connections indexes
CREATE INDEX idx_clockify_connections_user_id ON clockify_connections(user_id);
CREATE INDEX idx_clockify_connections_active ON clockify_connections(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_clockify_connections_workspace ON clockify_connections(workspace_id);

-- Clockify projects indexes
CREATE INDEX idx_clockify_projects_connection ON clockify_projects(connection_id);
CREATE INDEX idx_clockify_projects_clockify_id ON clockify_projects(clockify_project_id);
CREATE INDEX idx_clockify_projects_active ON clockify_projects(is_archived) WHERE is_archived = FALSE;

-- Project-Goal mappings indexes
CREATE INDEX idx_project_goal_mappings_user ON clockify_project_goal_mappings(user_id);
CREATE INDEX idx_project_goal_mappings_project ON clockify_project_goal_mappings(clockify_project_id);
CREATE INDEX idx_project_goal_mappings_goal ON clockify_project_goal_mappings(goal_id);
CREATE INDEX idx_project_goal_mappings_active ON clockify_project_goal_mappings(is_active) WHERE is_active = TRUE;

-- Time entries indexes
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_goal_id ON time_entries(goal_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX idx_time_entries_end_time ON time_entries(end_time);
CREATE INDEX idx_time_entries_clockify_id ON time_entries(clockify_entry_id) WHERE clockify_entry_id IS NOT NULL;
CREATE INDEX idx_time_entries_sync_status ON time_entries(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_time_entries_source ON time_entries(source);
CREATE INDEX idx_time_entries_user_time ON time_entries(user_id, start_time, end_time);
CREATE INDEX idx_time_entries_clockify_project ON time_entries(clockify_project_id);

-- Sync logs indexes
CREATE INDEX idx_sync_logs_connection ON clockify_sync_logs(connection_id);
CREATE INDEX idx_sync_logs_created_at ON clockify_sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_status ON clockify_sync_logs(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamps automatically
CREATE TRIGGER update_clockify_connections_updated_at
  BEFORE UPDATE ON clockify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_goal_mappings_updated_at
  BEFORE UPDATE ON clockify_project_goal_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate duration_seconds on time entry insert/update
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
  ELSE
    NEW.duration_seconds := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_time_entry_duration IS 'Automatically calculates duration_seconds from start_time and end_time';

CREATE TRIGGER calculate_duration_trigger
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE clockify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockify_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockify_project_goal_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockify_sync_logs ENABLE ROW LEVEL SECURITY;

-- Clockify connections policies
CREATE POLICY "Users can view their own connections"
  ON clockify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
  ON clockify_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON clockify_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON clockify_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Clockify projects policies (scoped through connections)
CREATE POLICY "Users can view their own workspace projects"
  ON clockify_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own workspace projects"
  ON clockify_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own workspace projects"
  ON clockify_projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own workspace projects"
  ON clockify_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Project-Goal mappings policies
CREATE POLICY "Users can view their own mappings"
  ON clockify_project_goal_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mappings"
  ON clockify_project_goal_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mappings"
  ON clockify_project_goal_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mappings"
  ON clockify_project_goal_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Time entries policies
CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries"
  ON time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Sync logs policies (scoped through connections)
CREATE POLICY "Users can view their own sync logs"
  ON clockify_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own sync logs"
  ON clockify_sync_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clockify_connections
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get time entries with goal and project information
CREATE OR REPLACE FUNCTION get_time_entries_with_details(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_goal_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  goal_id UUID,
  goal_name TEXT,
  goal_category TEXT,
  goal_icon_url TEXT,
  clockify_project_id UUID,
  clockify_project_name TEXT,
  clockify_project_color TEXT,
  is_billable BOOLEAN,
  source TEXT,
  sync_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  SELECT
    te.id,
    te.description,
    te.start_time,
    te.end_time,
    te.duration_seconds,
    te.goal_id,
    g.name AS goal_name,
    g.category AS goal_category,
    g.icon_url AS goal_icon_url,
    te.clockify_project_id,
    cp.name AS clockify_project_name,
    cp.color AS clockify_project_color,
    te.is_billable,
    te.source,
    te.sync_status,
    te.created_at
  FROM time_entries te
  LEFT JOIN goals g ON te.goal_id = g.id
  LEFT JOIN clockify_projects cp ON te.clockify_project_id = cp.id
  WHERE te.user_id = p_user_id
    AND (p_start_date IS NULL OR te.start_time >= p_start_date)
    AND (p_end_date IS NULL OR te.start_time <= p_end_date)
    AND (p_goal_id IS NULL OR te.goal_id = p_goal_id)
  ORDER BY te.start_time DESC;
END;
$$;

COMMENT ON FUNCTION get_time_entries_with_details IS 'Returns time entries with joined goal and project details';

-- Function to aggregate time by goal
CREATE OR REPLACE FUNCTION get_time_by_goal(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  goal_id UUID,
  goal_name TEXT,
  goal_category TEXT,
  goal_icon_url TEXT,
  total_seconds INTEGER,
  total_hours NUMERIC,
  entry_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  SELECT
    te.goal_id,
    g.name AS goal_name,
    g.category AS goal_category,
    g.icon_url AS goal_icon_url,
    SUM(te.duration_seconds)::INTEGER AS total_seconds,
    ROUND((SUM(te.duration_seconds) / 3600.0)::NUMERIC, 2) AS total_hours,
    COUNT(te.id)::INTEGER AS entry_count
  FROM time_entries te
  LEFT JOIN goals g ON te.goal_id = g.id
  WHERE te.user_id = p_user_id
    AND te.start_time >= p_start_date
    AND te.start_time <= p_end_date
    AND te.end_time IS NOT NULL
    AND te.goal_id IS NOT NULL
  GROUP BY te.goal_id, g.name, g.category, g.icon_url
  ORDER BY total_seconds DESC;
END;
$$;

COMMENT ON FUNCTION get_time_by_goal IS 'Returns aggregated time statistics grouped by goal for a date range';

-- ============================================================================
-- GRANTS (if needed for service role)
-- ============================================================================

-- Grant usage to authenticated users (handled by RLS policies)
-- No additional grants needed

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

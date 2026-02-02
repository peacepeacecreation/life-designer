-- Canvas Workspaces table for autosave functionality
CREATE TABLE IF NOT EXISTS canvas_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    title TEXT NOT NULL DEFAULT 'Робочий Canvas',
    last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_canvas_workspaces_user_id ON canvas_workspaces(user_id);
CREATE INDEX idx_canvas_workspaces_last_modified ON canvas_workspaces(last_modified_at DESC);

-- Enable RLS
ALTER TABLE canvas_workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own canvas workspaces
CREATE POLICY "Users can view their own canvas workspaces"
    ON canvas_workspaces FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own canvas workspaces"
    ON canvas_workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas workspaces"
    ON canvas_workspaces FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas workspaces"
    ON canvas_workspaces FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_canvas_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_workspaces_updated_at_trigger
    BEFORE UPDATE ON canvas_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_workspaces_updated_at();

-- Trigger to update last_modified_at when nodes or edges change
CREATE OR REPLACE FUNCTION update_canvas_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.nodes IS DISTINCT FROM OLD.nodes) OR (NEW.edges IS DISTINCT FROM OLD.edges) THEN
        NEW.last_modified_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_last_modified_trigger
    BEFORE UPDATE ON canvas_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_last_modified();

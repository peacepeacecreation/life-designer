-- Canvas Sharing table for collaboration
CREATE TABLE IF NOT EXISTS canvas_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate shares for same canvas + email
    UNIQUE(canvas_id, shared_with_email)
);

-- Indices for performance
CREATE INDEX idx_canvas_shares_canvas_id ON canvas_shares(canvas_id);
CREATE INDEX idx_canvas_shares_email ON canvas_shares(shared_with_email);

-- Enable RLS
ALTER TABLE canvas_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can see shares for their canvases or shares with them
CREATE POLICY "Users can view shares for their own canvases"
    ON canvas_shares FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_shares.canvas_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view shares where they are shared with"
    ON canvas_shares FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.email = canvas_shares.shared_with_email
            AND users.id = auth.uid()
        )
    );

CREATE POLICY "Canvas owners can create shares"
    ON canvas_shares FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_shares.canvas_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Canvas owners can update shares"
    ON canvas_shares FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_shares.canvas_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Canvas owners can delete shares"
    ON canvas_shares FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_shares.canvas_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_canvas_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_shares_updated_at_trigger
    BEFORE UPDATE ON canvas_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_shares_updated_at();

-- Update canvas_workspaces RLS policies to include shared canvases
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own canvas workspaces" ON canvas_workspaces;
DROP POLICY IF EXISTS "Users can update their own canvas workspaces" ON canvas_workspaces;

-- Create new policies that include shared access
CREATE POLICY "Users can view their own or shared canvas workspaces"
    ON canvas_workspaces FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM canvas_shares cs
            JOIN users u ON u.email = cs.shared_with_email
            WHERE cs.canvas_id = canvas_workspaces.id
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own canvas workspaces"
    ON canvas_workspaces FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update shared canvas workspaces with edit permission"
    ON canvas_workspaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM canvas_shares cs
            JOIN users u ON u.email = cs.shared_with_email
            WHERE cs.canvas_id = canvas_workspaces.id
            AND u.id = auth.uid()
            AND cs.permission_level = 'edit'
        )
    );

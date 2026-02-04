-- Create prompt_notes table for storing rich text notes for canvas prompts
CREATE TABLE IF NOT EXISTS prompt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- ReactFlow node ID
  prompt_id TEXT NOT NULL, -- Prompt ID within the node
  content JSONB NOT NULL DEFAULT '[]'::jsonb, -- BlockNote content in JSON format
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique constraint: one note per prompt
  UNIQUE(canvas_id, node_id, prompt_id)
);

-- Add index for faster queries
CREATE INDEX idx_prompt_notes_canvas ON prompt_notes(canvas_id);
CREATE INDEX idx_prompt_notes_user ON prompt_notes(user_id);
CREATE INDEX idx_prompt_notes_node_prompt ON prompt_notes(node_id, prompt_id);

-- Enable RLS
ALTER TABLE prompt_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
  ON prompt_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON prompt_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON prompt_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON prompt_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompt_notes_updated_at
  BEFORE UPDATE ON prompt_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_notes_updated_at();

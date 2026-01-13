-- Create goal_notes table
CREATE TABLE IF NOT EXISTS goal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT goal_notes_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goal_notes_goal_id ON goal_notes(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_notes_user_id ON goal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_notes_created_at ON goal_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE goal_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notes"
  ON goal_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON goal_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON goal_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON goal_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_goal_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_goal_notes_updated_at
  BEFORE UPDATE ON goal_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_notes_updated_at();

-- Create calendar_tokens table for storing Google Calendar OAuth tokens
-- Separate from main authentication to allow optional calendar access

CREATE TABLE IF NOT EXISTS calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT calendar_tokens_user_email_key UNIQUE (user_email)
);

-- Add index for faster lookups by user email
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_email ON calendar_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_expires_at ON calendar_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: We use user_email instead of auth.uid() since NextAuth users aren't in auth.users
CREATE POLICY "Users can view their own calendar tokens"
  ON calendar_tokens
  FOR SELECT
  USING (true); -- Will be filtered in application code by session email

CREATE POLICY "Users can insert their own calendar tokens"
  ON calendar_tokens
  FOR INSERT
  WITH CHECK (true); -- Will be filtered in application code by session email

CREATE POLICY "Users can update their own calendar tokens"
  ON calendar_tokens
  FOR UPDATE
  USING (true) -- Will be filtered in application code by session email
  WITH CHECK (true);

CREATE POLICY "Users can delete their own calendar tokens"
  ON calendar_tokens
  FOR DELETE
  USING (true); -- Will be filtered in application code by session email

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_tokens_updated_at
  BEFORE UPDATE ON calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE calendar_tokens IS 'Stores Google Calendar OAuth tokens separately from main authentication. Allows users to optionally connect their calendar after sign-up.';

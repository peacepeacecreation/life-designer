-- Add links column to prompt_notes table
ALTER TABLE prompt_notes
ADD COLUMN IF NOT EXISTS links TEXT[] DEFAULT '{}';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_prompt_notes_links ON prompt_notes USING GIN(links);

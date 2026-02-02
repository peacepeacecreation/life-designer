-- Migration 013: Add content_hash to time_entries
-- Purpose: Track changes in Clockify entries to avoid unnecessary updates
--
-- Hash components (in order):
-- 1. description
-- 2. start_time
-- 3. end_time
-- 4. project_id
--
-- See: src/lib/clockify/hash.ts for hash generation logic

-- Add content_hash column
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add index for efficient hash lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_content_hash
ON time_entries(clockify_entry_id, content_hash);

-- Add comment for documentation
COMMENT ON COLUMN time_entries.content_hash IS
'SHA-256 hash of (description|start_time|end_time|project_id). Used to detect changes from Clockify without comparing all fields.';

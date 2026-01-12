-- Fix status check constraint to include 'ongoing' status
-- Migration: 010_fix_status_constraint

-- Drop old constraint
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_status_check;

-- Add new constraint with 'ongoing' status
ALTER TABLE goals
ADD CONSTRAINT goals_status_check
CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'abandoned', 'ongoing'));

COMMENT ON CONSTRAINT goals_status_check ON goals IS 'Validates goal status including ongoing goals';

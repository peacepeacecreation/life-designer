-- Add support for ongoing goals without deadlines
-- Migration: 009_add_ongoing_goals

-- Add is_ongoing column
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN DEFAULT FALSE;

-- Make start_date and target_end_date nullable for ongoing goals
ALTER TABLE goals
ALTER COLUMN start_date DROP NOT NULL,
ALTER COLUMN target_end_date DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN goals.is_ongoing IS 'True if this is an ongoing goal without deadlines (e.g., daily exercise, healthy lifestyle)';
COMMENT ON COLUMN goals.start_date IS 'Start date - optional for ongoing goals';
COMMENT ON COLUMN goals.target_end_date IS 'Target completion date - optional for ongoing goals';

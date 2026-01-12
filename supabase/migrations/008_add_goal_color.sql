-- Add color column to goals table for custom goal colors
-- Migration: 008_add_goal_color

-- Add color column (optional hex color like #FF5733)
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Add comment
COMMENT ON COLUMN goals.color IS 'Custom hex color for goal visualization (e.g., #FF5733). Falls back to category color if not set.';

-- No need for indexes as this is not a filter column

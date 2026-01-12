-- Add display_order field to goals table for custom sorting
-- This allows users to manually reorder their goals via drag-and-drop

ALTER TABLE goals
ADD COLUMN display_order INTEGER;

-- Set initial order based on creation date (oldest first)
UPDATE goals
SET display_order = row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_number
  FROM goals
) as numbered_goals
WHERE goals.id = numbered_goals.id;

-- Make display_order NOT NULL after setting initial values
ALTER TABLE goals
ALTER COLUMN display_order SET NOT NULL;

-- Add index for faster sorting
CREATE INDEX idx_goals_user_display_order ON goals(user_id, display_order);

-- Add comment
COMMENT ON COLUMN goals.display_order IS 'Custom sort order for goals (lower numbers appear first)';

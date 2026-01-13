/**
 * Make goal dates nullable for ongoing goals
 *
 * Ongoing goals don't have specific start/end dates, so we need to allow NULL values.
 */

-- Make start_date and target_end_date nullable
ALTER TABLE goals
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN target_end_date DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN goals.start_date IS 'Start date of the goal. NULL for ongoing goals without specific dates.';
COMMENT ON COLUMN goals.target_end_date IS 'Target end date of the goal. NULL for ongoing goals without specific dates.';

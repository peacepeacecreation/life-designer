-- Remove progress_percentage column from goals table
-- This field was replaced with automatic time-based progress tracking

ALTER TABLE goals DROP COLUMN IF EXISTS progress_percentage;

-- Add financial tracking fields to goals table
-- Migration to add currency and hourly_rate fields

-- Add currency field
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add hourly rate field
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2);

-- Add icon_url and url fields if they don't exist (for compatibility with older schemas)
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS icon_url TEXT;

ALTER TABLE goals
ADD COLUMN IF NOT EXISTS url TEXT;

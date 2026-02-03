-- Add screenshot_url field to canvas_workspaces
-- Screenshots are stored in Vercel Blob Storage
ALTER TABLE canvas_workspaces
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

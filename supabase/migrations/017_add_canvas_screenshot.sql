-- Add screenshot_url field to canvas_workspaces
ALTER TABLE canvas_workspaces
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create storage bucket for canvas screenshots (if not exists)
-- Note: This needs to be created via Supabase Dashboard or API
-- Bucket name: canvas-screenshots
-- Public access: true
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg

-- Add icon_url and url fields to goals table
-- icon_url: stores either the URL to uploaded custom icon or auto-fetched favicon
-- url: stores the link to the project/resource associated with the goal

ALTER TABLE goals
  ADD COLUMN icon_url TEXT,
  ADD COLUMN url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN goals.icon_url IS 'URL to custom icon (uploaded or auto-fetched from url)';
COMMENT ON COLUMN goals.url IS 'Link to project or resource associated with this goal';

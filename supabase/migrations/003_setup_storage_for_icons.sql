-- Create storage bucket for goal icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-icons', 'goal-icons', true);

-- Set up storage policies for goal icons bucket
-- Allow authenticated users to upload their own icons
CREATE POLICY "Users can upload goal icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'goal-icons' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own icons
CREATE POLICY "Users can update their goal icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'goal-icons' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own icons
CREATE POLICY "Users can delete their goal icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'goal-icons' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to goal icons (since they're just icons)
CREATE POLICY "Anyone can view goal icons"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'goal-icons');

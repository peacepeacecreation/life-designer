-- Fix foreign key constraint to reference users table instead of auth.users
ALTER TABLE prompt_notes
DROP CONSTRAINT IF EXISTS prompt_notes_user_id_fkey;

ALTER TABLE prompt_notes
ADD CONSTRAINT prompt_notes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

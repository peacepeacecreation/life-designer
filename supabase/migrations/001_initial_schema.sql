-- Life Designer Database Schema
-- Phase 1: Initial setup with pgvector for semantic search

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table (migrated from localStorage)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work_startups', 'learning', 'health_sports', 'hobbies')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'abandoned')),
  time_allocated INTEGER NOT NULL DEFAULT 0 CHECK (time_allocated >= 0),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  start_date TIMESTAMPTZ NOT NULL,
  target_end_date TIMESTAMPTZ NOT NULL,
  actual_end_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vector embedding for semantic search (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536),

  -- Full-text search support (updated by trigger)
  search_vector tsvector
);

-- Goal connections (relationships between goals)
CREATE TABLE goal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  to_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('depends_on', 'synergy', 'conflict', 'contributes_to')),
  strength INTEGER NOT NULL CHECK (strength >= 1 AND strength <= 10),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate connections
  CONSTRAINT unique_goal_connection UNIQUE (from_goal_id, to_goal_id, type),
  -- Prevent self-connections
  CONSTRAINT no_self_connection CHECK (from_goal_id != to_goal_id)
);

-- Notes table (new feature)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'idea', 'learning', 'task')),
  tags TEXT[] DEFAULT '{}',
  related_goal_ids UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vector embedding for semantic search
  embedding vector(1536),

  -- Full-text search support (updated by trigger)
  search_vector tsvector
);

-- Reflections table (new feature)
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reflection_type TEXT DEFAULT 'daily' CHECK (reflection_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)),
  energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
  tags TEXT[] DEFAULT '{}',
  related_goal_ids UUID[] DEFAULT '{}',
  related_note_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vector embedding for semantic search
  embedding vector(1536),

  -- Full-text search support (updated by trigger)
  search_vector tsvector
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Goals indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_category ON goals(category);
CREATE INDEX idx_goals_created_at ON goals(created_at DESC);
CREATE INDEX idx_goals_search_vector ON goals USING GIN(search_vector);
-- Vector similarity index using IVFFlat (good for <1M vectors)
CREATE INDEX idx_goals_embedding ON goals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Goal connections indexes
CREATE INDEX idx_goal_connections_from ON goal_connections(from_goal_id);
CREATE INDEX idx_goal_connections_to ON goal_connections(to_goal_id);

-- Notes indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_is_archived ON notes(is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_notes_search_vector ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_embedding ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Reflections indexes
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_date ON reflections(reflection_date DESC);
CREATE INDEX idx_reflections_type ON reflections(reflection_type);
CREATE INDEX idx_reflections_created_at ON reflections(created_at DESC);
CREATE INDEX idx_reflections_search_vector ON reflections USING GIN(search_vector);
CREATE INDEX idx_reflections_embedding ON reflections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_vector for goals
CREATE OR REPLACE FUNCTION update_goals_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_vector for notes
CREATE OR REPLACE FUNCTION update_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_vector for reflections
CREATE OR REPLACE FUNCTION update_reflections_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at
  BEFORE UPDATE ON reflections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for search_vector
CREATE TRIGGER update_goals_search_vector_trigger
  BEFORE INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_search_vector();

CREATE TRIGGER update_notes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_search_vector();

CREATE TRIGGER update_reflections_search_vector_trigger
  BEFORE INSERT OR UPDATE ON reflections
  FOR EACH ROW
  EXECUTE FUNCTION update_reflections_search_vector();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Goals policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Goal connections policies (automatically scoped through goals)
CREATE POLICY "Users can view their own goal connections"
  ON goal_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE id = from_goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own goal connections"
  ON goal_connections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE id = from_goal_id AND user_id = auth.uid()
    )
  );

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Reflections policies
CREATE POLICY "Users can view their own reflections"
  ON reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON reflections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
  ON reflections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Function to search goals by vector similarity
CREATE OR REPLACE FUNCTION search_goals(
  query_embedding vector(1536),
  user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  priority TEXT,
  status TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.category,
    g.priority,
    g.status,
    g.tags,
    g.created_at,
    g.updated_at,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM goals g
  WHERE g.user_id = search_goals.user_id
    AND g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) >= match_threshold
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search notes by vector similarity
CREATE OR REPLACE FUNCTION search_notes(
  query_embedding vector(1536),
  user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  note_type TEXT,
  is_pinned BOOLEAN,
  tags TEXT[],
  related_goal_ids UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.content,
    n.note_type,
    n.is_pinned,
    n.tags,
    n.related_goal_ids,
    n.created_at,
    n.updated_at,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM notes n
  WHERE n.user_id = search_notes.user_id
    AND n.is_archived = FALSE
    AND n.embedding IS NOT NULL
    AND 1 - (n.embedding <=> query_embedding) >= match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search reflections by vector similarity
CREATE OR REPLACE FUNCTION search_reflections(
  query_embedding vector(1536),
  user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  reflection_type TEXT,
  reflection_date DATE,
  mood_score INT,
  tags TEXT[],
  related_goal_ids UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.content,
    r.reflection_type,
    r.reflection_date,
    r.mood_score,
    r.tags,
    r.related_goal_ids,
    r.created_at,
    r.updated_at,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM reflections r
  WHERE r.user_id = search_reflections.user_id
    AND r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

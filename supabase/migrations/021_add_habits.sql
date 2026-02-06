-- Habits System Migration
-- Based on Loop Habit Tracker + Atomic Habits principles
-- Integrated with existing goals system

-- ============================================================================
-- ENUMS (using CHECK constraints for compatibility)
-- ============================================================================

-- Frequency types: daily, weekly, monthly, interval
-- Tracking types: boolean, numeric, duration

-- ============================================================================
-- TABLES
-- ============================================================================

-- Main habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji або predefined icon ID
  color TEXT DEFAULT '#3b82f6',

  -- Frequency configuration
  frequency_type TEXT NOT NULL CHECK (frequency_type IN (
    'daily',           -- Щодня
    'weekly',          -- X разів на тиждень
    'monthly',         -- X разів на місяць
    'interval'         -- Кожні X днів
  )),
  frequency_count INTEGER DEFAULT 1, -- Скільки разів (для weekly/monthly)
  interval_days INTEGER,              -- Кожні X днів (для interval)

  -- Scheduling
  preferred_time TIME,                -- Бажаний час (опціонально)
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TIME,

  -- Tracking type
  tracking_type TEXT NOT NULL DEFAULT 'boolean' CHECK (tracking_type IN (
    'boolean',         -- Так/Ні (зробив/не зробив)
    'numeric',         -- Числове значення (10 віджимань, 2L води)
    'duration'         -- Тривалість (30 хвилин медитації)
  )),
  target_value NUMERIC(10, 2),        -- Ціль (10 віджимань, 2.0 літрів)
  unit TEXT,                          -- Одиниця виміру ("віджимань", "л", "хв")

  -- Integration with goals
  related_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('work_startups', 'learning', 'health_sports', 'hobbies')),

  -- Habit stacking (Atomic Habits)
  cue TEXT,                           -- Тригер ("Після того як прокинусь...")
  reward TEXT,                        -- Нагорода після виконання

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vector embedding for semantic search (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536),

  -- Full-text search support
  search_vector tsvector
);

-- Habit completions (історія виконання)
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Completion data
  completion_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- For non-boolean habits
  value NUMERIC(10, 2),               -- Фактичне значення (8 віджимань, 1.5л води)
  duration_minutes INTEGER,           -- Для duration type

  -- Notes and mood tracking
  note TEXT,                          -- Коментар до виконання
  mood_score INTEGER CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 5)),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate completions for the same day
  CONSTRAINT unique_habit_completion UNIQUE (habit_id, completion_date)
);

-- Habit streaks (денормалізована таблиця для швидкого доступу)
CREATE TABLE habit_streaks (
  habit_id UUID PRIMARY KEY REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,

  last_completion_date DATE,
  streak_start_date DATE,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Habits indexes
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_is_active ON habits(is_active) WHERE is_active = true;
CREATE INDEX idx_habits_category ON habits(category);
CREATE INDEX idx_habits_related_goal ON habits(related_goal_id) WHERE related_goal_id IS NOT NULL;
CREATE INDEX idx_habits_frequency ON habits(frequency_type);
CREATE INDEX idx_habits_created_at ON habits(created_at DESC);
CREATE INDEX idx_habits_search_vector ON habits USING GIN(search_vector);
CREATE INDEX idx_habits_embedding ON habits USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Habit completions indexes
CREATE INDEX idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_date ON habit_completions(completion_date DESC);
CREATE INDEX idx_habit_completions_user_date ON habit_completions(user_id, completion_date DESC);
CREATE INDEX idx_habit_completions_user_habit ON habit_completions(user_id, habit_id);

-- Habit streaks indexes
CREATE INDEX idx_habit_streaks_user_id ON habit_streaks(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update search_vector for habits
CREATE OR REPLACE FUNCTION update_habits_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.cue, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for habits search_vector
CREATE TRIGGER update_habits_search_vector_trigger
  BEFORE INSERT OR UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_habits_search_vector();

-- Trigger for habits updated_at
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update streak after completion
CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_habit habits%ROWTYPE;
  v_last_completion DATE;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_total_completions INTEGER := 0;
  v_streak_start DATE;
  v_expected_days INTEGER := 1; -- Default for daily habits
BEGIN
  -- Get habit details
  SELECT * INTO v_habit FROM habits WHERE id = NEW.habit_id;

  -- Calculate expected interval based on frequency type
  IF v_habit.frequency_type = 'interval' THEN
    v_expected_days := v_habit.interval_days;
  ELSIF v_habit.frequency_type = 'daily' THEN
    v_expected_days := 1;
  END IF;

  -- Get or create streak record
  SELECT
    current_streak,
    longest_streak,
    total_completions,
    last_completion_date,
    streak_start_date
  INTO
    v_current_streak,
    v_longest_streak,
    v_total_completions,
    v_last_completion,
    v_streak_start
  FROM habit_streaks
  WHERE habit_id = NEW.habit_id;

  -- Initialize if no streak record exists
  IF NOT FOUND THEN
    v_current_streak := 0;
    v_longest_streak := 0;
    v_total_completions := 0;
    v_last_completion := NULL;
    v_streak_start := NEW.completion_date;
  END IF;

  -- Increment total completions
  v_total_completions := v_total_completions + 1;

  -- Calculate streak for daily/interval habits
  IF v_habit.frequency_type IN ('daily', 'interval') THEN
    IF v_last_completion IS NULL THEN
      -- First completion
      v_current_streak := 1;
      v_streak_start := NEW.completion_date;
    ELSIF NEW.completion_date = v_last_completion + v_expected_days THEN
      -- Continuing streak
      v_current_streak := v_current_streak + 1;
    ELSIF NEW.completion_date = v_last_completion THEN
      -- Same day completion (update, not new)
      -- Don't increment streak
      NULL;
    ELSE
      -- Streak broken
      v_current_streak := 1;
      v_streak_start := NEW.completion_date;
    END IF;
  ELSE
    -- For weekly/monthly habits, streak calculation is different
    -- We'll implement more sophisticated logic later
    v_current_streak := v_total_completions;
    v_streak_start := COALESCE(v_streak_start, NEW.completion_date);
  END IF;

  -- Update longest streak
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Insert or update streak record
  INSERT INTO habit_streaks (
    habit_id,
    user_id,
    current_streak,
    longest_streak,
    total_completions,
    last_completion_date,
    streak_start_date
  ) VALUES (
    NEW.habit_id,
    NEW.user_id,
    v_current_streak,
    v_longest_streak,
    v_total_completions,
    NEW.completion_date,
    v_streak_start
  )
  ON CONFLICT (habit_id) DO UPDATE SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    total_completions = v_total_completions,
    last_completion_date = NEW.completion_date,
    streak_start_date = v_streak_start,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streaks after completion
CREATE TRIGGER update_habit_streak_trigger
  AFTER INSERT OR UPDATE ON habit_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_streak();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;

-- Habits policies
CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can view their own habit completions"
  ON habit_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit completions"
  ON habit_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit completions"
  ON habit_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit completions"
  ON habit_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Habit streaks policies
CREATE POLICY "Users can view their own habit streaks"
  ON habit_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own habit streaks"
  ON habit_streaks FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Function to search habits by vector similarity
CREATE OR REPLACE FUNCTION search_habits(
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
  frequency_type TEXT,
  tracking_type TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.name,
    h.description,
    h.category,
    h.frequency_type,
    h.tracking_type,
    h.is_active,
    h.created_at,
    h.updated_at,
    1 - (h.embedding <=> query_embedding) AS similarity
  FROM habits h
  WHERE h.user_id = search_habits.user_id
    AND h.is_active = true
    AND h.embedding IS NOT NULL
    AND 1 - (h.embedding <=> query_embedding) >= match_threshold
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get habit completion rate for a date range
CREATE OR REPLACE FUNCTION get_habit_completion_rate(
  p_habit_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_expected INTEGER;
  v_total_completed INTEGER;
  v_habit habits%ROWTYPE;
  v_days_in_range INTEGER;
BEGIN
  -- Get habit details
  SELECT * INTO v_habit FROM habits WHERE id = p_habit_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate days in range
  v_days_in_range := p_end_date - p_start_date + 1;

  -- Calculate expected completions based on frequency
  IF v_habit.frequency_type = 'daily' THEN
    v_total_expected := v_days_in_range;
  ELSIF v_habit.frequency_type = 'interval' THEN
    v_total_expected := FLOOR(v_days_in_range::NUMERIC / v_habit.interval_days);
  ELSIF v_habit.frequency_type = 'weekly' THEN
    v_total_expected := FLOOR(v_days_in_range::NUMERIC / 7) * v_habit.frequency_count;
  ELSIF v_habit.frequency_type = 'monthly' THEN
    v_total_expected := FLOOR(v_days_in_range::NUMERIC / 30) * v_habit.frequency_count;
  ELSE
    v_total_expected := 0;
  END IF;

  -- Get actual completions
  SELECT COUNT(*) INTO v_total_completed
  FROM habit_completions
  WHERE habit_id = p_habit_id
    AND completion_date BETWEEN p_start_date AND p_end_date;

  -- Calculate rate
  IF v_total_expected = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_total_completed::NUMERIC / v_total_expected::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE habits IS 'User habits with flexible frequency and tracking configurations';
COMMENT ON TABLE habit_completions IS 'Daily completion records for habits';
COMMENT ON TABLE habit_streaks IS 'Denormalized streak data for performance';

COMMENT ON COLUMN habits.frequency_type IS 'How often: daily, weekly, monthly, or custom interval';
COMMENT ON COLUMN habits.tracking_type IS 'What to track: boolean (yes/no), numeric (count), or duration (minutes)';
COMMENT ON COLUMN habits.cue IS 'Trigger for habit stacking (Atomic Habits approach)';
COMMENT ON COLUMN habits.related_goal_id IS 'Optional link to a goal that this habit supports';

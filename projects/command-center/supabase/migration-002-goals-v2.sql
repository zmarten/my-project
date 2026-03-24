-- Drop old goals table and rebuild with richer schema
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
DROP INDEX IF EXISTS idx_goals_user_id;
DROP TABLE IF EXISTS goal_actions;
DROP TABLE IF EXISTS goals;

-- Goals table (v2)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('health', 'family', 'projects', 'financial')),
  horizon INTEGER NOT NULL CHECK (horizon IN (30, 90, 180)),
  due_date DATE NOT NULL,
  success_measure TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Goal actions (sub-tasks that drive progress)
CREATE TABLE goal_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_actions ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Goal actions policies
CREATE POLICY "Users can view own goal_actions" ON goal_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal_actions" ON goal_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal_actions" ON goal_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal_actions" ON goal_actions FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category ON goals(user_id, category);
CREATE INDEX idx_goals_horizon ON goals(user_id, horizon);
CREATE INDEX idx_goal_actions_goal_id ON goal_actions(goal_id);
CREATE INDEX idx_goal_actions_user_id ON goal_actions(user_id);

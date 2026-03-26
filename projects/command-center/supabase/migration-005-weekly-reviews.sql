CREATE TABLE weekly_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  week_key text NOT NULL,
  reflection text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_key)
);

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reviews"
  ON weekly_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

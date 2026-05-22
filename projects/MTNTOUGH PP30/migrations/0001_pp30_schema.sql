CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  week INTEGER NOT NULL,
  day INTEGER NOT NULL,
  weekday TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  focus TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  track_json TEXT NOT NULL,
  prescription TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS training_logs (
  workout_id TEXT PRIMARY KEY REFERENCES workouts(id) ON DELETE CASCADE,
  complete INTEGER NOT NULL DEFAULT 0,
  completed_date TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  metrics_json TEXT NOT NULL DEFAULT '{}',
  rpe TEXT NOT NULL DEFAULT '',
  track_log TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS training_logs_updated_at
AFTER UPDATE ON training_logs
BEGIN
  UPDATE training_logs SET updated_at = CURRENT_TIMESTAMP WHERE workout_id = NEW.workout_id;
END;

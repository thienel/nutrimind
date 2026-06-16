export const SQL_CREATE_LOCAL_MEAL_ENTRIES = `
CREATE TABLE IF NOT EXISTS local_meal_entries (
  local_id          TEXT PRIMARY KEY,
  server_id         INTEGER,
  user_id           INTEGER NOT NULL,
  food_name         TEXT NOT NULL,
  meal_type         TEXT NOT NULL,
  calories          REAL NOT NULL,
  protein_g         REAL NOT NULL DEFAULT 0,
  carb_g            REAL NOT NULL DEFAULT 0,
  fat_g             REAL NOT NULL DEFAULT 0,
  source            TEXT NOT NULL,
  ai_confidence     REAL,
  logged_date       TEXT NOT NULL,
  client_created_at TEXT NOT NULL,
  sync_status       TEXT NOT NULL DEFAULT 'pending',
  sync_attempts     INTEGER NOT NULL DEFAULT 0,
  last_sync_error   TEXT,
  created_at        TEXT NOT NULL
);
`;

export const SQL_IDX_MEAL_DATE = `
CREATE INDEX IF NOT EXISTS idx_local_meal_date
  ON local_meal_entries(user_id, logged_date);
`;

export const SQL_IDX_MEAL_SYNC = `
CREATE INDEX IF NOT EXISTS idx_local_meal_sync
  ON local_meal_entries(sync_status);
`;
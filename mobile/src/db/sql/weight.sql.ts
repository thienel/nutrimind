export const SQL_CREATE_LOCAL_WEIGHT_ENTRIES = `
CREATE TABLE IF NOT EXISTS local_weight_entries (
  local_id          TEXT PRIMARY KEY,
  server_id         INTEGER,
  user_id           INTEGER NOT NULL,
  weight_kg         REAL NOT NULL,
  logged_date       TEXT NOT NULL,
  note              TEXT,
  client_created_at TEXT NOT NULL,
  sync_status       TEXT NOT NULL DEFAULT 'pending',
  sync_attempts     INTEGER NOT NULL DEFAULT 0,
  last_sync_error   TEXT,
  created_at        TEXT NOT NULL
);
`;

export const SQL_IDX_WEIGHT_DATE = `
CREATE INDEX IF NOT EXISTS idx_local_weight_date
  ON local_weight_entries(user_id, logged_date);
`;

export const SQL_IDX_WEIGHT_SYNC = `
CREATE INDEX IF NOT EXISTS idx_local_weight_sync
  ON local_weight_entries(sync_status);
`;
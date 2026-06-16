export const SQL_CREATE_LOCAL_WATER_ENTRIES = `
CREATE TABLE IF NOT EXISTS local_water_entries (
  local_id          TEXT PRIMARY KEY,
  server_id         INTEGER,
  user_id           INTEGER NOT NULL,
  volume_ml         INTEGER NOT NULL,
  logged_date       TEXT NOT NULL,
  client_created_at TEXT NOT NULL,
  sync_status       TEXT NOT NULL DEFAULT 'pending',
  sync_attempts     INTEGER NOT NULL DEFAULT 0,
  last_sync_error   TEXT,
  created_at        TEXT NOT NULL
);
`;

export const SQL_IDX_WATER_DATE = `
CREATE INDEX IF NOT EXISTS idx_local_water_date
  ON local_water_entries(user_id, logged_date);
`;

export const SQL_IDX_WATER_SYNC = `
CREATE INDEX IF NOT EXISTS idx_local_water_sync
  ON local_water_entries(sync_status);
`;
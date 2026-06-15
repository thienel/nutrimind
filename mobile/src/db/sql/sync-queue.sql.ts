export const SQL_CREATE_SYNC_QUEUE = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id            TEXT PRIMARY KEY,
  operation     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  local_id      TEXT NOT NULL,
  payload       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  last_error    TEXT,
  created_at    TEXT NOT NULL,
  next_retry_at TEXT
);
`;

export const SQL_IDX_QUEUE_STATUS = `
CREATE INDEX IF NOT EXISTS idx_queue_status
  ON sync_queue(status, next_retry_at);
`;
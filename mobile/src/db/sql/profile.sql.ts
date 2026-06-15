export const SQL_CREATE_LOCAL_PROFILE = `
CREATE TABLE IF NOT EXISTS local_profile (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  user_id           INTEGER NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  age               INTEGER,
  gender            TEXT,
  height_cm         REAL,
  weight_kg         REAL,
  goal              TEXT,
  activity_level    TEXT,
  bmi               REAL,
  bmr               REAL,
  tdee              REAL,
  calorie_target    REAL,
  protein_target_g  REAL,
  carb_target_g     REAL,
  fat_target_g      REAL,
  water_target_ml   INTEGER,
  social_enabled    INTEGER NOT NULL DEFAULT 1,
  onboarding_done   INTEGER NOT NULL DEFAULT 0,
  server_updated_at TEXT,
  cached_at         TEXT
);
`;

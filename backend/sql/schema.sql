CREATE TABLE IF NOT EXISTS transcriptions (
  id            SERIAL PRIMARY KEY,
  text          TEXT NOT NULL,
  language      VARCHAR(20),
  duration_sec  INTEGER,
  session_id    VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at
  ON transcriptions (created_at DESC);
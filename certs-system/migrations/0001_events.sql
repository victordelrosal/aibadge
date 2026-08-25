-- Engagement events for issued credentials. Insert-only; one row per interaction.
-- PRIVACY: no raw IP address is stored, ever. `country` is Cloudflare's two-letter
-- geo hint and `ua_class` is a coarse family, not the user-agent string.
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL,
  ucid      TEXT NOT NULL,
  event     TEXT NOT NULL,
  channel   TEXT,
  country   TEXT,
  ua_class  TEXT,
  ref_host  TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ucid  ON events(ucid);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_ts    ON events(ts);

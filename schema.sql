-- Enquiries from /order/. One row per submission.
-- The sender's IP is stored only as a salted hash, for rate limiting.
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  piece        TEXT,
  message      TEXT NOT NULL,
  deadline     TEXT,
  budget       TEXT,
  ip_hash      TEXT,
  user_agent   TEXT,
  notified     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_ip_hash ON orders (ip_hash, created_at);

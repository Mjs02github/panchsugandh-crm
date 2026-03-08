-- ============================================================
-- MIGRATION: Add salesperson_locations table
-- Run this on your Hostinger MySQL database
-- This table is required for GPS tracking to work.
-- ============================================================

CREATE TABLE IF NOT EXISTS salesperson_locations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salesperson_id  INT UNSIGNED NOT NULL,
  latitude        DECIMAL(10, 7) NOT NULL,
  longitude       DECIMAL(10, 7) NOT NULL,
  `timestamp`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_loc_salesperson FOREIGN KEY (salesperson_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_loc_salesperson ON salesperson_locations(salesperson_id);
CREATE INDEX idx_loc_timestamp   ON salesperson_locations(`timestamp`);
CREATE INDEX idx_loc_sp_date     ON salesperson_locations(salesperson_id, `timestamp`);

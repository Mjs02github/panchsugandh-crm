-- ============================================================
-- Panchsugandh CRM - Database Schema
-- MySQL 8.0+ / MariaDB
-- Import into your existing database (Hostinger: u132595631_SJD_CRM)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
  id        TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(50) NOT NULL UNIQUE,  -- 'super_admin','admin','sales_officer','salesperson','bill_operator','delivery_incharge','store_incharge'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES
  ('super_admin'),
  ('admin'),
  ('sales_officer'),
  ('salesperson'),
  ('bill_operator'),
  ('delivery_incharge'),
  ('store_incharge');

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id      TINYINT UNSIGNED NOT NULL,
  manager_id   INT UNSIGNED NULL,          -- Sales Officer who manages this Salesperson
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  phone        VARCHAR(15) NULL,
  password     VARCHAR(255) NOT NULL,      -- bcrypt hash
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT UNSIGNED NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role    FOREIGN KEY (role_id)    REFERENCES roles(id),
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_created FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_role    ON users(role_id);
CREATE INDEX idx_users_manager ON users(manager_id);

-- Default Super Admin (password: Admin@123)
INSERT INTO users (role_id, name, email, phone, password, is_active) VALUES
(1, 'Super Admin', 'superadmin@panchsugandh.com', '9999999999',
 '$2a$10$6uhx7v2SdKa/jAQaqWJ4m.McW/MiDIAxcPaVW8ZvVKJs5VTZp4r46', TRUE);

-- ============================================================
-- 3. AREAS
-- ============================================================
CREATE TABLE areas (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  city       VARCHAR(100) NULL,
  state      VARCHAR(100) NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. RETAILERS / PARTIES
-- ============================================================
CREATE TABLE retailers (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  firm_name    VARCHAR(150) NOT NULL,
  owner_name   VARCHAR(100) NULL,
  phone        VARCHAR(15) NULL,
  alt_phone    VARCHAR(15) NULL,
  email        VARCHAR(100) NULL,
  address      TEXT NULL,
  area_id      INT UNSIGNED NULL,
  gst_number   VARCHAR(20) NULL,
  credit_limit DECIMAL(12,2) DEFAULT 0.00,
  outstanding  DECIMAL(12,2) DEFAULT 0.00, -- running outstanding balance
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT UNSIGNED NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_retailers_area    FOREIGN KEY (area_id)    REFERENCES areas(id) ON DELETE SET NULL,
  CONSTRAINT fk_retailers_created FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_retailers_area ON retailers(area_id);

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  sku         VARCHAR(50) UNIQUE NULL,
  category    VARCHAR(100) NULL,           -- 'Dhoop', 'Agarbatti', 'Pooja Items', etc.
  unit        VARCHAR(20) NOT NULL DEFAULT 'PCS',  -- PCS, BOX, KG, etc.
  mrp         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sale_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  hsn_code    VARCHAR(20) NULL,
  gst_rate    DECIMAL(5,2) DEFAULT 0.00,  -- GST % e.g. 5, 12, 18
  description TEXT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);

-- ============================================================
-- 6. INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id   INT UNSIGNED NOT NULL UNIQUE,
  qty_on_hand  INT NOT NULL DEFAULT 0,
  qty_reserved INT NOT NULL DEFAULT 0,      -- qty in pending orders
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- 7. SALES ORDERS
-- ============================================================
CREATE TABLE sales_orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number    VARCHAR(30) NOT NULL UNIQUE,  -- e.g. SO-2026-000001
  retailer_id     INT UNSIGNED NOT NULL,
  salesperson_id  INT UNSIGNED NOT NULL,
  order_date      DATE NOT NULL,
  status          ENUM('PENDING','BILLED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',

  -- Billing fields (filled by Bill Operator)
  bill_number     VARCHAR(50) NULL,
  bill_date       DATE NULL,
  billed_by       INT UNSIGNED NULL,
  billed_at       DATETIME NULL,

  -- Delivery fields (filled by Delivery In-charge)
  delivery_remark     TEXT NULL,           -- MANDATORY on delivery completion
  delivery_date       DATE NULL,
  delivered_by        INT UNSIGNED NULL,
  delivered_at        DATETIME NULL,

  -- Amounts
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  notes           TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_retailer    FOREIGN KEY (retailer_id)    REFERENCES retailers(id),
  CONSTRAINT fk_orders_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id),
  CONSTRAINT fk_orders_billed_by   FOREIGN KEY (billed_by)      REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_delivered   FOREIGN KEY (delivered_by)   REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_status       ON sales_orders(status);
CREATE INDEX idx_orders_salesperson  ON sales_orders(salesperson_id);
CREATE INDEX idx_orders_retailer     ON sales_orders(retailer_id);
CREATE INDEX idx_orders_date         ON sales_orders(order_date);

-- ============================================================
-- 8. ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  product_id      INT UNSIGNED NOT NULL,
  qty_ordered     INT NOT NULL,
  qty_billed      INT NULL,              -- set by Bill Operator (may differ from ordered)
  unit_price      DECIMAL(10,2) NOT NULL,
  discount_pct    DECIMAL(5,2) DEFAULT 0.00,
  gst_rate        DECIMAL(5,2) DEFAULT 0.00,
  line_amount     DECIMAL(12,2) NOT NULL, -- qty_billed * unit_price after discount

  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- 9. PAYMENT COLLECTIONS
-- ============================================================
CREATE TABLE payment_collections (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  retailer_id     INT UNSIGNED NOT NULL,
  collected_by    INT UNSIGNED NOT NULL,   -- Salesperson
  collection_date DATE NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  mode            ENUM('CASH','CHEQUE','UPI','NEFT','CREDIT') NOT NULL,
  reference_no    VARCHAR(100) NULL,       -- Cheque no / UPI ref / UTR
  remarks         TEXT NULL,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_payment_order     FOREIGN KEY (order_id)     REFERENCES sales_orders(id),
  CONSTRAINT fk_payment_retailer  FOREIGN KEY (retailer_id)  REFERENCES retailers(id),
  CONSTRAINT fk_payment_collector FOREIGN KEY (collected_by) REFERENCES users(id)
);

CREATE INDEX idx_payments_order     ON payment_collections(order_id);
CREATE INDEX idx_payments_collected ON payment_collections(collected_by);
CREATE INDEX idx_payments_date      ON payment_collections(collection_date);

-- ============================================================
-- 10. VISITS / SCHEDULING
-- ============================================================
CREATE TABLE visits (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salesperson_id INT UNSIGNED NOT NULL,
  retailer_id    INT UNSIGNED NOT NULL,
  visit_date     DATE NOT NULL,
  scheduled_at   DATETIME NULL,
  checked_in_at  DATETIME NULL,
  checked_out_at DATETIME NULL,
  status         ENUM('SCHEDULED','COMPLETED','SKIPPED') NOT NULL DEFAULT 'SCHEDULED',
  purpose        VARCHAR(255) NULL,      -- 'Order Collection','Payment Collection','Intro Visit'
  remarks        TEXT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_visits_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id),
  CONSTRAINT fk_visits_retailer    FOREIGN KEY (retailer_id)    REFERENCES retailers(id)
);

CREATE INDEX idx_visits_salesperson ON visits(salesperson_id);
CREATE INDEX idx_visits_date        ON visits(visit_date);

-- ============================================================
-- 11. TARGETS
-- ============================================================
CREATE TABLE targets (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salesperson_id INT UNSIGNED NOT NULL,
  target_month   DATE NOT NULL,          -- First day of month: 2026-01-01
  target_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  achieved_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  assigned_by    INT UNSIGNED NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_targets_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id),
  CONSTRAINT fk_targets_assigned    FOREIGN KEY (assigned_by)    REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_target_salesperson_month (salesperson_id, target_month)
);

-- ============================================================
-- 12. AUDIT LOG (optional but recommended)
-- ============================================================
CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(100) NOT NULL,    -- 'ORDER_CREATED','ORDER_BILLED','DELIVERY_COMPLETED', etc.
  entity_type VARCHAR(50) NULL,         -- 'order','payment','retailer', etc.
  entity_id   INT UNSIGNED NULL,
  old_value   JSON NULL,
  new_value   JSON NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_date   ON audit_log(created_at);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Order summary with retailer & salesperson info
CREATE OR REPLACE VIEW vw_orders_summary AS
SELECT
  so.id,
  so.order_number,
  so.order_date,
  so.status,
  so.total_amount,
  so.bill_number,
  so.bill_date,
  so.delivery_date,
  so.delivery_remark,
  r.firm_name   AS retailer_name,
  r.phone       AS retailer_phone,
  a.name        AS area_name,
  sp.name       AS salesperson_name,
  sp.id         AS salesperson_id,
  mgr.id        AS manager_id,
  mgr.name      AS manager_name
FROM sales_orders so
JOIN retailers r ON so.retailer_id = r.id
LEFT JOIN areas a ON r.area_id = a.id
JOIN users sp ON so.salesperson_id = sp.id
LEFT JOIN users mgr ON sp.manager_id = mgr.id;

-- Daily collection summary
CREATE OR REPLACE VIEW vw_daily_collections AS
SELECT
  pc.collection_date,
  u.name  AS collected_by,
  pc.mode,
  SUM(pc.amount) AS total_collected,
  COUNT(*)        AS collection_count
FROM payment_collections pc
JOIN users u ON pc.collected_by = u.id
GROUP BY pc.collection_date, pc.collected_by, pc.mode;

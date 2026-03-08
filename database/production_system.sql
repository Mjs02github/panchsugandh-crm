-- ============================================================
-- Store Management, Production & Sample Issue Schema
-- ============================================================

-- 1. Raw Materials Table
CREATE TABLE IF NOT EXISTS raw_materials (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  sku          VARCHAR(50) UNIQUE NULL,
  unit         VARCHAR(20) NOT NULL DEFAULT 'PCS', -- KG, GM, PCS, PKT
  qty_on_hand  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  min_stock    DECIMAL(12,3) DEFAULT 0.000,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bill of Materials (BOM) Table
CREATE TABLE IF NOT EXISTS product_bom (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        INT UNSIGNED NOT NULL,
  material_id       INT UNSIGNED NOT NULL,
  quantity_required DECIMAL(12,4) NOT NULL, -- qty of raw material per 1 unit of product
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_bom_product  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_bom_material FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
  UNIQUE KEY uq_product_material (product_id, material_id)
);

-- 3. Production Logs (Finished Goods Entry)
CREATE TABLE IF NOT EXISTS production_logs (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        INT UNSIGNED NOT NULL,
  batch_number      VARCHAR(50) NULL,
  packing_date      DATE NOT NULL,
  quantity_produced INT NOT NULL,
  notes             TEXT NULL,
  created_by        INT UNSIGNED NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_prod_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_prod_user    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Raw Material Inward Logs (Store Entry)
CREATE TABLE IF NOT EXISTS raw_material_logs (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id       INT UNSIGNED NOT NULL,
  entry_number      VARCHAR(50) NULL, -- Bill No or Internal No
  batch_number      VARCHAR(50) NULL,
  received_date     DATE NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,
  supplier_info     VARCHAR(255) NULL,
  created_by        INT UNSIGNED NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_raw_mat_ref  FOREIGN KEY (material_id) REFERENCES raw_materials(id),
  CONSTRAINT fk_raw_mat_user FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Sample / Free Issue Requests
CREATE TABLE IF NOT EXISTS sample_requests (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        INT UNSIGNED NOT NULL,
  quantity          INT NOT NULL,
  request_date      DATE NOT NULL,
  reason            VARCHAR(255) NULL, -- e.g., 'Exhibition', 'Party Sample'
  status            ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  requested_by      INT UNSIGNED NOT NULL,
  approved_by       INT UNSIGNED NULL,
  approved_at       DATETIME NULL,
  notes             TEXT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_sample_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_sample_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_sample_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- PANCHSUGANDH CRM - FULL DATABASE RESET
-- ⚠️  WARNING: This will PERMANENTLY DELETE all data!
-- Structure and roles are preserved.
-- Run this in Hostinger phpMyAdmin → SQL tab
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Clear all data tables (order matters for FK constraints)
TRUNCATE TABLE audit_log;
TRUNCATE TABLE payment_collections;
TRUNCATE TABLE order_items;
TRUNCATE TABLE sales_orders;
TRUNCATE TABLE stock_inwards;
TRUNCATE TABLE inventory;
TRUNCATE TABLE visits;
TRUNCATE TABLE targets;
TRUNCATE TABLE salesperson_locations;
TRUNCATE TABLE attendance;
TRUNCATE TABLE user_areas;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE chat_rooms;
TRUNCATE TABLE retailers;
TRUNCATE TABLE areas;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
TRUNCATE TABLE roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Re-seed roles ──────────────────────────────────────────
INSERT INTO roles (id, name) VALUES
  (1, 'super_admin'),
  (2, 'admin'),
  (3, 'sales_officer'),
  (4, 'salesperson'),
  (5, 'bill_operator'),
  (6, 'delivery_incharge'),
  (7, 'store_incharge');

-- ── Create Super Admin ─────────────────────────────────────
-- Email   : Mjs@vbnm.club
-- Password: MR02@Mjs
INSERT INTO users (role_id, name, email, phone, password, is_active) VALUES
(1, 'Super Admin', 'mjs@vbnm.club', '9999999999',
 '$2a$10$fO1/YJI/DUw/0y1u4Dg12us52j3gpypna4/rgvScqC8fzoK5C7702', TRUE);

-- ── Verify ─────────────────────────────────────────────────
SELECT 'DB Reset Complete!' AS status;
SELECT u.id, u.name, u.email, r.name AS role 
FROM users u JOIN roles r ON u.role_id = r.id;

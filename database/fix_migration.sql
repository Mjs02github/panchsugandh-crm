-- ============================================================
-- PANCHSUGANDH CRM - URGENT FIX MIGRATION
-- Run this in Hostinger phpMyAdmin to fix delivery & store issues
-- ============================================================

-- 1. Add READY_TO_SHIP to the order status enum
ALTER TABLE sales_orders 
MODIFY COLUMN status 
ENUM('PENDING','BILLED','READY_TO_SHIP','DELIVERED','CANCELLED','CANCEL_REQUESTED') 
NOT NULL DEFAULT 'PENDING';

-- 2. Add index for GPS location queries (performance)
CREATE INDEX IF NOT EXISTS idx_locations_user_time 
ON salesperson_locations (salesperson_id, `timestamp` DESC);

-- 3. Verify the fix worked
SELECT COLUMN_TYPE FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'sales_orders' AND COLUMN_NAME = 'status';

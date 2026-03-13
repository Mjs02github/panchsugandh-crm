require('dotenv').config();
const mysql = require('mysql2');

// ── Hostinger MySQL connection pool ──────────────────────────
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME,

    // Connection pool settings
    waitForConnections: true,
    connectionLimit: 50,    // Increased for higher concurrency (was 10)
    queueLimit: 0,

    // Character set + timezone
    charset: 'utf8mb4',
    timezone: 'Z',        // Treat DB DATETIME as UTC so frontend converts it accurately

    // Keep-alive: prevents Hostinger from dropping idle connections
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,   // 30 seconds

    // Reconnect on disconnect
    connectTimeout: 20000,   // 20 seconds

    // Hostinger MySQL 8 compatibility
    authPlugins: undefined,
});

const promisePool = pool.promise();

// ── Startup connection test ───────────────────────────────────
pool.getConnection(async (err, conn) => {
    if (err) {
        console.error('❌ Hostinger MySQL connection failed:');
        console.error('   Code   :', err.code);
        console.error('   Message:', err.message);
        if (err.code === 'ECONNREFUSED') console.error('   → Check DB_HOST and DB_PORT in .env');
        if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   → Check DB_USER and DB_PASSWORD in .env');
        if (err.code === 'ER_BAD_DB_ERROR') console.error('   → Database not found. Check DB_NAME in .env');
    } else {
        console.log(`✅ Connected to Hostinger MySQL → ${process.env.DB_NAME}@${process.env.DB_HOST}`);

        // Auto-migrate tables
        try {
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS stock_inwards (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    user_id INT NOT NULL,
                    quantity INT NOT NULL,
                    supplier VARCHAR(255),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
            console.log(`✅ stock_inwards table verified`);
        } catch (tableErr) {
            console.error('❌ Failed to run stock_inwards migration:', tableErr.message);
        }

        // Auto-migrate: Retailer coordinates
        try {
            const [cols] = await conn.promise().query("SHOW COLUMNS FROM retailers LIKE 'latitude'");
            if (cols.length === 0) {
                await conn.promise().query("ALTER TABLE retailers ADD COLUMN latitude DECIMAL(10, 7) NULL, ADD COLUMN longitude DECIMAL(10, 7) NULL");
                console.log(`✅ retailers table updated with latitude/longitude`);
            }
        } catch (tableErr) {
            console.warn('⚠️ Retailer migration skipped or failed:', tableErr.message);
        }

        // Auto-migrate: Visit Check-in coordinates
        try {
            const [cols] = await conn.promise().query("SHOW COLUMNS FROM visits LIKE 'latitude'");
            if (cols.length === 0) {
                await conn.promise().query("ALTER TABLE visits ADD COLUMN latitude DECIMAL(10, 7) NULL, ADD COLUMN longitude DECIMAL(10, 7) NULL");
                console.log(`✅ visits table updated with latitude/longitude`);
            }
        } catch (tableErr) {
            console.warn('⚠️ Visit migration skipped or failed:', tableErr.message);
        }

        // Auto-migrate: GPS salesperson location tracking
        try {
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS salesperson_locations (
                    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    salesperson_id  INT UNSIGNED NOT NULL,
                    latitude        DECIMAL(10, 7) NOT NULL,
                    longitude       DECIMAL(10, 7) NOT NULL,
                    \`timestamp\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_loc_salesperson FOREIGN KEY (salesperson_id)
                        REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            // Indexes — ignore error if they already exist
            await conn.promise().query(`CREATE INDEX IF NOT EXISTS idx_loc_salesperson ON salesperson_locations(salesperson_id)`).catch(() => { });
            await conn.promise().query(`CREATE INDEX IF NOT EXISTS idx_loc_sp_date ON salesperson_locations(salesperson_id, \`timestamp\`)`).catch(() => { });
            console.log(`✅ salesperson_locations table verified (GPS tracking ready)`);
        } catch (tableErr) {
            console.error('❌ Failed to run GPS locations migration:', tableErr.message);
        }

        // Auto-migrate: ensure READY_TO_SHIP is in the status enum
        try {
            await conn.promise().query(
                "ALTER TABLE sales_orders MODIFY COLUMN status ENUM('PENDING','BILLED','READY_TO_SHIP','DELIVERED','CANCELLED','CANCEL_REQUESTED') NOT NULL DEFAULT 'PENDING'"
            );
            console.log(`✅ sales_orders status enum verified (READY_TO_SHIP included)`);
        } catch (enumErr) {
            console.warn('⚠️ Enum migration skipped (may already be up to date):', enumErr.message);
        }

        // Auto-migrate: Store Management & Production System
        try {
            // 1. Raw Materials
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS raw_materials (
                    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    name         VARCHAR(150) NOT NULL,
                    sku          VARCHAR(50) UNIQUE NULL,
                    unit         VARCHAR(20) NOT NULL DEFAULT 'PCS',
                    qty_on_hand  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                    min_stock    DECIMAL(12,3) DEFAULT 0.000,
                    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // 2. Product BOM
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS product_bom (
                    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    product_id        INT UNSIGNED NOT NULL,
                    material_id       INT UNSIGNED NOT NULL,
                    quantity_required DECIMAL(12,4) NOT NULL,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_bom_product  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
                    CONSTRAINT fk_bom_material FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
                    UNIQUE KEY uq_product_material (product_id, material_id)
                )
            `);

            // 3. Inventory (Added batch_number and mrp)
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    product_id   INT UNSIGNED NOT NULL,
                    batch_number VARCHAR(50) NULL,
                    mrp          DECIMAL(10,2) DEFAULT 0.00,
                    qty_on_hand  INT NOT NULL DEFAULT 0,
                    qty_reserved INT NOT NULL DEFAULT 0,
                    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    UNIQUE KEY uq_prod_batch (product_id, batch_number)
                )
            `);

            // Migration for existing inventory table
            try {
                await conn.promise().query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50) NULL AFTER product_id");
                await conn.promise().query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2) DEFAULT 0.00 AFTER batch_number");
                await conn.promise().query("ALTER TABLE inventory ADD UNIQUE INDEX IF NOT EXISTS uq_prod_batch (product_id, batch_number)");
            } catch (migErr) {
                console.warn('⚠️ Inventory migration note:', migErr.message);
            }

            // 4. Production Logs (Added mrp)
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS production_logs (
                    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    product_id        INT UNSIGNED NOT NULL,
                    batch_number      VARCHAR(50) NULL,
                    mrp               DECIMAL(10,2) DEFAULT 0.00,
                    packing_date      DATE NOT NULL,
                    quantity_produced INT NOT NULL,
                    notes             TEXT NULL,
                    created_by        INT UNSIGNED NULL,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_prod_product FOREIGN KEY (product_id) REFERENCES products(id),
                    CONSTRAINT fk_prod_user    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // Migration for existing production_logs table
            try {
                await conn.promise().query("ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50) NULL AFTER product_id");
                await conn.promise().query("ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2) DEFAULT 0.00 AFTER batch_number");
            } catch (migErr) {
                console.warn('⚠️ Production logs migration note:', migErr.message);
            }

            // 4. Raw Material Inward Logs
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS raw_material_logs (
                    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    material_id       INT UNSIGNED NOT NULL,
                    entry_number      VARCHAR(50) NULL,
                    batch_number      VARCHAR(50) NULL,
                    received_date     DATE NOT NULL,
                    quantity          DECIMAL(12,3) NOT NULL,
                    supplier_info     VARCHAR(255) NULL,
                    created_by        INT UNSIGNED NULL,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_raw_mat_ref  FOREIGN KEY (material_id) REFERENCES raw_materials(id),
                    CONSTRAINT fk_raw_mat_user FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // 6. Sample Requests

            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS sample_requests (
                    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    product_id        INT UNSIGNED NOT NULL,
                    batch_number      VARCHAR(50) NULL,
                    mrp               DECIMAL(10,2) DEFAULT 0.00,
                    quantity          INT NOT NULL,
                    request_date      DATE NOT NULL,
                    reason            VARCHAR(255) NULL,
                    issued_to         VARCHAR(255) NULL,
                    status            ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                    requested_by      INT UNSIGNED NOT NULL,
                    approved_by       INT UNSIGNED NULL,
                    approved_at       DATETIME NULL,
                    notes             TEXT NULL,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_sample_product FOREIGN KEY (product_id) REFERENCES products(id),
                    CONSTRAINT fk_sample_requester FOREIGN KEY (requested_by) REFERENCES users(id),
                    CONSTRAINT fk_sample_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            console.log(`✅ Store Management tables verified (BOM & Samples ready)`);
        } catch (prodErr) {
            console.error('❌ Failed to run Store Management migration:', prodErr.message);
        }

        // Auto-migrate: Procurement Module (Vendors & Plans)
        try {
            // 1. Vendors table
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS vendors (
                    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    name           VARCHAR(255) NOT NULL,
                    contact_person VARCHAR(150),
                    phone          VARCHAR(20),
                    email          VARCHAR(150),
                    address        TEXT,
                    gstin          VARCHAR(20),
                    category       VARCHAR(100), -- Type of materials supplied
                    material_names TEXT,         -- Specific items supplied
                    status         ENUM('ACTIVE', 'POTENTIAL') DEFAULT 'ACTIVE',
                    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // 2. Procurement Plans (History of calculations)
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS procurement_plans (
                    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    target_data JSON NOT NULL, -- [{productId, name, quantity}]
                    result_data JSON NOT NULL, -- [{materialId, name, requiredQty, currentQty}]
                    created_by  INT UNSIGNED,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_proc_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log(`✅ Procurement tables verified (Vendors & Plans ready)`);
        } catch (procErr) {
            console.error('❌ Failed to run Procurement migration:', procErr.message);
        }

        // Auto-migrate: Add material_names to vendors if missing
        try {
            const [cols] = await conn.promise().query("SHOW COLUMNS FROM vendors LIKE 'material_names'");
            if (cols.length === 0) {
                await conn.promise().query("ALTER TABLE vendors ADD COLUMN material_names TEXT NULL AFTER category");
                console.log(`✅ vendors table updated with material_names`);
            }
        } catch (tableErr) {
            console.warn('⚠️ Vendor material_names migration skipped or failed:', tableErr.message);
        }

        // Auto-migrate: Material Requests (Store -> Procurement channel)
        try {
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS material_requests (
                    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    item_name      VARCHAR(255) NOT NULL,
                    material_id    INT UNSIGNED NULL, -- Link if existing RM
                    quantity       DECIMAL(12,3) NOT NULL,
                    unit           VARCHAR(20) NOT NULL,
                    priority       ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
                    status         ENUM('PENDING', 'APPROVED', 'PURCHASED', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
                    requested_by   INT UNSIGNED NOT NULL,
                    notes          TEXT,
                    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_mat_req_user FOREIGN KEY (requested_by) REFERENCES users(id),
                    CONSTRAINT fk_mat_req_rm   FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE SET NULL
                )
            `);
            console.log(`✅ material_requests table verified (Store-Procurement channel ready)`);
        } catch (matReqErr) {
            console.error('❌ Failed to run Material Request migration:', matReqErr.message);
        }

        // Auto-migrate: Party Edit Approval Workflow
        try {
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS retailer_edit_requests (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    retailer_id INT UNSIGNED NOT NULL,
                    requested_by INT UNSIGNED NOT NULL,
                    proposed_data JSON NOT NULL,
                    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                    admin_remark TEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    processed_by INT UNSIGNED NULL,
                    processed_at DATETIME NULL,
                    CONSTRAINT fk_rer_retailer FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
                    CONSTRAINT fk_rer_requester FOREIGN KEY (requested_by) REFERENCES users(id),
                    CONSTRAINT fk_rer_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log(`✅ retailer_edit_requests table verified`);
        } catch (editErr) {
            console.error('❌ Failed to run party edit migration:', editErr.message);
        }

        // Auto-migrate: Ensure procurement and manufacturing roles exist
        try {
            await conn.promise().query("INSERT IGNORE INTO roles (name) VALUES ('procurement')");
            await conn.promise().query("INSERT IGNORE INTO roles (name) VALUES ('manufacturing_manager')");
            console.log(`✅ Roles verified in roles table`);
        } catch (roleErr) {
            console.error('❌ Failed to verify roles:', roleErr.message);
        }

        // Update: raw_materials to include is_internal_mfg
        try {
            await conn.promise().query("ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS is_internal_mfg BOOLEAN DEFAULT FALSE");
            console.log(`✅ raw_materials table updated with is_internal_mfg`);
        } catch (rmErr) {
            console.error('❌ Failed to update raw_materials table:', rmErr.message);
        }

        // New Table / Update: internal_production_logs
        try {
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS internal_production_logs (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    material_id INT UNSIGNED NOT NULL,
                    quantity DECIMAL(12,4) NOT NULL,
                    batch_number VARCHAR(50) NULL,
                    production_date DATE NOT NULL,
                    created_by INT UNSIGNED NOT NULL,
                    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                    approved_by INT UNSIGNED NULL,
                    approval_date DATETIME NULL,
                    remark TEXT NULL,
                    notes TEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_ipl_material FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
                    CONSTRAINT fk_ipl_creator FOREIGN KEY (created_by) REFERENCES users(id),
                    CONSTRAINT fk_ipl_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            
            // If table already existed, ensure new columns are there
            await conn.promise().query("ALTER TABLE internal_production_logs ADD COLUMN IF NOT EXISTS status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING'");
            await conn.promise().query("ALTER TABLE internal_production_logs ADD COLUMN IF NOT EXISTS approved_by INT UNSIGNED NULL");
            await conn.promise().query("ALTER TABLE internal_production_logs ADD COLUMN IF NOT EXISTS approval_date DATETIME NULL");
            await conn.promise().query("ALTER TABLE internal_production_logs ADD COLUMN IF NOT EXISTS remark TEXT NULL");
            
            console.log(`✅ internal_production_logs table verified/updated`);
        } catch (logErr) {
            console.error('❌ Failed to run internal production migration:', logErr.message);
        }

        // Auto-migrate: Notification System
        try {
            // 1. In-app notifications
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id INT UNSIGNED NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'GENERAL',
                    related_id INT UNSIGNED NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            // 2. FCM Tokens for Push Notifications
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS fcm_tokens (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id INT UNSIGNED NOT NULL,
                    token VARCHAR(255) NOT NULL,
                    platform ENUM('android', 'ios', 'web') NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_fcm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY uq_token (token)
                )
            `);

            // 3. Admin Broadcasts / Scheduled Notifications
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS scheduled_notifications (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    target_role VARCHAR(50) NOT NULL DEFAULT 'ALL',
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    scheduled_at DATETIME NOT NULL,
                    is_sent BOOLEAN DEFAULT FALSE,
                    created_by INT UNSIGNED NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_sched_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // 4. Salesperson Targets
            await conn.promise().query(`
                CREATE TABLE IF NOT EXISTS targets (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    salesperson_id INT UNSIGNED NOT NULL,
                    target_month DATE NOT NULL,
                    target_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    achieved_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                    assigned_by INT UNSIGNED NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_sp_month (salesperson_id, target_month),
                    CONSTRAINT fk_target_sp FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            console.log(`✅ Notification & Target tables verified`);
        } catch (notifErr) {
            console.error('❌ Failed to run Notification system migration:', notifErr.message);
        }

        conn.release();
    }
});

// ── Handle pool errors (e.g. dropped connections) ────────────
pool.on('error', (err) => {
    console.error('MySQL pool error:', err.code, err.message);
});

module.exports = promisePool;

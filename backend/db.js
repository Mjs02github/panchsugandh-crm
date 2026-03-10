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

        conn.release();
    }
});

// ── Handle pool errors (e.g. dropped connections) ────────────
pool.on('error', (err) => {
    console.error('MySQL pool error:', err.code, err.message);
});

module.exports = promisePool;

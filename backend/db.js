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
            console.error('❌ Failed to run table migrations:', tableErr.message);
        }

        // Auto-migrate: ensure READY_TO_SHIP is in the status enum
        try {
            await conn.promise().query(
                "ALTER TABLE sales_orders MODIFY COLUMN status ENUM('PENDING','BILLED','READY_TO_SHIP','DELIVERED','CANCELLED','CANCEL_REQUESTED') NOT NULL DEFAULT 'PENDING'"
            );
            console.log(`✅ sales_orders status enum verified (READY_TO_SHIP included)`);
        } catch (enumErr) {
            // This is safe to ignore if enum is already correct
            console.warn('⚠️ Enum migration skipped (may already be up to date):', enumErr.message);
        }

        conn.release();
    }
});

// ── Handle pool errors (e.g. dropped connections) ────────────
pool.on('error', (err) => {
    console.error('MySQL pool error:', err.code, err.message);
});

module.exports = promisePool;

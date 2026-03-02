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
    connectionLimit: 10,    // Hostinger shared plans allow ~10 concurrent connections
    queueLimit: 0,

    // Character set + timezone
    charset: 'utf8mb4',
    timezone: '+05:30',        // IST

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
pool.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Hostinger MySQL connection failed:');
        console.error('   Code   :', err.code);
        console.error('   Message:', err.message);
        if (err.code === 'ECONNREFUSED') console.error('   → Check DB_HOST and DB_PORT in .env');
        if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   → Check DB_USER and DB_PASSWORD in .env');
        if (err.code === 'ER_BAD_DB_ERROR') console.error('   → Database not found. Check DB_NAME in .env');
    } else {
        console.log(`✅ Connected to Hostinger MySQL → ${process.env.DB_NAME}@${process.env.DB_HOST}`);
        conn.release();
    }
});

// ── Handle pool errors (e.g. dropped connections) ────────────
pool.on('error', (err) => {
    console.error('MySQL pool error:', err.code, err.message);
});

module.exports = promisePool;

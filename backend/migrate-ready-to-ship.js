require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,  // Note: using DB_PASS (not DB_PASSWORD)
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
};

async function migrate() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database.');

        console.log('Altering sales_orders status ENUM to add READY_TO_SHIP...');
        await conn.query(
            "ALTER TABLE sales_orders MODIFY COLUMN status ENUM('PENDING','BILLED','READY_TO_SHIP','DELIVERED','CANCELLED','CANCEL_REQUESTED') NOT NULL DEFAULT 'PENDING'"
        );
        console.log('✅ READY_TO_SHIP added to status enum successfully.');

        // Also ensure billed_at and delivered_at columns exist
        console.log('Ensuring billed_at and delivered_at columns exist...');
        try {
            await conn.query('ALTER TABLE sales_orders ADD COLUMN billed_at DATETIME NULL AFTER billed_by');
            console.log('✅ billed_at column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('ℹ️  billed_at already exists, skipping.');
            } else throw e;
        }

        try {
            await conn.query('ALTER TABLE sales_orders ADD COLUMN delivered_at DATETIME NULL AFTER delivered_by');
            console.log('✅ delivered_at column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                console.log('ℹ️  delivered_at already exists, skipping.');
            } else throw e;
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message || err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

migrate();

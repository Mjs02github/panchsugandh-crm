require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
};

async function migrate() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        console.log('Altering sales_orders status ENUM...');
        await conn.query(
            "ALTER TABLE sales_orders MODIFY COLUMN status ENUM('PENDING','BILLED','DELIVERED','CANCELLED', 'CANCEL_REQUESTED') NOT NULL DEFAULT 'PENDING'"
        );
        console.log('Enum updated.');

        console.log('Adding cancel_reason column to sales_orders...');
        try {
            await conn.query(
                'ALTER TABLE sales_orders ADD COLUMN cancel_reason TEXT NULL AFTER status'
            );
            console.log('Column added successfully.');
        } catch (colErr) {
            if (colErr.code === 'ER_DUP_FIELDNAME' || colErr.message.includes('Duplicate column name')) {
                console.log('Column cancel_reason already exists, skipping.');
            } else {
                throw colErr;
            }
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

migrate();

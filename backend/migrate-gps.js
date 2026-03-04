require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'panchsugandh',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Connecting to database...');
        await pool.query('SELECT 1');
        console.log('Connected.');

        console.log('Adding latitude and longitude to retailers table...');
        try {
            await pool.query(`
                ALTER TABLE retailers 
                ADD COLUMN latitude DECIMAL(10, 8) NULL DEFAULT NULL,
                ADD COLUMN longitude DECIMAL(11, 8) NULL DEFAULT NULL;
            `);
            console.log('Columns added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist.');
            } else {
                throw err;
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();

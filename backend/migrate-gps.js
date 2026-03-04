const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await db.query('ALTER TABLE retailers ADD COLUMN latitude DECIMAL(10, 8) NULL');
        console.log('Added latitude');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        console.log('latitude already exists');
    }

    try {
        await db.query('ALTER TABLE retailers ADD COLUMN longitude DECIMAL(11, 8) NULL');
        console.log('Added longitude');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        console.log('longitude already exists');
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS salesperson_locations (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            salesperson_id INT UNSIGNED NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_sl_salesperson FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('Created salesperson_locations table');

    await db.end();
    console.log('Done!');
}

run().catch(console.error);

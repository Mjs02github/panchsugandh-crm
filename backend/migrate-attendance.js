require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'panchsugandh_crm'
    };

    console.log('Connecting to database...');
    const conn = await mysql.createConnection(dbConfig);

    try {
        console.log('Creating attendance table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                date DATE NOT NULL,
                punch_in_time DATETIME NULL,
                punch_in_lat DECIMAL(10,8) NULL,
                punch_in_lng DECIMAL(11,8) NULL,
                punch_out_time DATETIME NULL,
                punch_out_lat DECIMAL(10,8) NULL,
                punch_out_lng DECIMAL(11,8) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_date (user_id, date),
                CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('attendance table created successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await conn.end();
    }
}

migrate();

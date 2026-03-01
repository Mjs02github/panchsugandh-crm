require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const sql = `CREATE TABLE IF NOT EXISTS user_areas (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id  INT UNSIGNED NOT NULL,
    area_id  INT UNSIGNED NOT NULL,
    UNIQUE KEY uq_user_area (user_id, area_id),
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ua_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

    await conn.execute(sql);
    console.log('✅ user_areas table created successfully!');
    const [tables] = await conn.execute("SHOW TABLES LIKE 'user_areas'");
    console.log('Verified:', tables.length ? 'EXISTS' : 'NOT FOUND');
    await conn.end();
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });

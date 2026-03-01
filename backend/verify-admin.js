require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAdmin() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const [rows] = await connection.execute(
            'SELECT id, name, email, role_id, is_active FROM users WHERE role_id = (SELECT id FROM roles WHERE name = "SUPER_ADMIN" LIMIT 1)'
        );

        console.log('Super Admin Records in DB:');
        console.table(rows);

        const [rows2] = await connection.execute(
            'SELECT id, name, email, role_id, is_active FROM users WHERE email = "Mjs@vbnm.club"'
        );
        console.log('Lookup by email Mjs@vbnm.club:');
        console.table(rows2);

        await connection.end();
    } catch (error) {
        console.error('Database query failed:', error);
    }
}

checkAdmin();

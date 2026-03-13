const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const mysql = require('mysql2/promise');

async function listTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || process.env.DB_PASS,
            database: process.env.DB_NAME,
        });

        const [rows] = await connection.query('SHOW TABLES');
        if (rows.length === 0) {
            console.log('No tables found.');
            await connection.end();
            return;
        }
        const dbName = Object.keys(rows[0])[0];
        const tables = rows.map(row => row[dbName]);
        console.log('Tables in database:');
        tables.forEach(t => console.log(`- ${t}`));
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

listTables();

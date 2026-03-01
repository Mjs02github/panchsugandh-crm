/**
 * Hostinger MySQL Connection Test
 * Run: node test-db-connection.js
 * 
 * Make sure your .env file is filled in before running this.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('\n🔍 Testing Hostinger MySQL Connection...\n');
    console.log('   Host    :', process.env.DB_HOST);
    console.log('   Port    :', process.env.DB_PORT || 3306);
    console.log('   User    :', process.env.DB_USER);
    console.log('   Database:', process.env.DB_NAME);
    console.log('');

    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 15000,
        });

        console.log('✅ Connection successful!\n');

        // Check MySQL version
        const [rows] = await conn.execute('SELECT VERSION() AS version');
        console.log('   MySQL Version:', rows[0].version);

        // Check tables
        const [tables] = await conn.execute('SHOW TABLES');
        console.log('   Tables found :', tables.length);
        if (tables.length > 0) {
            tables.forEach(t => console.log('     •', Object.values(t)[0]));
        } else {
            console.log('\n   ⚠️  No tables found. Run schema.sql first:');
            console.log('      mysql -h', process.env.DB_HOST, '-u', process.env.DB_USER, '-p', process.env.DB_NAME, '< database/schema.sql');
        }
        console.log('');
    } catch (err) {
        console.error('❌ Connection FAILED!\n');
        console.error('   Error code:', err.code);
        console.error('   Message   :', err.message);
        console.error('');

        if (err.code === 'ECONNREFUSED') {
            console.error('   FIX: Check DB_HOST in .env.');
            console.error('     → Same Hostinger server? Use: DB_HOST=localhost');
            console.error('     → Connecting remotely?    Use: DB_HOST=srv<number>.hstgr.io');
            console.error('     → Remote access must be enabled in hPanel → Databases → Remote MySQL');
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   FIX: Wrong DB_USER or DB_PASSWORD in .env');
            console.error('     → Copy exact user/password from hPanel → Databases → MySQL Databases');
        }
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('   FIX: Database name not found. Check DB_NAME in .env');
            console.error('     → The full name includes prefix, e.g.: u123456789_panchsugandh');
        }
        if (err.code === 'ETIMEDOUT') {
            console.error('   FIX: Connection timed out. Possible reasons:');
            console.error('     → Remote access not enabled in hPanel');
            console.error('     → Your IP not whitelisted in hPanel → Remote MySQL');
            console.error('     → Firewall blocking port 3306');
        }
    } finally {
        if (conn) await conn.end();
        process.exit(0);
    }
}

testConnection();

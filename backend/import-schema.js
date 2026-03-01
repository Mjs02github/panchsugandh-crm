/**
 * Hostinger MySQL Schema Importer
 * Run: node import-schema.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importSchema() {
    console.log('\n🚀 Importing schema to Hostinger MySQL...\n');
    console.log('   Host    :', process.env.DB_HOST);
    console.log('   Database:', process.env.DB_NAME);
    console.log('');

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ schema.sql not found at:', schemaPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');

    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 15000,
            multipleStatements: true,
        });

        console.log('✅ Connected!\n');

        // Execute the whole file at once (multipleStatements: true handles it)
        await conn.query(sql);

        console.log('✅ Schema imported successfully!\n');

        // Final verification
        const [tables] = await conn.execute('SHOW TABLES');
        console.log(`📋 Tables created (${tables.length}):`);
        tables.forEach(t => console.log('  •', Object.values(t)[0]));

        console.log('\n🎉 Database is ready! Run: npm run dev\n');

    } catch (err) {
        console.error('❌ Import failed:', err.message);
        // If partial failure, show what tables exist
        try {
            const [tables] = await conn.execute('SHOW TABLES');
            if (tables.length > 0) {
                console.log('\nTables that DID get created:');
                tables.forEach(t => console.log('  •', Object.values(t)[0]));
            }
        } catch { }
        process.exit(1);
    } finally {
        if (conn) await conn.end();
        process.exit(0);
    }
}

importSchema();

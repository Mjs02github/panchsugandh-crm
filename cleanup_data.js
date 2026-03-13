const db = require('./backend/db');

async function cleanupData() {
    console.log('Cleaning all data except admin and user login details...');

    try {
        // 1. Get all tables
        const [tableRows] = await db.query('SHOW TABLES');
        const dbName = Object.keys(tableRows[0])[0];
        const allTables = tableRows.map(row => row[dbName]);
        
        const preserveTables = ['users', 'roles'];
        const tablesToClear = allTables.filter(t => !preserveTables.includes(t));

        console.log(`Found ${allTables.length} tables total. Clearing ${tablesToClear.length} tables...`);

        // 2. Disable foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        // 3. Truncate each table
        for (const table of tablesToClear) {
            try {
                await db.query(`TRUNCATE TABLE \`${table}\``);
                console.log(`- Truncated: ${table}`);
            } catch (err) {
                console.warn(`⚠️ Failed to truncate ${table}, trying DELETE instead: ${err.message}`);
                try {
                    await db.query(`DELETE FROM \`${table}\``);
                    console.log(`- Deleted data from: ${table}`);
                } catch (delErr) {
                    console.error(`❌ Failed to clear ${table}: ${delErr.message}`);
                }
            }
        }

        // 4. Re-enable foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✅ Cleanup complete! Only "users" and "roles" remain.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

cleanupData();

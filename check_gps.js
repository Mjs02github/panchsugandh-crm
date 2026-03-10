const db = require('./backend/db');

async function checkLocations() {
    try {
        const [rows] = await db.query(`
            SELECT u.name, COUNT(l.id) as ping_count, MAX(l.timestamp) as last_ping
            FROM users u
            LEFT JOIN salesperson_locations l ON u.id = l.salesperson_id
            WHERE u.role IN ('salesperson', 'sales_officer')
            GROUP BY u.id
            ORDER BY last_ping DESC
        `);
        console.log('--- Location Ping Summary ---');
        console.table(rows);

        const [recent] = await db.query(`
            SELECT l.salesperson_id, u.name, l.latitude, l.longitude, l.timestamp
            FROM salesperson_locations l
            JOIN users u ON l.salesperson_id = u.id
            ORDER BY l.timestamp DESC
            LIMIT 10
        `);
        console.log('\n--- Latest 10 Pings ---');
        console.table(recent);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLocations();

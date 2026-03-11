const db = require('./db');
async function check() {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'retailer_edit_requests'");
        console.log('Table exists:', tables.length > 0);
        if (tables.length > 0) {
            const [rows] = await db.query("SELECT * FROM retailer_edit_requests");
            console.log('Total requests:', rows.length);
            console.log('Pending requests:', rows.filter(r => r.status === 'PENDING').length);
            if (rows.length > 0) {
                console.log('Recent Request:', JSON.stringify(rows[0], null, 2));
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
check();

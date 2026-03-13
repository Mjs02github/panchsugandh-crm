const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const bcrypt = require('bcryptjs');

/**
 * POST /api/maintenance/reset-all-data
 * Clears all business data while preserving user accounts and roles.
 * ONLY ACCESSIBLE BY SUPER ADMIN.
 * Body: { password }
 */
router.post('/reset-all-data', auth, allowRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required for security verification.' });
        }

        // 0. Verify Password
        const [userRows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (!userRows.length) return res.status(404).json({ error: 'User not found.' });
        
        const isMatch = await bcrypt.compare(password, userRows[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password. Security verification failed.' });
        }

        console.log(`⚠️ System reset initiated by: ${req.user.name} (${req.user.id})`);

        // 1. Get all tables in the database
        const [tableRows] = await db.query('SHOW TABLES');
        const dbName = Object.keys(tableRows[0])[0];
        const allTables = tableRows.map(row => row[dbName]);

        const preserveTables = ['users', 'roles'];
        const tablesToClear = allTables.filter(t => !preserveTables.includes(t));

        // 2. Disable foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        const cleared = [];
        const errors = [];

        // 3. Truncate each table
        for (const table of tablesToClear) {
            try {
                await db.query(`TRUNCATE TABLE \`${table}\``);
                cleared.push(table);
            } catch (err) {
                console.warn(`⚠️ Failed to truncate ${table}, trying DELETE instead: ${err.message}`);
                try {
                    await db.query(`DELETE FROM \`${table}\``);
                    cleared.push(table);
                } catch (delErr) {
                    errors.push({ table, error: delErr.message });
                }
            }
        }

        // 4. Re-enable foreign key checks
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        res.json({
            message: 'Cleanup task processed.',
            summary: {
                totalTables: allTables.length,
                clearedCount: cleared.length,
                preserved: preserveTables,
                clearedTables: cleared,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (err) {
        console.error('CRITICAL: Reset System failed:', err);
        res.status(500).json({ error: 'System reset failed.', detail: err.message });
    }
});

module.exports = router;

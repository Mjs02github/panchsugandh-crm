const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();
const { allowRoles, ROLES } = require('../middleware/rbac');

// Route for salespersons to post their periodic locations
router.post('/', auth, allowRoles(ROLES.SALESPERSON, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }

        await db.query(
            `INSERT INTO salesperson_locations (salesperson_id, latitude, longitude) VALUES (?, ?, ?)`,
            [req.user.id, latitude, longitude]
        );

        res.status(201).json({ message: 'Location logged successfully.' });
    } catch (err) {
        console.error('Error logging location:', err);
        res.status(500).json({ error: 'Server error saving location.' });
    }
});

// Admin fetching location history for a user
router.get('/history/:salesperson_id', auth, allowRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const { salesperson_id } = req.params;
        const { date } = req.query; // Expecting YYYY-MM-DD

        let queryDate = date;
        if (!queryDate) {
            // Default to today
            queryDate = new Date().toISOString().slice(0, 10);
        }

        const [rows] = await db.query(
            `SELECT latitude, longitude, timestamp
             FROM salesperson_locations
             WHERE salesperson_id = ? AND DATE(timestamp) = ?
             ORDER BY timestamp ASC`,
            [salesperson_id, queryDate]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching location history:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

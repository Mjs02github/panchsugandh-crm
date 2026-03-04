const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

const SALES_ROLES = [ROLES.SALESPERSON, ROLES.SALES_OFFICER];
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

// Helper: Get today's date in YYYY-MM-DD
function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

// GET /api/attendance/status — Get today's attendance status for the logged-in user
router.get('/status', auth, allowRoles(...SALES_ROLES), async (req, res) => {
    try {
        const today = getTodayString();
        const [rows] = await db.query(
            'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
            [req.user.id, today]
        );

        if (rows.length === 0) {
            return res.json({ status: 'NOT_PUNCHED_IN' });
        }

        const record = rows[0];
        if (!record.punch_out_time) {
            return res.json({ status: 'PUNCHED_IN', record });
        }

        return res.json({ status: 'PUNCHED_OUT', record });
    } catch (err) {
        console.error('Error fetching attendance status:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/attendance/punch-in
router.post('/punch-in', auth, allowRoles(...SALES_ROLES), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required to punch in.' });
        }

        const today = getTodayString();
        const now = new Date();

        // Check if already punched in
        const [existing] = await db.query(
            'SELECT id FROM attendance WHERE user_id = ? AND date = ?',
            [req.user.id, today]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already punched in today.' });
        }

        await db.query(
            `INSERT INTO attendance (user_id, date, punch_in_time, punch_in_lat, punch_in_lng) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, today, now, latitude, longitude]
        );

        res.status(201).json({ message: 'Punched in successfully.' });
    } catch (err) {
        console.error('Error punching in:', err);
        res.status(500).json({ error: 'Server error punching in.' });
    }
});

// POST /api/attendance/punch-out
router.post('/punch-out', auth, allowRoles(...SALES_ROLES), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required to punch out.' });
        }

        const today = getTodayString();
        const now = new Date();

        // Check if punched in
        const [existing] = await db.query(
            'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
            [req.user.id, today]
        );

        if (existing.length === 0) {
            return res.status(400).json({ error: 'You have not punched in today.' });
        }

        if (existing[0].punch_out_time) {
            return res.status(400).json({ error: 'Already punched out today.' });
        }

        await db.query(
            `UPDATE attendance 
             SET punch_out_time = ?, punch_out_lat = ?, punch_out_lng = ? 
             WHERE id = ?`,
            [now, latitude, longitude, existing[0].id]
        );

        res.status(200).json({ message: 'Punched out successfully.' });
    } catch (err) {
        console.error('Error punching out:', err);
        res.status(500).json({ error: 'Server error punching out.' });
    }
});

// GET /api/attendance/report — Admin view
router.get('/report', auth, allowRoles(...ADMIN_ROLES, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const { date } = req.query;
        let queryDate = date || getTodayString();

        const [rows] = await db.query(
            `SELECT a.*, u.name as user_name, r.name as role_name 
             FROM attendance a
             JOIN users u ON a.user_id = u.id
             JOIN roles r ON u.role_id = r.id
             WHERE a.date = ?
             ORDER BY a.punch_in_time DESC`,
            [queryDate]
        );

        res.json(rows);
    } catch (err) {
        console.error('Error fetching attendance report:', err);
        res.status(500).json({ error: 'Server error fetching report.' });
    }
});

module.exports = router;

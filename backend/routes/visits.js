const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/visits
router.get('/', auth, async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const { date, status } = req.query;
        let conditions = [];
        let params = [];

        if (role === ROLES.SALESPERSON) {
            conditions.push('v.salesperson_id = ?'); params.push(userId);
        } else if (role === ROLES.SALES_OFFICER) {
            conditions.push('u.manager_id = ?'); params.push(userId);
        }

        if (date) { conditions.push('v.visit_date = ?'); params.push(date); }
        if (status) { conditions.push('v.status = ?'); params.push(status); }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows] = await db.query(
            `SELECT v.id, v.visit_date, v.status, v.purpose, v.remarks,
              v.checked_in_at, v.checked_out_at,
              r.firm_name AS retailer_name, r.phone AS retailer_phone,
              a.name AS area_name,
              u.name AS salesperson_name
       FROM visits v
       JOIN retailers r ON v.retailer_id = r.id
       LEFT JOIN areas a ON r.area_id = a.id
       JOIN users u ON v.salesperson_id = u.id
       ${where}
       ORDER BY v.visit_date DESC, v.id DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/visits — schedule a visit
router.post('/', auth, async (req, res) => {
    try {
        const { retailer_id, visit_date, purpose, scheduled_at } = req.body;
        if (!retailer_id || !visit_date) {
            return res.status(400).json({ error: 'retailer_id and visit_date are required.' });
        }
        const [result] = await db.query(
            `INSERT INTO visits (salesperson_id, retailer_id, visit_date, purpose, scheduled_at)
       VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, retailer_id, visit_date, purpose || null, scheduled_at || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Visit scheduled.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/visits/:id — check in / check out / complete
router.patch('/:id', auth, async (req, res) => {
    try {
        const { action, remarks } = req.body;
        let updateObj = {};

        if (action === 'checkin') { updateObj = { checked_in_at: new Date(), status: 'COMPLETED' }; }
        if (action === 'checkout') { updateObj = { checked_out_at: new Date() }; }
        if (action === 'skip') { updateObj = { status: 'SKIPPED', remarks: remarks || null }; }
        if (remarks !== undefined) updateObj.remarks = remarks;

        if (!Object.keys(updateObj).length) return res.status(400).json({ error: 'Valid action required.' });

        const setClauses = Object.keys(updateObj).map(k => `${k} = ?`).join(', ');
        await db.query(`UPDATE visits SET ${setClauses} WHERE id = ? AND salesperson_id = ?`,
            [...Object.values(updateObj), req.params.id, req.user.id]);
        res.json({ message: 'Visit updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

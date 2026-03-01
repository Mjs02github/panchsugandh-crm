const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/targets
router.get('/', auth, async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        let conditions = [];
        let params = [];

        if (role === ROLES.SALESPERSON) {
            conditions.push('t.salesperson_id = ?'); params.push(userId);
        } else if (role === ROLES.SALES_OFFICER) {
            conditions.push('u.manager_id = ?'); params.push(userId);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const [rows] = await db.query(
            `SELECT t.id, t.target_month, t.target_amount, t.achieved_amount,
              ROUND((t.achieved_amount / NULLIF(t.target_amount,0)) * 100, 1) AS achievement_pct,
              u.name AS salesperson_name, u.id AS salesperson_id
       FROM targets t
       JOIN users u ON t.salesperson_id = u.id
       ${where}
       ORDER BY t.target_month DESC, u.name`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/targets
router.post('/', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SALES_OFFICER), async (req, res) => {
    try {
        const { salesperson_id, target_month, target_amount } = req.body;
        if (!salesperson_id || !target_month || !target_amount) {
            return res.status(400).json({ error: 'salesperson_id, target_month, and target_amount are required.' });
        }
        // target_month should be first of month e.g. 2026-03-01
        const [result] = await db.query(
            `INSERT INTO targets (salesperson_id, target_month, target_amount, assigned_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE target_amount = VALUES(target_amount), assigned_by = VALUES(assigned_by)`,
            [salesperson_id, target_month, target_amount, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Target set.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

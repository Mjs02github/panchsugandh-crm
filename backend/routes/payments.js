const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/payments
router.get('/', auth, async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const { date, retailer_id, mode, page = 1, limit = 30 } = req.query;

        let conditions = [];
        let params = [];

        if (role === ROLES.SALESPERSON) {
            conditions.push('pc.collected_by = ?');
            params.push(userId);
        } else if (role === ROLES.SALES_OFFICER) {
            conditions.push('u.manager_id = ?');
            params.push(userId);
        }
        // admins see all

        if (date) { conditions.push('pc.collection_date = ?'); params.push(date); }
        if (retailer_id) { conditions.push('pc.retailer_id = ?'); params.push(retailer_id); }
        if (mode) { conditions.push('pc.mode = ?'); params.push(mode); }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows] = await db.query(
            `SELECT pc.id, pc.collection_date, pc.amount, pc.mode, pc.reference_no,
              pc.remarks, pc.is_verified,
              so.order_number,
              r.firm_name AS retailer_name,
              u.name AS collected_by_name
       FROM payment_collections pc
       JOIN sales_orders so ON pc.order_id = so.id
       JOIN retailers r ON pc.retailer_id = r.id
       JOIN users u ON pc.collected_by = u.id
       ${where}
       ORDER BY pc.created_at DESC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/payments/retailer-balances — billed orders with outstanding amount
router.get('/retailer-balances', auth, async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        let cond = "so.status IN ('BILLED','READY_TO_SHIP','DELIVERED')";
        const params = [];
        if (role === 'salesperson') { cond += ' AND so.salesperson_id = ?'; params.push(userId); }

        const [rows] = await db.query(
            `SELECT
                so.id AS order_id,
                so.order_number,
                so.bill_number,
                so.total_amount AS billed_amount,
                COALESCE(SUM(pc.amount),0) AS paid_amount,
                so.total_amount - COALESCE(SUM(pc.amount),0) AS outstanding_amount,
                r.id AS retailer_id,
                r.firm_name AS retailer_name,
                a.name AS area_name
             FROM sales_orders so
             JOIN retailers r ON so.retailer_id = r.id
             LEFT JOIN areas a ON r.area_id = a.id
             LEFT JOIN payment_collections pc ON pc.order_id = so.id
             WHERE ${cond}
             GROUP BY so.id, r.id, a.name
             HAVING outstanding_amount > 0
             ORDER BY r.firm_name, so.order_number`,
            params
        );
        res.json(rows);
    } catch (err) {
        console.error('Retailer balances error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/payments — Salesperson records a collection
router.post('/', auth, allowRoles(ROLES.SALESPERSON, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { order_id, retailer_id, collection_date, amount, mode, reference_no, remarks } = req.body;

        if (!order_id || !retailer_id || !collection_date || !amount || !mode) {
            return res.status(400).json({
                error: 'order_id, retailer_id, collection_date, amount, and mode are required.',
            });
        }

        const validModes = ['CASH', 'CHEQUE', 'UPI', 'NEFT', 'CREDIT'];
        if (!validModes.includes(mode.toUpperCase())) {
            return res.status(400).json({ error: `mode must be one of: ${validModes.join(', ')}` });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'amount must be greater than 0.' });
        }

        const [result] = await db.query(
            `INSERT INTO payment_collections
         (order_id, retailer_id, collected_by, collection_date, amount, mode, reference_no, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [order_id, retailer_id, req.user.id, collection_date,
                parseFloat(amount), mode.toUpperCase(), reference_no || null, remarks || null]
        );

        // Update retailer outstanding balance
        await db.query(
            'UPDATE retailers SET outstanding = outstanding - ? WHERE id = ?',
            [parseFloat(amount), retailer_id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'PAYMENT_COLLECTED', 'payment', ?, ?)`,
            [req.user.id, result.insertId, JSON.stringify({ amount, mode })]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Payment collection recorded successfully.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/payments/:id/verify — Admin verifies payment
router.patch('/:id/verify', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        await db.query('UPDATE payment_collections SET is_verified = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Payment verified.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

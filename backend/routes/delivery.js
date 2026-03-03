const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// This file is an alias / proxy to orders route for delivery-specific actions.
// Delivery updates are handled via PATCH /api/orders/:id/deliver
// This route provides a delivery-centric view.

const { allowRoles, ROLES } = require('../middleware/rbac');

// GET /api/delivery — billed orders ready for delivery
router.get('/', auth, allowRoles(ROLES.DELIVERY_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { area_id, date, page = 1, limit = 30 } = req.query;
        let conditions = ["so.status = 'READY_TO_SHIP'"];
        let params = [];

        if (area_id) { conditions.push('r.area_id = ?'); params.push(area_id); }
        if (date) { conditions.push('so.bill_date = ?'); params.push(date); }

        const where = 'WHERE ' + conditions.join(' AND ');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows] = await db.query(
            `SELECT so.id, so.order_number, so.bill_number, so.bill_date,
              so.total_amount, so.notes,
              r.firm_name AS retailer_name,
              r.phone AS retailer_phone,
              r.address AS retailer_address,
              a.name AS area_name,
              u.name AS salesperson_name,
              u.phone AS salesperson_phone
       FROM sales_orders so
       JOIN retailers r ON so.retailer_id = r.id
       LEFT JOIN areas a ON r.area_id = a.id
       JOIN users u ON so.salesperson_id = u.id
       ${where}
       ORDER BY a.name, so.bill_date
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/delivery/history — delivered orders
router.get('/history', auth, allowRoles(ROLES.DELIVERY_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { date, page = 1, limit = 30 } = req.query;
        let conditions = ["so.status = 'DELIVERED'"];
        let params = [];
        if (date) { conditions.push('so.delivery_date = ?'); params.push(date); }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [rows] = await db.query(
            `SELECT so.id, so.order_number, so.delivery_date, so.delivery_remark,
              so.total_amount,
              r.firm_name AS retailer_name,
              del.name AS delivered_by_name
       FROM sales_orders so
       JOIN retailers r ON so.retailer_id = r.id
       LEFT JOIN users del ON so.delivered_by = del.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY so.delivery_date DESC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/dashboard/stats  —  role-aware stats
router.get('/stats', auth, async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const today = new Date().toISOString().slice(0, 10);
        const month = today.slice(0, 7); // YYYY-MM

        let stats = {};

        if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role)) {
            // Full system stats
            const [[orders]] = await db.query(
                `SELECT
           COUNT(*)                                              AS total_orders,
           SUM(total_amount)                                    AS total_revenue,
           SUM(CASE WHEN status='PENDING'   THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status='BILLED'    THEN 1 ELSE 0 END) AS billed,
           SUM(CASE WHEN status='READY_TO_SHIP' THEN 1 ELSE 0 END) AS ready_to_ship,
           SUM(CASE WHEN status='DELIVERED' THEN 1 ELSE 0 END) AS delivered,
           SUM(CASE WHEN status='CANCEL_REQUESTED' THEN 1 ELSE 0 END) AS cancel_requests,
           SUM(CASE WHEN order_date=?       THEN 1 ELSE 0 END) AS today_orders,
           SUM(CASE WHEN order_date=? THEN total_amount ELSE 0 END) AS today_revenue,
           SUM(CASE WHEN DATE_FORMAT(order_date,'%Y-%m')=? THEN total_amount ELSE 0 END) AS mtd_revenue
         FROM sales_orders WHERE status != 'CANCELLED'`,
                [today, today, month]
            );
            const [[collections]] = await db.query(
                `SELECT SUM(amount) AS today_collected
         FROM payment_collections WHERE collection_date = ?`,
                [today]
            );
            const [[retailers]] = await db.query('SELECT COUNT(*) AS total_retailers FROM retailers WHERE is_active=1');
            const [[users]] = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE is_active=1');

            stats = { ...orders, ...collections, ...retailers, ...users };

        } else if (role === ROLES.SALESPERSON) {
            const [[orders]] = await db.query(
                `SELECT
           COUNT(*) AS total_orders,
           SUM(total_amount) AS total_revenue,
           SUM(CASE WHEN status='PENDING'   THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status='DELIVERED' THEN 1 ELSE 0 END) AS delivered,
           SUM(CASE WHEN order_date=? THEN 1 ELSE 0 END) AS today_orders,
           SUM(CASE WHEN DATE_FORMAT(order_date,'%%Y-%%m')=? THEN total_amount ELSE 0 END) AS mtd_revenue
         FROM sales_orders WHERE salesperson_id=? AND status!='CANCELLED'`,
                [today, month, userId]
            );
            const [[target]] = await db.query(
                `SELECT target_amount, achieved_amount FROM targets
         WHERE salesperson_id=? AND target_month=?`,
                [userId, month + '-01']
            );
            const [[visits]] = await db.query(
                `SELECT COUNT(*) AS today_visits FROM visits WHERE salesperson_id=? AND visit_date=?`,
                [userId, today]
            );
            stats = { ...orders, ...visits, target: target || { target_amount: 0, achieved_amount: 0 } };

        } else if (role === ROLES.SALES_OFFICER) {
            const [[orders]] = await db.query(
                `SELECT COUNT(*) AS total_orders, SUM(so.total_amount) AS team_revenue,
                SUM(CASE WHEN so.status='PENDING' THEN 1 ELSE 0 END) AS pending
         FROM sales_orders so JOIN users u ON so.salesperson_id=u.id
         WHERE u.manager_id=? AND so.status!='CANCELLED'`,
                [userId]
            );
            const [[teamCount]] = await db.query(
                'SELECT COUNT(*) AS team_size FROM users WHERE manager_id=? AND is_active=1',
                [userId]
            );
            stats = { ...orders, ...teamCount };

        } else if (role === ROLES.BILL_OPERATOR) {
            const [[data]] = await db.query(
                `SELECT COUNT(*) AS pending_billing FROM sales_orders WHERE status='PENDING'`
            );
            stats = data;

        } else if (role === ROLES.DELIVERY_INCHARGE) {
            const [[data]] = await db.query(
                `SELECT COUNT(*) AS pending_delivery FROM sales_orders WHERE status='READY_TO_SHIP'`
            );
            stats = data;

        } else if (role === ROLES.STORE_INCHARGE) {
            const [[retailers]] = await db.query('SELECT COUNT(*) AS total_retailers FROM retailers WHERE is_active=1');
            const [[lowStock]] = await db.query(
                'SELECT COUNT(*) AS low_stock_products FROM inventory WHERE qty_on_hand < 10'
            );
            const [[pendingPacking]] = await db.query(
                `SELECT COUNT(*) AS pending_packing FROM sales_orders WHERE status='BILLED'`
            );
            stats = { ...retailers, ...lowStock, ...pendingPacking };
        }

        res.json({ role, stats });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

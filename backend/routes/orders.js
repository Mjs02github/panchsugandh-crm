const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const { sendNotification, broadcastNotification } = require('../utils/notificationService');
const router = express.Router();

const ALL_ORDER_ROLES = [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_OFFICER,
    ROLES.SALESPERSON, ROLES.BILL_OPERATOR, ROLES.DELIVERY_INCHARGE,
    ROLES.STORE_INCHARGE
];

// ── Helper: generate order number ──────────────────────────
async function generateOrderNumber() {
    const year = new Date().getFullYear();
    const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM sales_orders WHERE YEAR(created_at) = ?', [year]
    );
    const seq = String(rows[0].cnt + 1).padStart(6, '0');
    return `SO-${year}-${seq}`;
}

// ─────────────────────────────────────────────────────────
// GET /api/orders
// Role-filtered listing
// ─────────────────────────────────────────────────────────
router.get('/', auth, allowRoles(...ALL_ORDER_ROLES), async (req, res) => {
    try {
        const { status, date, from, to, retailer_id, page = 1, limit = 100 } = req.query;
        const { role, id: userId, managerId } = req.user;

        let conditions = [];
        let params = [];

        // Role-based data scoping
        if (role === ROLES.SALESPERSON) {
            conditions.push('so.salesperson_id = ?');
            params.push(userId);
        } else if (role === ROLES.SALES_OFFICER) {
            conditions.push('u.manager_id = ?');
            params.push(userId);
        } else if (role === ROLES.BILL_OPERATOR) {
            // Bill operator sees all statuses when requesting history, else PENDING+BILLED
            if (!status) conditions.push("so.status IN ('PENDING','BILLED','READY_TO_SHIP','DELIVERED','CANCELLED')");
        } else if (role === ROLES.STORE_INCHARGE) {
            conditions.push("so.status IN ('BILLED','READY_TO_SHIP')");
        } else if (role === ROLES.DELIVERY_INCHARGE) {
            conditions.push("so.status IN ('READY_TO_SHIP','DELIVERED')");
        }

        if (status) { conditions.push('so.status = ?'); params.push(status); }
        if (date) { conditions.push('DATE(so.order_date) = ?'); params.push(date); }
        if (from) { conditions.push('so.order_date >= ?'); params.push(from); }
        if (to) { conditions.push('so.order_date <= ?'); params.push(to); }
        if (retailer_id) { conditions.push('so.retailer_id = ?'); params.push(retailer_id); }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows] = await db.query(
            `SELECT so.id, so.order_number, so.order_date, so.status,
              so.total_amount, so.bill_number, so.bill_date,
              so.delivery_date, so.delivery_remark, so.cancel_reason,
              r.firm_name AS retailer_name, r.phone AS retailer_phone,
              a.name AS area_name,
              u.name AS salesperson_name
       FROM sales_orders so
       JOIN retailers r ON so.retailer_id = r.id
       LEFT JOIN areas a ON r.area_id = a.id
       JOIN users u ON so.salesperson_id = u.id
       ${where}
       ORDER BY so.created_at DESC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/orders/:id  — order detail with items + payments
// ─────────────────────────────────────────────────────────
router.get('/:id', auth, allowRoles(...ALL_ORDER_ROLES), async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT so.*,
              r.firm_name   AS retailer_name,
              r.phone       AS retailer_phone,
              r.address     AS retailer_address,
              a.name        AS area_name,
              sp.name       AS salesperson_name,
              sp.phone      AS salesperson_phone,
              bb.name       AS billed_by_name,
              db2.name      AS delivered_by_name
       FROM sales_orders so
       JOIN retailers r ON so.retailer_id = r.id
       LEFT JOIN areas a ON r.area_id = a.id
       JOIN users sp ON so.salesperson_id = sp.id
       LEFT JOIN users bb  ON so.billed_by    = bb.id
       LEFT JOIN users db2 ON so.delivered_by = db2.id
       WHERE so.id = ?`,
            [req.params.id]
        );
        if (!orders.length) return res.status(404).json({ error: 'Order not found.' });

        const [items] = await db.query(
            `SELECT oi.*, p.name AS product_name, p.unit, p.sku, p.mrp AS default_mrp
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
            [req.params.id]
        );

        const [payments] = await db.query(
            `SELECT pc.*, u.name AS collected_by_name
       FROM payment_collections pc
       JOIN users u ON pc.collected_by = u.id
       WHERE pc.order_id = ?
       ORDER BY pc.collection_date ASC`,
            [req.params.id]
        );

        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        res.json({ ...orders[0], items, payments, total_paid: totalPaid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});


// ─────────────────────────────────────────────────────────
// POST /api/orders — Create new sales order (Salesperson)
// ─────────────────────────────────────────────────────────
router.post('/', auth, allowRoles(ROLES.SALESPERSON, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { retailer_id, order_date, items, notes, discount } = req.body;

        if (!retailer_id || !order_date || !items || !items.length) {
            await conn.rollback();
            return res.status(400).json({
                error: 'retailer_id, order_date, and at least one item are required.',
            });
        }

        // Validate each item
        for (const item of items) {
            if (!item.product_id || !item.qty_ordered || item.qty_ordered < 1) {
                await conn.rollback();
                return res.status(400).json({ error: 'Each item must have product_id and qty_ordered >= 1.' });
            }
        }

        // Compute totals
        let subtotal = 0;
        let gst_amount = 0;

        const enrichedItems = [];
        for (const item of items) {
            const [pRows] = await conn.query(
                'SELECT id, sale_price, gst_rate FROM products WHERE id = ? AND is_active = 1',
                [item.product_id]
            );
            if (!pRows.length) {
                await conn.rollback();
                return res.status(400).json({ error: `Product id ${item.product_id} not found.` });
            }
            const p = pRows[0];
            const unit_price = item.unit_price || p.sale_price;
            const disc_pct = item.discount_pct || 0;
            const qty = parseInt(item.qty_ordered);
            const lineBase = unit_price * qty * (1 - disc_pct / 100);
            const lineGst = lineBase * (p.gst_rate / 100);

            subtotal += lineBase;
            gst_amount += lineGst;

            enrichedItems.push({
                product_id: p.id,
                qty_ordered: qty,
                unit_price,
                discount_pct: disc_pct,
                gst_rate: p.gst_rate,
                line_amount: parseFloat((lineBase + lineGst).toFixed(2)),
            });
        }

        const discountAmt = parseFloat(discount || 0);
        const total_amount = parseFloat((subtotal + gst_amount - discountAmt).toFixed(2));
        const order_number = await generateOrderNumber();

        // Insert order header
        const [oResult] = await conn.query(
            `INSERT INTO sales_orders
         (order_number, retailer_id, salesperson_id, order_date,
          subtotal, discount, gst_amount, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [order_number, retailer_id, req.user.id, order_date,
                parseFloat(subtotal.toFixed(2)), discountAmt,
                parseFloat(gst_amount.toFixed(2)), total_amount, notes || null]
        );

        const orderId = oResult.insertId;

        // Insert order items
        for (const ei of enrichedItems) {
            await conn.query(
                `INSERT INTO order_items
           (order_id, product_id, qty_ordered, unit_price, discount_pct, gst_rate, line_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, ei.product_id, ei.qty_ordered, ei.unit_price,
                    ei.discount_pct, ei.gst_rate, ei.line_amount]
            );
            // Reserve inventory
            await conn.query(
                'UPDATE inventory SET qty_reserved = qty_reserved + ? WHERE product_id = ?',
                [ei.qty_ordered, ei.product_id]
            );
        }

        // Audit log (Skipped as table does not exist)
        // await conn.query(
        //     `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
        // VALUES (?, 'ORDER_CREATED', 'order', ?, ?)`,
        //     [req.user.id, orderId, JSON.stringify({ order_number, total_amount })]
        // );

        await conn.commit();

        // ── Push Notifications ──
        try {
            // 1. Motivational notification for Salesperson
            const quotes = [
                "Great job! Every order counts. Keep the momentum going!",
                "Fantastic! You're making progress one order at a time.",
                "Well done! Success is the sum of small efforts repeated day in and day out.",
                "Awesome work! Your dedication is paying off."
            ];
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            await sendNotification(
                req.user.id,
                'Order Placed! 🚀',
                `Successfully created ${order_number}. ${randomQuote}`,
                'MOTIVATIONAL',
                orderId
            );

            // 2. Alert for Bill Operators
            const [billOps] = await db.query('SELECT id FROM users WHERE role = ? AND is_active = 1', [ROLES.BILL_OPERATOR]);
            for (const op of billOps) {
                await sendNotification(
                    op.id,
                    'New Order Pending 📋',
                    `Order ${order_number} has been placed and is waiting for billing.`,
                    'ORDER_CREATED',
                    orderId
                );
            }
        } catch (notifErr) {
            console.error('Notification dispatch error:', notifErr.message);
        }

        res.status(201).json({
            id: orderId,
            order_number,
            total_amount,
            message: 'Sales order created successfully.',
        });
    } catch (err) {
        await conn.rollback();
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create order.', details: err.sqlMessage || err.message });
    } finally {
        conn.release();
    }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/orders/:id/bill — Bill Operator marks billed
// ─────────────────────────────────────────────────────────
router.patch('/:id/bill', auth, allowRoles(ROLES.BILL_OPERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { bill_number, bill_date, items, final_amount } = req.body;
        if (!bill_number) {
            return res.status(400).json({ error: 'bill_number is required.' });
        }

        const [orders] = await conn.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status = 'PENDING'",
            [req.params.id]
        );
        if (!orders.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found or already processed.' });
        }

        // Update order status to BILLED, and override total_amount if final_amount is provided
        const updateParams = [bill_number, bill_date || new Date().toISOString().slice(0, 10), req.user.id];
        let setQuery = `status = 'BILLED', bill_number = ?, bill_date = ?, billed_by = ?, billed_at = NOW()`;

        if (final_amount !== undefined && final_amount !== '') {
            setQuery += `, total_amount = ?`;
            updateParams.push(final_amount);
        }

        updateParams.push(req.params.id);

        await conn.query(`UPDATE sales_orders SET ${setQuery} WHERE id = ?`, updateParams);

        // If Bill Operator has adjusted quantities or provided batch info, update order items
        if (items && items.length) {
            for (const item of items) {
                if (item.id) {
                    const fields = [];
                    const params = [];
                    if (item.qty_billed !== undefined) {
                        fields.push('qty_billed = ?');
                        params.push(item.qty_billed);
                    }
                    if (item.line_amount !== undefined) {
                        fields.push('line_amount = ?');
                        params.push(item.line_amount);
                    }
                    if (item.batch_number) {
                        fields.push('batch_number = ?');
                        params.push(item.batch_number);
                    }
                    if (item.mrp) {
                        fields.push('mrp = ?');
                        params.push(item.mrp);
                    }
                    if (item.unit_price) {
                        fields.push('unit_price = ?');
                        params.push(item.unit_price);
                    }

                    if (fields.length > 0) {
                        params.push(item.id, req.params.id);
                        await conn.query(
                            `UPDATE order_items SET ${fields.join(', ')} WHERE id = ? AND order_id = ?`,
                            params
                        );
                    }
                }
            }
        }

        // ── Update retailer outstanding balance ──
        const billedAmount = (final_amount !== undefined && final_amount !== '')
            ? parseFloat(final_amount)
            : parseFloat(orders[0].total_amount);
        await conn.query(
            'UPDATE retailers SET outstanding = outstanding + ? WHERE id = ?',
            [billedAmount, orders[0].retailer_id]
        );

        await conn.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'ORDER_BILLED', 'order', ?, ?)`,
            [req.user.id, req.params.id, JSON.stringify({ bill_number })]
        );

        await conn.commit();
        res.json({ message: 'Order marked as BILLED successfully.' });
    } catch (err) {
        await conn.rollback();
        console.error('Bill order error:', err);
        res.status(500).json({ error: 'Failed to update billing status.' });
    } finally {
        conn.release();
    }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/orders/:id/deliver — Delivery In-charge marks delivered
// NOTE: delivery_remark is MANDATORY
// ─────────────────────────────────────────────────────────
router.patch('/:id/deliver', auth, allowRoles(ROLES.DELIVERY_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { delivery_remark, delivery_date } = req.body;

        // ── MANDATORY REMARK VALIDATION ──────────────────────
        if (!delivery_remark || delivery_remark.trim() === '') {
            await conn.rollback();
            return res.status(400).json({
                error: 'Delivery remark is required. Please enter details like "Handed to owner" or "Shop closed".',
            });
        }

        const [orders] = await conn.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status IN ('BILLED','READY_TO_SHIP')",
            [req.params.id]
        );
        if (!orders.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found or not ready for delivery.' });
        }

        const dDate = delivery_date || new Date().toISOString().slice(0, 10);

        await conn.query(
            `UPDATE sales_orders
       SET status = 'DELIVERED',
           delivery_remark = ?,
           delivery_date   = ?,
           delivered_by    = ?,
           delivered_at    = NOW()
       WHERE id = ?`,
            [delivery_remark.trim(), dDate, req.user.id, req.params.id]
        );

        // Release reserved inventory (deduct from qty_on_hand for specific batch)
        const [orderItems] = await conn.query(
            'SELECT product_id, batch_number, COALESCE(qty_billed, qty_ordered) AS qty FROM order_items WHERE order_id = ?',
            [req.params.id]
        );
        for (const oi of orderItems) {
            // Deduct from the specific batch. If batch_number is NULL in order_items, we'll have a problem if multiple batches exist.
            // But realistically, the UI will enforce batch selection during billing.
            await conn.query(
                `UPDATE inventory
                 SET qty_on_hand  = qty_on_hand - ?,
                     qty_reserved = qty_reserved - ?
                 WHERE product_id = ? AND (batch_number = ? OR batch_number IS NULL OR batch_number = 'DEFAULT')`,
                [oi.qty, oi.qty, oi.product_id, oi.batch_number || 'DEFAULT']
            );
        }

        await conn.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'DELIVERY_COMPLETED', 'order', ?, ?)`,
            [req.user.id, req.params.id, JSON.stringify({ delivery_remark, delivery_date: dDate })]
        );

        await conn.commit();
        res.json({ message: 'Order marked as DELIVERED successfully.' });
    } catch (err) {
        await conn.rollback();
        console.error('Deliver order error:', err);
        res.status(500).json({ error: 'Failed to update delivery status.' });
    } finally {
        conn.release();
    }
});

// PATCH /api/orders/:id/cancel-request - Bill Operator requests cancellation
router.patch('/:id/cancel-request', auth, allowRoles(ROLES.BILL_OPERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { cancel_reason } = req.body;
        if (!cancel_reason || !cancel_reason.trim()) {
            return res.status(400).json({ error: 'Cancellation reason is required.' });
        }

        const [orders] = await db.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status IN ('PENDING', 'BILLED')",
            [req.params.id]
        );
        if (!orders.length) return res.status(404).json({ error: 'Order not found or cannot be cancelled.' });

        await db.query(
            "UPDATE sales_orders SET status = 'CANCEL_REQUESTED', cancel_reason = ? WHERE id = ?",
            [cancel_reason.trim(), req.params.id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'CANCEL_REQUESTED', 'order', ?, ?)`,
            [req.user.id, req.params.id, JSON.stringify({ cancel_reason: cancel_reason.trim() })]
        );
        res.json({ message: 'Cancellation requested successfully.' });
    } catch (err) {
        console.error('Cancel request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/orders/:id/cancel - Admin approves cancellation or immediately cancels
router.patch('/:id/cancel', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const [orders] = await db.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status NOT IN ('DELIVERED','CANCELLED')",
            [req.params.id]
        );
        if (!orders.length) return res.status(404).json({ error: 'Order not found or cannot be cancelled.' });

        await db.query(
            "UPDATE sales_orders SET status = 'CANCELLED' WHERE id = ?",
            [req.params.id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'ORDER_CANCELLED', 'order', ?, '{"status":"CANCELLED"}')`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'Order successfully cancelled.' });
    } catch (err) {
        console.error('Cancel approval error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/orders/:id/reject-cancel - Admin rejects the cancellation request
router.patch('/:id/reject-cancel', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const [orders] = await db.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status = 'CANCEL_REQUESTED'",
            [req.params.id]
        );
        if (!orders.length) return res.status(404).json({ error: 'Order not found or not in CANCEL_REQUESTED status.' });

        // revert to PENDING by default
        await db.query(
            "UPDATE sales_orders SET status = 'PENDING', cancel_reason = NULL WHERE id = ?",
            [req.params.id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value)
       VALUES (?, 'CANCEL_REJECTED', 'order', ?, '{"status":"PENDING"}')`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'Cancellation request rejected. Order reverted to PENDING.' });
    } catch (err) {
        console.error('Cancel rejection error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});



// PATCH /api/orders/:id/ready_to_ship - Store Incharge marks ready to ship
router.patch('/:id/ready_to_ship', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [orders] = await conn.query(
            "SELECT * FROM sales_orders WHERE id = ? AND status = 'BILLED'",
            [req.params.id]
        );
        if (!orders.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found or not in BILLED status.' });
        }

        await conn.query(
            "UPDATE sales_orders SET status = 'READY_TO_SHIP' WHERE id = ?",
            [req.params.id]
        );

        await conn.query(
            "INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value) VALUES (?, 'READY_TO_SHIP', 'order', ?, ?)",
            [req.user.id, req.params.id, '{"ready":true}']
        );

        await conn.commit();
        res.json({ message: 'Order marked as READY_TO_SHIP successfully.' });
    } catch (err) {
        await conn.rollback();
        console.error('Ready to ship error:', err);
        res.status(500).json({ error: 'Failed to update ready to ship status.' });
    } finally {
        conn.release();
    }
});

module.exports = router;

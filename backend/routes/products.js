const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/products
router.get('/', auth, async (req, res) => {
    try {
        const { category, search } = req.query;
        let conditions = ['p.is_active = 1'];
        let params = [];
        if (category) { conditions.push('p.category = ?'); params.push(category); }
        if (search) { conditions.push('p.name LIKE ?'); params.push(`%${search}%`); }

        const [rows] = await db.query(
            `SELECT p.id, p.name, p.sku, p.category, p.unit, p.mrp, p.sale_price,
              p.hsn_code, p.gst_rate, p.description,
              COALESCE(i.qty_on_hand, 0) AS qty_on_hand,
              COALESCE(i.qty_reserved, 0) AS qty_reserved
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.category, p.name`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/products
router.post('/', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { name, sku, category, unit, mrp, sale_price, hsn_code, gst_rate, description, initial_stock } = req.body;
        if (!name || !sale_price) return res.status(400).json({ error: 'name and sale_price are required.' });

        const [result] = await conn.query(
            `INSERT INTO products (name, sku, category, unit, mrp, sale_price, hsn_code, gst_rate, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, sku || null, category || null, unit || 'PCS', mrp || 0, sale_price, hsn_code || null, gst_rate || 0, description || null]
        );

        // Create inventory record
        await conn.query(
            'INSERT INTO inventory (product_id, qty_on_hand) VALUES (?, ?)',
            [result.insertId, initial_stock || 0]
        );

        await conn.commit();
        res.status(201).json({ id: result.insertId, message: 'Product created.' });
    } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU already exists.' });
        res.status(500).json({ error: 'Server error.' });
    } finally {
        conn.release();
    }
});

// PATCH /api/products/:id/stock  — adjust inventory
router.patch('/:id/stock', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { qty_on_hand } = req.body;
        if (qty_on_hand === undefined) return res.status(400).json({ error: 'qty_on_hand is required.' });
        await db.query('UPDATE inventory SET qty_on_hand = ? WHERE product_id = ?', [qty_on_hand, req.params.id]);
        res.json({ message: 'Stock updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/products/:id
router.patch('/:id', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const fields = ['name', 'sku', 'category', 'unit', 'mrp', 'sale_price', 'hsn_code', 'gst_rate', 'description', 'is_active'];
        const updates = {};
        fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update.' });
        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        await db.query(`UPDATE products SET ${setClauses} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        res.json({ message: 'Product updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

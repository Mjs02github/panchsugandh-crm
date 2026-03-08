const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

// ==========================================
// 1. RAW MATERIALS
// ==========================================

// GET /api/store/raw-materials
router.get('/raw-materials', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM raw_materials ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching raw materials.' });
    }
});

// POST /api/store/raw-materials
router.post('/raw-materials', auth, allowRoles(ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    try {
        const { name, sku, unit, min_stock } = req.body;
        if (!name || !unit) return res.status(400).json({ error: 'Name and unit are required.' });

        const [result] = await db.query(
            'INSERT INTO raw_materials (name, sku, unit, min_stock) VALUES (?, ?, ?, ?)',
            [name, sku || null, unit, min_stock || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Raw material created.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'SKU already exists.' });
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/store/raw-materials/inward
router.post('/raw-materials/inward', auth, allowRoles(ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { material_id, quantity, entry_number, batch_number, received_date, supplier_info } = req.body;

        if (!material_id || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Valid material_id and quantity > 0 are required.' });
        }

        // 1. Update quantity on hand
        await conn.query(
            'UPDATE raw_materials SET qty_on_hand = qty_on_hand + ? WHERE id = ?',
            [quantity, material_id]
        );

        // 2. Log entry
        await conn.query(
            'INSERT INTO raw_material_logs (material_id, entry_number, batch_number, received_date, quantity, supplier_info, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [material_id, entry_number || null, batch_number || null, received_date || new Date(), quantity, supplier_info || null, req.user.id]
        );

        await conn.commit();
        res.json({ message: 'Raw material stock updated.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Server error.' });
    } finally {
        conn.release();
    }
});

// ==========================================
// 2. BILL OF MATERIALS (BOM)
// ==========================================

// GET /api/store/bom/:productId
router.get('/bom/:productId', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT b.*, r.name as material_name, r.unit as material_unit 
             FROM product_bom b 
             JOIN raw_materials r ON b.material_id = r.id 
             WHERE b.product_id = ?`,
            [req.params.productId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/store/bom
router.post('/bom', auth, allowRoles(ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    const { product_id, materials } = req.body; // materials: [{ material_id, quantity_required }]
    if (!product_id || !Array.isArray(materials)) return res.status(400).json({ error: 'Invalid data.' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // Clear existing BOM
        await conn.query('DELETE FROM product_bom WHERE product_id = ?', [product_id]);

        // Insert new BOM items
        for (const item of materials) {
            await conn.query(
                'INSERT INTO product_bom (product_id, material_id, quantity_required) VALUES (?, ?, ?)',
                [product_id, item.material_id, item.quantity_required]
            );
        }

        await conn.commit();
        res.json({ message: 'BOM updated successfully.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Server error.' });
    } finally {
        conn.release();
    }
});

// ==========================================
// 3. PRODUCTION (AUTO-DEDUCT)
// ==========================================

// POST /api/store/production
router.post('/production', auth, allowRoles(ROLES.ADMIN, ROLES.STORE_INCHARGE), async (req, res) => {
    const { product_id, quantity_produced, batch_number, packing_date, notes } = req.body;
    if (!product_id || !quantity_produced || quantity_produced <= 0) {
        return res.status(400).json({ error: 'Product ID and Quantity > 0 are required.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch BOM
        const [bomItems] = await conn.query('SELECT material_id, quantity_required FROM product_bom WHERE product_id = ?', [product_id]);
        if (!bomItems.length) {
            throw new Error('No BOM defined for this product. Cannot log production.');
        }

        // 2. Check and Deduct Raw Materials
        for (const item of bomItems) {
            const totalNeeded = item.quantity_required * quantity_produced;

            // Check stock
            const [rm] = await conn.query('SELECT qty_on_hand, name FROM raw_materials WHERE id = ?', [item.material_id]);
            if (rm[0].qty_on_hand < totalNeeded) {
                throw new Error(`Insufficient stock for ${rm[0].name}. Needed ${totalNeeded}, have ${rm[0].qty_on_hand}.`);
            }

            // Deduct
            await conn.query('UPDATE raw_materials SET qty_on_hand = qty_on_hand - ? WHERE id = ?', [totalNeeded, item.material_id]);
        }

        // 3. Increase Finished Stock
        await conn.query(
            'UPDATE inventory SET qty_on_hand = qty_on_hand + ? WHERE product_id = ?',
            [quantity_produced, product_id]
        );

        // 4. Log Production
        await conn.query(
            'INSERT INTO production_logs (product_id, batch_number, packing_date, quantity_produced, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, batch_number || null, packing_date || new Date(), quantity_produced, notes || null, req.user.id]
        );

        await conn.commit();
        res.json({ message: `Production logged. ${quantity_produced} units added to stock. Raw materials deducted.` });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ error: err.message || 'Server error during production entry.' });
    } finally {
        conn.release();
    }
});

// ==========================================
// 4. SAMPLE ISSUES
// ==========================================

// GET /api/store/samples
router.get('/samples', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT s.*, p.name as product_name, u.name as requester_name, a.name as approver_name
             FROM sample_requests s
             JOIN products p ON s.product_id = p.id
             JOIN users u ON s.requested_by = u.id
             LEFT JOIN users a ON s.approved_by = a.id
             ORDER BY s.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/store/samples
router.post('/samples', auth, allowRoles(ROLES.BILL_OPERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { product_id, quantity, reason, request_date, notes } = req.body;
        if (!product_id || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid data.' });

        await db.query(
            'INSERT INTO sample_requests (product_id, quantity, reason, request_date, requested_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, quantity, reason || null, request_date || new Date(), req.user.id, notes || null]
        );
        res.status(201).json({ message: 'Sample request submitted for Admin approval.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/store/samples/:id/approve
router.patch('/samples/:id/approve', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get request details
        const [reqs] = await conn.query('SELECT * FROM sample_requests WHERE id = ?', [req.params.id]);
        if (!reqs.length) throw new Error('Request not found.');
        if (reqs[0].status !== 'PENDING') throw new Error('Request is already processed.');

        const { product_id, quantity } = reqs[0];

        // 2. Check stock
        const [inv] = await conn.query('SELECT qty_on_hand FROM inventory WHERE product_id = ?', [product_id]);
        if (!inv.length || inv[0].qty_on_hand < quantity) {
            throw new Error('Insufficient stock in inventory to issue this sample.');
        }

        // 3. Deduct stock
        await conn.query('UPDATE inventory SET qty_on_hand = qty_on_hand - ? WHERE product_id = ?', [quantity, product_id]);

        // 4. Update request
        await conn.query(
            'UPDATE sample_requests SET status = "APPROVED", approved_by = ?, approved_at = NOW() WHERE id = ?',
            [req.user.id, req.params.id]
        );

        await conn.commit();
        res.json({ message: 'Sample request approved and stock deducted.' });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ error: err.message || 'Server error.' });
    } finally {
        conn.release();
    }
});

// PATCH /api/store/samples/:id/reject
router.patch('/samples/:id/reject', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        await db.query('UPDATE sample_requests SET status = "REJECTED", approved_by = ?, approved_at = NOW() WHERE id = ?', [req.user.id, req.params.id]);
        res.json({ message: 'Sample request rejected.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// ==========================================
// 5. PACKING CAPACITY
// ==========================================

// GET /api/store/capacity
router.get('/capacity', auth, async (req, res) => {
    try {
        // This is a complex query to calculate how many units of each product can be made
        // based on the lowest available raw material in its BOM.
        const [rows] = await db.query(`
            SELECT 
                p.id as product_id,
                p.name as product_name,
                MIN(FLOOR(rm.qty_on_hand / pb.quantity_required)) as possible_quantity
            FROM products p
            JOIN product_bom pb ON p.id = pb.product_id
            JOIN raw_materials rm ON pb.material_id = rm.id
            GROUP BY p.id, p.name
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error calculating capacity.' });
    }
});

module.exports = router;

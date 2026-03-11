const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is procurement or admin
// (In a more robust system, we would have a central authorize middleware)

// ── Vendors ──────────────────────────────────────────────────

router.get('/vendors', async (req, res) => {
    try {
        const [vendors] = await db.query('SELECT * FROM vendors ORDER BY name ASC');
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vendors', async (req, res) => {
    const { name, contact_person, phone, email, address, gstin, category, material_names, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO vendors (name, contact_person, phone, email, address, gstin, category, material_names, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, contact_person, phone, email, address, gstin, category, material_names || null, status || 'ACTIVE']
        );
        res.status(201).json({ id: result.insertId, message: 'Vendor added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/vendors/:id', async (req, res) => {
    const { name, contact_person, phone, email, address, gstin, category, material_names, status } = req.body;
    try {
        await db.query(
            'UPDATE vendors SET name=?, contact_person=?, phone=?, email=?, address=?, gstin=?, category=?, material_names=?, status=? WHERE id=?',
            [name, contact_person, phone, email, address, gstin, category, material_names, status, req.params.id]
        );
        res.json({ message: 'Vendor updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/vendors/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM vendors WHERE id=?', [req.params.id]);
        res.json({ message: 'Vendor deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Material Planning ─────────────────────────────────────────

router.post('/calculate-requirements', async (req, res) => {
    const { targets } = req.body; // Array of { productId, quantity }
    
    if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Targets array is required' });
    }

    try {
        const requirements = {}; // materialId -> { name, unit, requiredQty, currentQty }

        for (const target of targets) {
            const { productId, quantity } = target;

            // Fetch BOM for this product
            const [bomItems] = await db.query(`
                SELECT pb.material_id, pb.quantity_required, rm.name, rm.unit, rm.qty_on_hand
                FROM product_bom pb
                JOIN raw_materials rm ON pb.material_id = rm.id
                WHERE pb.product_id = ?
            `, [productId]);

            for (const item of bomItems) {
                if (!requirements[item.material_id]) {
                    requirements[item.material_id] = {
                        material_id: item.material_id,
                        name: item.name,
                        unit: item.unit,
                        requiredQty: 0,
                        currentQty: parseFloat(item.qty_on_hand)
                    };
                }
                requirements[item.material_id].requiredQty += (parseFloat(item.quantity_required) * quantity);
            }
        }

        const result = Object.values(requirements).map(req => ({
            ...req,
            shortfall: Math.max(0, req.requiredQty - req.currentQty)
        }));

        res.json(result);
    } catch (error) {
        console.error('Calculation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save a plan
router.post('/plans', async (req, res) => {
    const { targetData, resultData, createdBy } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO procurement_plans (target_data, result_data, created_by) VALUES (?, ?, ?)',
            [JSON.stringify(targetData), JSON.stringify(resultData), createdBy]
        );
        res.status(201).json({ id: result.insertId, message: 'Plan saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/plans', async (req, res) => {
    try {
        const [plans] = await db.query(`
            SELECT pp.*, u.name as creator_name 
            FROM procurement_plans pp
            LEFT JOIN users u ON pp.created_by = u.id
            ORDER BY pp.created_at DESC
        `);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Material Requests (Store <=> Procurement) ─────────────────

router.get('/requests', async (req, res) => {
    const { role, userId } = req.query;
    try {
        let query = `
            SELECT mr.*, u.name as requester_name, rm.name as official_material_name
            FROM material_requests mr
            JOIN users u ON mr.requested_by = u.id
            LEFT JOIN raw_materials rm ON mr.material_id = rm.id
        `;
        const params = [];

        if (role === 'store_incharge') {
            query += ' WHERE mr.requested_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY mr.created_at DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/requests', async (req, res) => {
    const { item_name, material_id, quantity, unit, priority, requested_by, notes } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO material_requests (item_name, material_id, quantity, unit, priority, requested_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item_name, material_id || null, quantity, unit, priority || 'MEDIUM', requested_by, notes]
        );
        res.status(201).json({ id: result.insertId, message: 'Request submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/requests/:id', async (req, res) => {
    const { status, notes } = req.body;
    try {
        let updateFields = [];
        let params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }
        if (notes !== undefined) {
            updateFields.push('notes = ?');
            params.push(notes);
        }

        if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        params.push(req.params.id);
        const query = `UPDATE material_requests SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.query(query, params);
        res.json({ message: 'Request updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

const STORE_ADMINS = [ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const CAN_ADD_RETAILER = [ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SALESPERSON, ROLES.BILL_OPERATOR];

// GET /api/retailers
router.get('/', auth, async (req, res) => {
    try {
        const { area_id, search, page = 1, limit = 50 } = req.query;
        let conditions = [];
        let params = [];

        if (area_id) { conditions.push('r.area_id = ?'); params.push(area_id); }
        if (search) {
            conditions.push('(r.firm_name LIKE ? OR r.owner_name LIKE ? OR r.phone LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        conditions.push('r.is_active = 1');

        // Removed: Salespersons used to see only retailers in their assigned areas. 
        // We now let all roles see all active retailers to avoid missing party issues.

        const where = 'WHERE ' + conditions.join(' AND ');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows] = await db.query(
            `SELECT r.id, r.firm_name, r.owner_name, r.phone, r.address,
              r.credit_limit, r.outstanding, r.gst_number, r.area_id,
              a.name AS area_name
       FROM retailers r
       LEFT JOIN areas a ON r.area_id = a.id
       ${where}
       ORDER BY r.firm_name
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/retailers/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.*, a.name AS area_name
       FROM retailers r LEFT JOIN areas a ON r.area_id = a.id
       WHERE r.id = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Retailer not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/retailers — Store In-charge, Admin, Salesperson, Bill Operator can add
router.post('/', auth, allowRoles(...CAN_ADD_RETAILER), async (req, res) => {
    try {
        const { firm_name, owner_name, phone, alt_phone, email, address, area_id, gst_number, credit_limit } = req.body;
        if (!firm_name) return res.status(400).json({ error: 'firm_name is required.' });

        let finalAreaId = area_id || null;

        // If an area string was provided (NaN) instead of a numeric ID, create it automatically
        if (area_id && isNaN(area_id)) {
            const [existingArea] = await db.query('SELECT id FROM areas WHERE name = ? LIMIT 1', [area_id.trim()]);
            if (existingArea.length) {
                finalAreaId = existingArea[0].id;
            } else {
                const [newArea] = await db.query('INSERT INTO areas (name) VALUES (?)', [area_id.trim()]);
                finalAreaId = newArea.insertId;
                // If salesperson creates a new area, auto-assign it so they can see the party
                if (req.user.role === ROLES.SALESPERSON) {
                    await db.query('INSERT INTO user_areas (user_id, area_id) VALUES (?, ?)', [req.user.id, finalAreaId]);
                }
            }
        }

        const [result] = await db.query(
            `INSERT INTO retailers
         (firm_name, owner_name, phone, alt_phone, email, address, area_id, gst_number, credit_limit, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firm_name, owner_name || null, phone || null, alt_phone || null, email || null,
                address || null, finalAreaId, gst_number || null, credit_limit || 0, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Retailer created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/retailers/:id
router.patch('/:id', auth, allowRoles(...STORE_ADMINS), async (req, res) => {
    try {
        const fields = ['firm_name', 'owner_name', 'phone', 'alt_phone', 'email', 'address', 'area_id', 'gst_number', 'credit_limit', 'is_active'];
        const updates = {};
        fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update.' });

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        await db.query(`UPDATE retailers SET ${setClauses} WHERE id = ?`,
            [...Object.values(updates), req.params.id]);
        res.json({ message: 'Retailer updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

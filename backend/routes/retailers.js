const express = require('express');
const axios = require('axios');
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
        const { firm_name, owner_name, phone, alt_phone, email, address, area_id, gst_number, credit_limit, latitude, longitude } = req.body;
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
          (firm_name, owner_name, phone, alt_phone, email, address, area_id, gst_number, credit_limit, latitude, longitude, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firm_name, owner_name || null, phone || null, alt_phone || null, email || null,
                address || null, finalAreaId, gst_number || null, credit_limit || 0, latitude || null, longitude || null, req.user.id]
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
        const fields = ['firm_name', 'owner_name', 'phone', 'alt_phone', 'email', 'address', 'area_id', 'gst_number', 'credit_limit', 'is_active', 'latitude', 'longitude'];
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

// GET /api/retailers/gst-lookup/:gstin
router.get('/gst-lookup/:gstin', auth, async (req, res) => {
    try {
        const { gstin } = req.params;
        if (!gstin || gstin.length !== 15) {
            return res.status(400).json({ error: 'Invalid GSTIN length.' });
        }

        const headers = {
            'authority': 'blog-backend.mastersindia.co',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'origin': 'https://www.mastersindia.co',
            'referer': 'https://www.mastersindia.co/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        };

        // 1. Try to fetch a fresh unique_id from the landing page
        let uniqueId = 'nwSEqZtTbMwWnFflshUXcGT6e6sOdi'; // Default fallback
        try {
            const landingPage = await axios.get('https://www.mastersindia.co/gst-number-search-and-gstin-verification/', { headers });
            const match = landingPage.data.match(/"unique_id":"([^"]+)"/);
            if (match) uniqueId = match[1];
        } catch (e) {
            console.warn('Failed to fetch fresh unique_id, using fallback');
        }

        // 2. Perform the lookup
        const url = `https://blog-backend.mastersindia.co/api/v1/custom/search/gstin/?keyword=${gstin.toUpperCase()}&unique_id=${uniqueId}`;
        
        const response = await axios.get(url, { headers, timeout: 10000 });
        
        const result = response.data;
        if (!result || !result.success || !result.data || !result.data.lgnm) {
            return res.status(404).json({ error: 'GSTIN details not found or service unavailable.' });
        }

        const tp = result.data;
        const addr = tp.pradr?.addr || {};
        
        // Construct a clean address string
        const addressParts = [
            addr.bno, 
            addr.st, 
            addr.loc, 
            addr.dst, 
            tp.pradr?.ntr // Nature of business activity
        ].filter(p => p && p !== 'null' && p !== 'undefined' && p !== '');

        res.json({
            firm_name: tp.tradeNam || tp.lgnm || '',
            owner_name: tp.lgnm || '',
            address: addressParts.join(', '),
            state: addr.stcd || '',
            district: addr.dst || ''
        });
    } catch (err) {
        console.error('GST Lookup Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch GST details. Service may be busy.' });
    }
});

// --- PARTY EDIT APPROVAL WORKFLOW ---

// POST /api/retailers/edit-request
// Allows Bill Operator and others to submit proposed changes
router.post('/edit-request', auth, allowRoles(ROLES.BILL_OPERATOR, ROLES.SALESPERSON, ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { retailer_id, proposed_data } = req.body;
        if (!retailer_id || !proposed_data) {
            return res.status(400).json({ error: 'retailer_id and proposed_data are required.' });
        }

        await db.query(
            `INSERT INTO retailer_edit_requests (retailer_id, requested_by, proposed_data, status)
             VALUES (?, ?, ?, 'PENDING')`,
            [retailer_id, req.user.id, JSON.stringify(proposed_data)]
        );

        res.status(201).json({ message: 'Edit request submitted for admin approval.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/retailers/edit-requests
// Admins can see all pending/processed requests
router.get('/edit-requests', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { status = 'PENDING' } = req.query;
        const [rows] = await db.query(
            `SELECT rer.*, r.firm_name, u.name as requester_name
             FROM retailer_edit_requests rer
             JOIN retailers r ON rer.retailer_id = r.id
             JOIN users u ON rer.requested_by = u.id
             WHERE rer.status = ?
             ORDER BY rer.created_at DESC`,
            [status]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/retailers/edit-requests/:id/process
// Approve or Reject a request
router.post('/edit-requests/:id/process', auth, allowRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { status, admin_remark } = req.body; // 'APPROVED' or 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use APPROVED or REJECTED.' });
        }

        await connection.beginTransaction();

        // 1. Get the request
        const [requests] = await connection.query('SELECT * FROM retailer_edit_requests WHERE id = ? FOR UPDATE', [req.params.id]);
        if (!requests.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Request not found.' });
        }
        const request = requests[0];
        if (request.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({ error: 'Request already processed.' });
        }

        // 2. Update request status
        await connection.query(
            `UPDATE retailer_edit_requests 
             SET status = ?, admin_remark = ?, processed_by = ?, processed_at = NOW() 
             WHERE id = ?`,
            [status, admin_remark || null, req.user.id, req.params.id]
        );

        // 3. If APPROVED, update the retailer table
        if (status === 'APPROVED') {
            const proposedData = typeof request.proposed_data === 'string' ? JSON.parse(request.proposed_data) : request.proposed_data;
            const fields = Object.keys(proposedData);
            if (fields.length > 0) {
                const setClauses = fields.map(f => `${f} = ?`).join(', ');
                await connection.query(
                    `UPDATE retailers SET ${setClauses} WHERE id = ?`,
                    [...Object.values(proposedData), request.retailer_id]
                );
            }
        }

        await connection.commit();
        res.json({ message: `Request ${status.toLowerCase()} successfully.` });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally {
        connection.release();
    }
});

module.exports = router;

const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');
const router = express.Router();

// GET /api/areas
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, city, state FROM areas WHERE is_active = 1 ORDER BY name'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/areas
router.post('/', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { name, city, state } = req.body;
        if (!name) return res.status(400).json({ error: 'Area name is required.' });
        const [result] = await db.query(
            'INSERT INTO areas (name, city, state) VALUES (?, ?, ?)',
            [name, city || null, state || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Area created.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// PATCH /api/areas/:id
router.patch('/:id', auth, allowRoles(ROLES.STORE_INCHARGE, ROLES.ADMIN, ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { name, city, state, is_active } = req.body;
        await db.query(
            'UPDATE areas SET name=COALESCE(?,name), city=COALESCE(?,city), state=COALESCE(?,state), is_active=COALESCE(?,is_active) WHERE id=?',
            [name || null, city || null, state || null, is_active ?? null, req.params.id]
        );
        res.json({ message: 'Area updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;

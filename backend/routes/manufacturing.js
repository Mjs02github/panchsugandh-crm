const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

/**
 * GET /api/manufacturing/logs
 * Fetch all internal production logs
 */
router.get('/logs', auth, allowRoles([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STORE_INCHARGE, ROLES.PROCUREMENT, ROLES.MANUFACTURING_MANAGER]), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ipl.*, rm.name as material_name, u.name as creator_name
            FROM internal_production_logs ipl
            JOIN raw_materials rm ON ipl.material_id = rm.id
            JOIN users u ON ipl.created_by = u.id
            ORDER BY ipl.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching manufacturing logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

/**
 * POST /api/manufacturing/record
 * Record internal production of raw materials
 */
router.post('/record', auth, allowRoles([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANUFACTURING_MANAGER]), async (req, res) => {
    const { material_id, quantity, batch_number, production_date, notes } = req.body;

    if (!material_id || !quantity || !production_date) {
        return res.status(400).json({ error: 'Material, quantity, and date are required' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insert production log
        const [result] = await connection.query(`
            INSERT INTO internal_production_logs (material_id, quantity, batch_number, production_date, created_by, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [material_id, quantity, batch_number, production_date, req.user.id, notes]);

        // 2. Update raw material stock
        await connection.query(`
            UPDATE raw_materials 
            SET qty_on_hand = qty_on_hand + ? 
            WHERE id = ?
        `, [quantity, material_id]);

        await connection.commit();
        res.json({ success: true, logId: result.insertId });
    } catch (error) {
        await connection.rollback();
        console.error('Error recording production:', error);
        res.status(500).json({ error: 'Failed to record production' });
    } finally {
        connection.release();
    }
});

module.exports = router;

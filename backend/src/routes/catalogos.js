const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/catalogos/origenes
router.get('/origenes', async (req, res) => {
    try {
        const origenes = await db.prepare(`
            SELECT OrigenID as id, Nombre as nombre
            FROM Origenes
            WHERE Activo = 1
            ORDER BY Nombre
        `).all();

        res.json(origenes || []);
    } catch (error) {
        console.error('Error al obtener catalogos de origenes:', error);
        res.json([]);
    }
});

module.exports = router;

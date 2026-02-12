const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET /api/origenes
router.get('/', async (req, res) => {
    try {
        const origenes = await db.prepare(`
      SELECT * FROM Origenes 
      WHERE Activo = 1 
      ORDER BY Nombre
    `).all();

        res.json(origenes);
    } catch (error) {
        console.error('Error al obtener orígenes:', error);
        res.status(500).json({ error: 'Error al obtener orígenes' });
    }
});

// POST /api/origenes (solo DISTRIBUIDOR/ADMIN)
router.post('/', checkRole('DISTRIBUIDOR'), async (req, res) => {
    try {
        const { nombre, tipo } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }

        const result = await db.prepare(`
      INSERT INTO Origenes (Nombre, Tipo)
      VALUES (?, ?)
      RETURNING OrigenID AS "lastInsertRowid"
    `).run(nombre, tipo || null);

        res.status(201).json({
            origenId: result.lastInsertRowid,
            mensaje: 'Origen creado exitosamente'
        });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Ese origen ya existe' });
        }
        console.error('Error al crear origen:', error);
        res.status(500).json({ error: 'Error al crear origen' });
    }
});

module.exports = router;

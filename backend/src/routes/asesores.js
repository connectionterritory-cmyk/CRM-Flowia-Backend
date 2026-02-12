const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/asesores
router.get('/', (req, res) => {
    try {
        const asesores = db.prepare(`
            SELECT UsuarioID as id, Nombre as nombre, Rol as rol
            FROM Usuarios
            WHERE Activo = 1
            ORDER BY Nombre
        `).all();

        res.json(asesores || []);
    } catch (error) {
        console.error('Error al obtener asesores:', error);
        res.json([]);
    }
});

module.exports = router;

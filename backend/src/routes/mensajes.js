const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET Messages
router.get('/', async (req, res) => {
    try {
        const { clienteId } = req.query;
        if (!clienteId) return res.status(400).json({ error: 'clienteId required' });

        const mensajes = await db.prepare('SELECT * FROM MensajesCRM WHERE ClienteID = ? ORDER BY FechaRegistro DESC').all(clienteId);
        res.json(mensajes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Register Message
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { ClienteID, Tipo, Direccion, Asunto, Contenido, Telefono, Email } = req.body;

        // Log only, NO real sending in MVP Phase 1
        await db.prepare(`
            INSERT INTO MensajesCRM (ClienteID, Tipo, Direccion, Asunto, Contenido, Telefono, Email, Estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Registrado')
        `).run(ClienteID, Tipo, Direccion, Asunto, Contenido, Telefono, Email);

        res.json({ message: 'Mensaje registrado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

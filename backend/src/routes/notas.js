const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET Notes
// GET Notes (Global or by Client)
router.get('/', async (req, res) => {
    try {
        const { clienteId, limit } = req.query;

        let query, params;

        if (clienteId) {
            query = 'SELECT * FROM NotasRP WHERE ClienteID = ? ORDER BY FechaCreacion DESC';
            params = [clienteId];
        } else {
            // Global notes view - Join with Clientes to show who the note is about
            query = `
                SELECT n.*, c.Nombre as ClienteNombre 
                FROM NotasRP n
                JOIN Clientes c ON n.ClienteID = c.ClienteID
                ORDER BY n.FechaCreacion DESC
                LIMIT ?
            `;
            params = [limit || 50];
        }

        const notas = await db.prepare(query).all(...params);
        res.json(notas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create Note
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { ClienteID, Tipo, Contenido, CreadoPor } = req.body;

        await db.prepare(`
            INSERT INTO NotasRP (ClienteID, Tipo, Contenido, CreadoPor, Leido)
            VALUES (?, ?, ?, ?, 0)
        `).run(ClienteID, Tipo || 'General', Contenido, CreadoPor);

        res.json({ message: 'Nota creada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Mark as Read
router.put('/:id/marcar-leido', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        await db.prepare('UPDATE NotasRP SET Leido = 1, FechaLeido = CURRENT_TIMESTAMP WHERE NotaID = ?').run(req.params.id);
        res.json({ message: 'Nota marcada como leída' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Note
router.delete('/:id', checkRole('DISTRIBUIDOR', 'VENDEDOR'), async (req, res) => {
    try {
        await db.prepare('DELETE FROM NotasRP WHERE NotaID = ?').run(req.params.id);
        res.json({ message: 'Nota eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

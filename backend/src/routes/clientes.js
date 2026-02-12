const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET all clients (summary via view)
router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        let query = 'SELECT * FROM Vista_Cliente_Resumen';
        const params = [];
        if (q) {
            query += ' WHERE Nombre LIKE ? OR Telefono LIKE ? OR Email LIKE ?';
            const term = `%${q}%`;
            params.push(term, term, term);
        }
        const clientes = await db.prepare(query).all(...params);
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single client
router.get('/:id', async (req, res) => {
    try {
        const cliente = await db.prepare('SELECT * FROM Clientes WHERE ClienteID = ?').get(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

        // Also fetch Account details directly + stats
        const cuenta = await db.prepare('SELECT * FROM CuentaRP WHERE ClienteID = ?').get(req.params.id);

        res.json({ ...cliente, cuenta });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new client
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, TipoCliente } = req.body;

        if (!Ciudad) {
            return res.status(400).json({ error: 'Ciudad es obligatoria' });
        }

        if (!EstadoProvincia) {
            return res.status(400).json({ error: 'Estado/Provincia es obligatorio' });
        }

        const paisValue = Pais || 'USA';
        if (paisValue === 'USA' && !Zipcode) {
            return res.status(400).json({ error: 'ZIP Code es obligatorio para USA' });
        }

        const info = await db.prepare(`
            INSERT INTO Clientes (Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, TipoCliente)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ClienteID AS "lastInsertRowid"
        `).run(Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode || null, paisValue, TipoCliente || 'Residencial');

        // Create Account
        await db.prepare('INSERT INTO CuentaRP (ClienteID) VALUES (?)').run(info.lastInsertRowid);

        res.json({ id: info.lastInsertRowid, message: 'Cliente creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update client
router.put('/:id', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, Estado, TipoCliente } = req.body;

        if (!Ciudad) {
            return res.status(400).json({ error: 'Ciudad es obligatoria' });
        }

        if (!EstadoProvincia) {
            return res.status(400).json({ error: 'Estado/Provincia es obligatorio' });
        }

        const paisValue = Pais || 'USA';
        if (paisValue === 'USA' && !Zipcode) {
            return res.status(400).json({ error: 'ZIP Code es obligatorio para USA' });
        }

        await db.prepare(`
            UPDATE Clientes 
            SET Nombre = ?, Telefono = ?, Email = ?, Direccion = ?, Ciudad = ?, EstadoProvincia = ?, Zipcode = ?, Pais = ?, Estado = ?, TipoCliente = ?
            WHERE ClienteID = ?
        `).run(Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode || null, paisValue, Estado, TipoCliente, req.params.id);

        res.json({ message: 'Cliente actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE client (admin only)
router.delete('/:id', checkRole('DISTRIBUIDOR'), async (req, res) => {
    try {
        const existing = await db.prepare('SELECT ClienteID FROM Clientes WHERE ClienteID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

        await db.prepare('DELETE FROM Clientes WHERE ClienteID = ?').run(req.params.id);
        res.json({ message: 'Cliente eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

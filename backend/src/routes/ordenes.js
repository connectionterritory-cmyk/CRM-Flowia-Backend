const express = require('express');
const router = express.Router();
const db = require('../config/database');
const CalculationService = require('../services/CalculationService');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET Orders by ClienteID
// GET Orders (Global or by Client)
router.get('/', async (req, res) => {
    try {
        const { clienteId } = req.query;

        let query, params;

        if (clienteId) {
            query = `
                SELECT o.*, c.Nombre as ClienteNombre 
                FROM OrdenesRP o
                JOIN Clientes c ON o.ClienteID = c.ClienteID
                WHERE o.ClienteID = ? 
                ORDER BY o.Fecha DESC
            `;
            params = [clienteId];
        } else {
            // Global orders view
            query = `
                SELECT o.*, c.Nombre as ClienteNombre 
                FROM OrdenesRP o
                JOIN Clientes c ON o.ClienteID = c.ClienteID
                ORDER BY o.Fecha DESC
                LIMIT 50
            `;
            params = [];
        }

        const ordenes = await db.prepare(query).all(...params);
        res.json(ordenes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Single Order
router.get('/:id', async (req, res) => {
    try {
        const orden = await db.prepare('SELECT * FROM OrdenesRP WHERE OrdenID = ?').get(req.params.id);
        if (!orden) return res.status(404).json({ error: 'Order not found' });

        const items = await db.prepare('SELECT * FROM OrdenItemsRP WHERE OrdenID = ?').all(req.params.id);
        res.json({ ...orden, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create Order with Items
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR'), async (req, res) => {
    try {
        const { ClienteID, CuentaID, NumeroOrden, Fecha, TipoOrden, Impuestos, Notas, items } = req.body;

        await db.execAsync('BEGIN');
        let newOrdenId;
        try {
            // 1. Create Order
            const info = await db.prepare(`
                INSERT INTO OrdenesRP (ClienteID, CuentaID, NumeroOrden, Fecha, TipoOrden, Impuestos, Notas, Total, Balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
                RETURNING OrdenID AS "lastInsertRowid"
            `).run(ClienteID, CuentaID, NumeroOrden, Fecha, TipoOrden, Impuestos || 0, Notas);

            const ordenId = info.lastInsertRowid;
            newOrdenId = ordenId;

            // 2. Add Items
            if (items && Array.isArray(items)) {
                const insertItem = db.prepare(`
                    INSERT INTO OrdenItemsRP (OrdenID, Descripcion, Cantidad, PrecioUnitario, Subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `);

                for (const item of items) {
                    const subtotal = item.Cantidad * item.PrecioUnitario;
                    await insertItem.run(ordenId, item.Descripcion, item.Cantidad, item.PrecioUnitario, subtotal);
                }
            }

            // 3. Recalculate Totals
            await CalculationService.recalculateOrder(ordenId);

            await db.execAsync('COMMIT');
        } catch (error) {
            await db.execAsync('ROLLBACK');
            throw error;
        }

        res.json({ id: newOrdenId, message: 'Orden creada exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Add Item
router.post('/:id/items', checkRole('DISTRIBUIDOR', 'VENDEDOR'), async (req, res) => {
    try {
        const { Descripcion, Cantidad, PrecioUnitario } = req.body;
        const Subtotal = Cantidad * PrecioUnitario;

        await db.prepare(`
            INSERT INTO OrdenItemsRP (OrdenID, Descripcion, Cantidad, PrecioUnitario, Subtotal)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.params.id, Descripcion, Cantidad, PrecioUnitario, Subtotal);

        await CalculationService.recalculateOrder(req.params.id);

        res.json({ message: 'Item agregado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

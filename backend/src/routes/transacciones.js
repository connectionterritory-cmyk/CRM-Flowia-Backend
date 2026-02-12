const express = require('express');
const router = express.Router();
const db = require('../config/database');
const CalculationService = require('../services/CalculationService');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET Transactions
router.get('/', async (req, res) => {
    try {
        const { clienteId, cuentaId } = req.query;
        let sql = 'SELECT * FROM TransaccionesRP WHERE 1=1';
        const params = [];

        if (clienteId) {
            sql += ' AND ClienteID = ?';
            params.push(clienteId);
        }
        if (cuentaId) {
            sql += ' AND CuentaID = ?';
            params.push(cuentaId);
        }

        sql += ' ORDER BY Fecha DESC';
        const transacciones = await db.prepare(sql).all(params);
        res.json(transacciones);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Transaction
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR'), async (req, res) => {
    try {
        const { ClienteID, CuentaID, OrdenID, Tipo, Monto, Fecha, MetodoPago, Referencia, Descripcion } = req.body;

        await db.prepare(`
            INSERT INTO TransaccionesRP (ClienteID, CuentaID, OrdenID, Tipo, Monto, Fecha, MetodoPago, Referencia, Descripcion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(ClienteID, CuentaID, OrdenID, Tipo, Monto, Fecha, MetodoPago, Referencia, Descripcion);

        await CalculationService.recalculateAccount(CuentaID);

        if (OrdenID) {
            await CalculationService.recalculateOrderBalance(OrdenID);
        }

        res.json({ message: 'Transacción registrada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

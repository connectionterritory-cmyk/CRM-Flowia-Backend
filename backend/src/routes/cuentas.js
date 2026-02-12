const express = require('express');
const router = express.Router();
const db = require('../config/database');
const CalculationService = require('../services/CalculationService');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

// GET Account by ClienteID
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const cuenta = await db.prepare('SELECT * FROM CuentaRP WHERE ClienteID = ?').get(req.params.clienteId);
        if (!cuenta) {
            // Create if not exists (should have been created, but safety first)
            await db.prepare('INSERT INTO CuentaRP (ClienteID) VALUES (?)').run(req.params.clienteId);
            const newCuenta = await db.prepare('SELECT * FROM CuentaRP WHERE ClienteID = ?').get(req.params.clienteId);
            return res.json(newCuenta);
        }
        res.json(cuenta);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Aging details (just the account fields essentially)
router.get('/:id/aging', async (req, res) => {
    try {
        const cuenta = await db.prepare('SELECT Aging_0_30, Aging_31_60, Aging_61_90, Aging_90Plus FROM CuentaRP WHERE CuentaID = ?').get(req.params.id);
        res.json(cuenta);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Recalculate Aging Manually
router.put('/:id/recalcular-aging', checkRole('DISTRIBUIDOR', 'VENDEDOR'), async (req, res) => {
    try {
        await CalculationService.recalculateAccount(req.params.id);
        const cuenta = await db.prepare('SELECT * FROM CuentaRP WHERE CuentaID = ?').get(req.params.id);
        res.json({ message: 'Aging recalculado', cuenta });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

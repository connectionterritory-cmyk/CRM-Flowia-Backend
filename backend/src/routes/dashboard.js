const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/stats', async (req, res) => {
    try {
        const totalClientesRow = await db.prepare('SELECT COUNT(*) as count FROM Clientes').get();
        const clientesActivosRow = await db.prepare('SELECT COUNT(*) as count FROM Clientes WHERE Estado = ?').get('Activo');

        const saldos = await db.prepare('SELECT SUM(SaldoTotal) as total, SUM(SaldoVencido) as vencido FROM CuentaRP').get();

        const ordenesAbiertasRow = await db.prepare("SELECT COUNT(*) as count FROM OrdenesRP WHERE Estado != 'Completada' AND Estado != 'Cancelada'").get();
        const notasNoLeidasRow = await db.prepare('SELECT COUNT(*) as count FROM NotasRP WHERE Leido = 0').get();

        const totalClientes = totalClientesRow?.count || 0;
        const clientesActivos = clientesActivosRow?.count || 0;
        const ordenesAbiertas = ordenesAbiertasRow?.count || 0;
        const notasNoLeidas = notasNoLeidasRow?.count || 0;

        res.json({
            totalClientes,
            clientesActivos,
            saldoTotalPendiente: saldos.total || 0,
            saldoVencido: saldos.vencido || 0,
            ordenesAbiertas,
            notasNoLeidas
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/alertas', async (req, res) => {
    try {
        const alertas = [];

        // Mora 90+
        const morosos = await db.prepare('SELECT c.ClienteID, c.Nombre FROM CuentaRP ct JOIN Clientes c ON ct.ClienteID = c.ClienteID WHERE ct.Aging_90Plus > 0').all();
        morosos.forEach(m => {
            alertas.push({
                tipo: 'mora',
                clienteId: m.ClienteID,
                mensaje: `Cliente ${m.Nombre} con saldo 90+ días vencido`
            });
        });

        // Notas no leidas (Priority) - limit to recent
        const notas = await db.prepare("SELECT n.ClienteID, c.Nombre FROM NotasRP n JOIN Clientes c ON n.ClienteID = c.ClienteID WHERE n.Leido = 0 AND n.Tipo IN ('Cobranza', 'Importante')").all();
        notas.forEach(n => {
            alertas.push({
                tipo: 'nota',
                clienteId: n.ClienteID,
                mensaje: `Nota importante sin leer: ${n.Nombre}`
            });
        });

        res.json(alertas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const UserModel = require('../models/User');
const crypto = require('crypto');
const db = require('../config/database');
const EmailService = require('../services/EmailService');

const router = express.Router();

router.use(auth);

const canWrite = checkRole('DISTRIBUIDOR', 'ADMIN');

const resolveAppBaseUrl = () => process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const createInviteForUser = async (user) => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await db.prepare('UPDATE Usuarios SET invite_token_hash = ?, invite_expires_at = ? WHERE UsuarioID = ?')
        .run(tokenHash, expiresAt, user.id);

    const link = `${resolveAppBaseUrl()}/set-password?token=${token}`;
    await EmailService.sendInvite({
        to: user.email,
        name: user.full_name || user.Nombre,
        link
    });
};

const hasAssignmentsTable = async () => {
    const row = await db.prepare("SELECT to_regclass('public.telemarketingasignaciones') as name").get();
    return Boolean(row?.name);
};

const ensureAssignmentsTable = async () => {
    if (await hasAssignmentsTable()) return;
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS TelemarketingAsignaciones (
            TelemarketingUserID INTEGER NOT NULL,
            SellerUserID INTEGER NOT NULL,
            CreatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (TelemarketingUserID, SellerUserID),
            FOREIGN KEY (TelemarketingUserID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE,
            FOREIGN KEY (SellerUserID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE
        )
    `);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tm_assignments_telemarketing ON TelemarketingAsignaciones(TelemarketingUserID)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_tm_assignments_seller ON TelemarketingAsignaciones(SellerUserID)');
};

router.get('/', async (req, res) => {
    try {
        const { q, role, active } = req.query;
        const users = await UserModel.getAll({ q, role, active });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await UserModel.getById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/assignments', canWrite, async (req, res) => {
    try {
        const user = await UserModel.getById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.role !== 'TELEMARKETING') {
            return res.json([]);
        }
        await ensureAssignmentsTable();

        const assignments = await db.prepare(`
            SELECT ta.SellerUserID as id, u.Nombre as nombre, u.Rol as rol
            FROM TelemarketingAsignaciones ta
            JOIN Usuarios u ON u.UsuarioID = ta.SellerUserID
            WHERE ta.TelemarketingUserID = ?
            ORDER BY u.Nombre ASC
        `).all(user.id);

        res.json(assignments || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/assignments', canWrite, async (req, res) => {
    try {
        const user = await UserModel.getById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.role !== 'TELEMARKETING') {
            return res.status(400).json({ error: 'Solo se pueden asignar vendedores a telemarketing' });
        }
        await ensureAssignmentsTable();

        const sellerIds = Array.isArray(req.body?.sellerIds) ? req.body.sellerIds : [];
        const normalized = sellerIds
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0);

        await db.execAsync('BEGIN');
        try {
            await db.prepare('DELETE FROM TelemarketingAsignaciones WHERE TelemarketingUserID = ?')
                .run(user.id);

            if (normalized.length > 0) {
                const insert = db.prepare(`
                    INSERT INTO TelemarketingAsignaciones (TelemarketingUserID, SellerUserID)
                    VALUES (?, ?)
                    ON CONFLICT DO NOTHING
                `);
                for (const sellerId of normalized) {
                    await insert.run(user.id, sellerId);
                }
            }

            await db.execAsync('COMMIT');
        } catch (error) {
            await db.execAsync('ROLLBACK');
            throw error;
        }

        const updated = await db.prepare(`
            SELECT ta.SellerUserID as id, u.Nombre as nombre, u.Rol as rol
            FROM TelemarketingAsignaciones ta
            JOIN Usuarios u ON u.UsuarioID = ta.SellerUserID
            WHERE ta.TelemarketingUserID = ?
            ORDER BY u.Nombre ASC
        `).all(user.id);

        res.json(updated || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', canWrite, async (req, res) => {
    try {
        const result = await UserModel.create(req.body);
        if (result?.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        if (result?.email && !req.body?.password) {
            await createInviteForUser(result);
        }
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/send-invite', canWrite, async (req, res) => {
    try {
        const user = await UserModel.getById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (!user.email) return res.status(400).json({ error: 'Usuario sin email' });

        await createInviteForUser(user);
        res.json({ message: 'Invitacion enviada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/send-verifications', canWrite, async (req, res) => {
    try {
        const includeInactive = Boolean(req.body?.includeInactive);
        const rows = await db.prepare(`
            SELECT Email, Nombre, Codigo
            FROM Usuarios
            WHERE Email IS NOT NULL AND Email != ''
            ${includeInactive ? '' : 'AND Activo = 1'}
        `).all();

        let sent = 0;
        for (const row of rows) {
            await EmailService.sendUserVerification({
                to: row.Email,
                name: row.Nombre,
                code: row.Codigo
            });
            sent += 1;
        }

        res.json({ sent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', canWrite, async (req, res) => {
    try {
        const updated = await UserModel.update(req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/active', canWrite, async (req, res) => {
    try {
        const updated = await UserModel.toggleActive(req.params.id, req.body?.is_active);
        if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

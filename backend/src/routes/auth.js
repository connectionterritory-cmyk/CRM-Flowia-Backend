const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');
const db = require('../config/database'); // Direct DB access for quick token update might be needed if not in AuthService

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const resolveAppBaseUrl = () => process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/login', async (req, res) => {
    const { codigo, password } = req.body;

    if (!codigo || !password) {
        return res.status(400).json({ error: 'Codigo y password son requeridos' });
    }

    try {
        const tableCheck = await db.prepare("SELECT to_regclass('public.usuarios') as name").get();
        if (!tableCheck?.name) {
            return res.status(500).json({ error: 'Base de datos no inicializada. Ejecuta las migraciones.' });
        }

        const result = await AuthService.login({
            codigo,
            password,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        if (!result) {
            return res.status(401).json({ error: 'Credenciales invalidas' });
        }

        return res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        const detail = process.env.NODE_ENV === 'development' ? error.message : undefined;
        return res.status(500).json({ error: 'Error al iniciar sesion', detail });
    }
});

router.post('/logout', auth, async (req, res) => {
    try {
        await AuthService.revokeSession(req.token);
        await AuthService.logAudit({
            usuarioId: req.user.UsuarioID,
            accion: 'LOGOUT',
            entidad: 'Usuarios',
            entidadId: req.user.UsuarioID,
            ip: req.ip,
        });
        return res.json({ message: 'Sesion cerrada' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al cerrar sesion' });
    }
});

router.get('/me', auth, (req, res) => {
    return res.json({ user: req.user });
});

router.post('/cambiar-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Password actual y nuevo requeridos' });
    }

    try {
        const user = await AuthService.getUserById(req.user.UsuarioID);
        const passwordHash = user.password_hash || user.Password;
        const isValid = passwordHash ? await bcrypt.compare(currentPassword, passwordHash) : false;
        if (!isValid) {
            return res.status(401).json({ error: 'Password actual incorrecto' });
        }

        await AuthService.updatePassword(req.user.UsuarioID, newPassword);
        await AuthService.logAudit({
            usuarioId: req.user.UsuarioID,
            accion: 'CAMBIAR_PASSWORD',
            entidad: 'Usuarios',
            entidadId: req.user.UsuarioID,
            ip: req.ip,
        });

        return res.json({ message: 'Password actualizado' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al cambiar password' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    try {
        // Find user by Email
        const stmt = db.prepare('SELECT UsuarioID, Nombre FROM Usuarios WHERE Email = ?');
        const user = await stmt.get(email);

        if (!user) {
            // Return success even if not found to prevent enumeration
            return res.json({ message: 'Si el email existe, se enviará un enlace.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 min

        const updateStmt = db.prepare(`
            UPDATE Usuarios
            SET reset_token_hash = ?,
                reset_expires_at = ?
            WHERE UsuarioID = ?
        `);
        await updateStmt.run(tokenHash, expiry, user.UsuarioID);

        const resetLink = `${resolveAppBaseUrl()}/reset-password?token=${token}`;

        await EmailService.sendPasswordReset(email, resetLink);

        return res.json({ message: 'Enlace enviado (Revisa tu consola backend por ahora)' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error procesando solicitud' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token y nuevo password requeridos' });
    }

    try {
        // Find user with valid token
        const tokenHash = hashToken(token);
        const stmt = db.prepare('SELECT UsuarioID FROM Usuarios WHERE reset_token_hash = ? AND reset_expires_at > ?');
        const user = await stmt.get(tokenHash, new Date().toISOString());

        if (!user) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        // Update Password and Clear Token
        // Reuse AuthService logic ideally, but direct for now
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateStmt = db.prepare(`
            UPDATE Usuarios
            SET password_hash = ?,
                Password = COALESCE(Password, ?),
                reset_token_hash = NULL,
                reset_expires_at = NULL,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE UsuarioID = ?
        `);
        await updateStmt.run(hashedPassword, hashedPassword, user.UsuarioID);

        return res.json({ message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error restableciendo contraseña' });
    }
});

router.post('/accept-invite', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token y nuevo password requeridos' });
    }

    try {
        const tokenHash = hashToken(token);
        const stmt = db.prepare('SELECT UsuarioID FROM Usuarios WHERE invite_token_hash = ? AND invite_expires_at > ?');
        const user = await stmt.get(tokenHash, new Date().toISOString());

        if (!user) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateStmt = db.prepare(`
            UPDATE Usuarios
            SET password_hash = ?,
                Password = COALESCE(Password, ?),
                invite_token_hash = NULL,
                invite_expires_at = NULL,
                is_active = 1,
                Activo = 1,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE UsuarioID = ?
        `);
        await updateStmt.run(hashedPassword, hashedPassword, user.UsuarioID);

        return res.json({ message: 'Cuenta activada. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error aceptando invitación' });
    }
});

module.exports = router;

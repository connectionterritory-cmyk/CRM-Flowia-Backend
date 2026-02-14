const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const AuthService = require('../services/AuthService');
const { getUsuarioByCodigo } = require('../services/SupabaseClient');
const EmailService = require('../services/EmailService');
const db = require('../config/database'); // Direct DB access for quick token update might be needed if not in AuthService

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const resolveAppBaseUrl = () => process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const deriveLoginErrorCode = (error) => {
    if (error?.code === 'SUPABASE_ENV_MISSING') return 'AUTH_LOGIN_500_ENV';
    if (error?.status) return `AUTH_LOGIN_500_SUPABASE_${error.status}`;
    return 'AUTH_LOGIN_500_SUPABASE';
};

const logLoginError = (code, error, context = {}) => {
    console.error(`[${code}] Login error`, {
        message: error?.message,
        errorCode: error?.code,
        detail: error?.detail || error?.details,
        status: error?.status,
        hint: error?.hint,
        stack: error?.stack,
        ...context,
    });
};
router.post('/login', async (req, res) => {
    const { codigo, password } = req.body;

    if (!codigo || !password) {
        return res.status(400).json({ error: 'Codigo y password son requeridos' });
    }

    let usuario;
    try {
        usuario = await getUsuarioByCodigo(codigo);
    } catch (error) {
        const code = deriveLoginErrorCode(error);
        logLoginError(code, error, { codigo, ip: req.ip, userAgent: req.get('user-agent') });
        return res.status(500).json({ error: 'Error al iniciar sesion', code: 'AUTH_LOGIN_500' });
    }

    if (!usuario) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const isActive = usuario.is_active === undefined || usuario.is_active === null
        ? true
        : Number(usuario.is_active) === 1;

    if (!isActive) {
        return res.status(403).json({ error: 'Usuario inactivo' });
    }

    if (!usuario.password_hash || typeof usuario.password_hash !== 'string') {
        return res.status(409).json({ error: 'Password no configurado', code: 'AUTH_LOGIN_PASSWORD_MISSING' });
    }

    let isValid = false;
    try {
        isValid = await bcrypt.compare(password, usuario.password_hash);
    } catch (error) {
        return res.status(409).json({ error: 'Password no configurado', code: 'AUTH_LOGIN_PASSWORD_MISSING' });
    }

    if (!isValid) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = AuthService.createToken({
        UsuarioID: usuario.codigo,
        Rol: usuario.rol,
        Codigo: usuario.codigo,
    });
    const expiresAt = AuthService.getTokenExpiry(token);

    return res.json({
        token,
        expiresAt,
        user: {
            codigo: usuario.codigo,
            rol: usuario.rol,
            role: usuario.rol,
            roles: usuario.rol ? [usuario.rol] : [],
        },
    });
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

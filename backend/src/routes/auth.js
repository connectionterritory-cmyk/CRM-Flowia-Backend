const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const AuthService = require('../services/AuthService');
const { getSupabaseClient, getUsuarioByCodigo } = require('../services/SupabaseClient');
const EmailService = require('../services/EmailService');

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

    // Handle both lowercase and legacy casing
    const isActiveVal = usuario.is_active !== undefined ? usuario.is_active : usuario.Activo;
    const isActive = isActiveVal === undefined || isActiveVal === null
        ? true
        : Number(isActiveVal) === 1 || isActiveVal === true;

    if (!isActive) {
        return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const passwordHash = usuario.password_hash || usuario.Password || usuario.password;

    if (!passwordHash || typeof passwordHash !== 'string') {
        return res.status(409).json({ error: 'Password no configurado', code: 'AUTH_LOGIN_PASSWORD_MISSING' });
    }

    let isValid = false;
    try {
        isValid = await bcrypt.compare(password, passwordHash);
    } catch (error) {
        return res.status(409).json({ error: 'Error validando password', code: 'AUTH_LOGIN_PASSWORD_ERROR' });
    }

    if (!isValid) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const userId = usuario.usuarioid || usuario.UsuarioID;
    if (!userId) {
        return res.status(500).json({ error: 'Usuario sin identificador' });
    }

    // Normalize user object for Token creation
    const normalizedUser = {
        UsuarioID: userId,
        Rol: usuario.rol || usuario.Rol,
        Codigo: usuario.codigo || usuario.Codigo,
    };

    const token = AuthService.createToken(normalizedUser);
    const expiresAt = AuthService.getTokenExpiry(token);

    try {
        await AuthService.createSession({
            userId,
            token,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            expiresAt,
        });
        await AuthService.updateLastAccess(userId);
        await AuthService.logAudit({
            usuarioId: userId,
            accion: 'LOGIN',
            entidad: 'Usuarios',
            entidadId: userId,
            ip: req.ip,
        });
    } catch (error) {
        console.error('Login session error:', error);
        return res.status(500).json({ error: 'Error al iniciar sesion' });
    }

    return res.json({
        token,
        expiresAt,
        user: {
            codigo: normalizedUser.Codigo,
            rol: normalizedUser.Rol,
            role: normalizedUser.Rol,
            roles: normalizedUser.Rol ? [normalizedUser.Rol] : [],
        },
    });
});

router.post('/logout', auth, async (req, res) => {
    try {
        await AuthService.revokeSession(req.token);
        // req.user might be undefined if auth middleware failed, but it shouldn't reach here.
        if (req.user) {
            await AuthService.logAudit({
                usuarioId: req.user.UsuarioID || req.user.userId, // JWT payload has userId
                accion: 'LOGOUT',
                entidad: 'Usuarios',
                entidadId: req.user.UsuarioID || req.user.userId,
                ip: req.ip,
            });
        }
        return res.json({ message: 'Sesion cerrada' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Error al cerrar sesion' });
    }
});

router.get('/me', auth, (req, res) => {
    return res.json({ user: req.user });
});

router.post('/cambiar-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.UsuarioID || req.user.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Password actual y nuevo requeridos' });
    }

    try {
        const user = await AuthService.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const passwordHash = user.password_hash || user.Password;
        const isValid = passwordHash ? await bcrypt.compare(currentPassword, passwordHash) : false;
        if (!isValid) {
            return res.status(401).json({ error: 'Password actual incorrecto' });
        }

        const realUserId = user.UsuarioID || user.usuarioid;
        await AuthService.updatePassword(realUserId, newPassword);
        await AuthService.logAudit({
            usuarioId: realUserId,
            accion: 'CAMBIAR_PASSWORD',
            entidad: 'Usuarios',
            entidadId: realUserId,
            ip: req.ip,
        });

        return res.json({ message: 'Password actualizado' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Error al cambiar password' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    try {
        const supabase = getSupabaseClient();
        const { data: user } = await supabase
            .from('usuarios')
            .select('usuarioid, nombre, UsuarioID, Nombre') // requesting both to be safe
            .eq('email', email)
            .maybeSingle();

        if (!user) {
            return res.json({ message: 'Si el email existe, se enviará un enlace.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 min
        const userId = user.UsuarioID || user.usuarioid;

        await supabase
            .from('usuarios')
            .update({
                reset_token_hash: tokenHash,
                reset_expires_at: expiry
            })
            .eq('usuarioid', userId);

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
        const tokenHash = hashToken(token);
        const supabase = getSupabaseClient();

        const { data: user } = await supabase
            .from('usuarios')
            .select('usuarioid, UsuarioID')
            .eq('reset_token_hash', tokenHash)
            .gt('reset_expires_at', new Date().toISOString())
            .maybeSingle();

        if (!user) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const userId = user.UsuarioID || user.usuarioid;

        await supabase
            .from('usuarios')
            .update({
                password_hash: hashedPassword,
                password: hashedPassword, // legacy
                reset_token_hash: null,
                reset_expires_at: null,
                updatedat: new Date().toISOString()
            })
            .eq('usuarioid', userId);

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
        const supabase = getSupabaseClient();

        const { data: user } = await supabase
            .from('usuarios')
            .select('usuarioid, UsuarioID')
            .eq('invite_token_hash', tokenHash)
            .gt('invite_expires_at', new Date().toISOString())
            .maybeSingle();

        if (!user) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const userId = user.UsuarioID || user.usuarioid;

        await supabase
            .from('usuarios')
            .update({
                password_hash: hashedPassword,
                password: hashedPassword,
                invite_token_hash: null,
                invite_expires_at: null,
                is_active: 1,
                activo: 1, // legacy
                updatedat: new Date().toISOString()
            })
            .eq('usuarioid', userId);

        return res.json({ message: 'Cuenta activada. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error aceptando invitación' });
    }
});

module.exports = router;

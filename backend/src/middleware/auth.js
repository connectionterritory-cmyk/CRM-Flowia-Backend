const jwt = require('jsonwebtoken');
const AuthService = require('../services/AuthService');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const session = await AuthService.getSessionByToken(token);

        if (!session) {
            return res.status(401).json({ error: 'Sesion no valida' });
        }

        if (session.ExpiresAt && new Date(session.ExpiresAt) < new Date()) {
            await AuthService.revokeSession(token);
            return res.status(401).json({ error: 'Sesion expirada' });
        }

        const user = await AuthService.getUserById(payload.userId);
        if (!user || !user.Activo) {
            return res.status(403).json({ error: 'Usuario inactivo' });
        }

        req.user = AuthService.sanitizeUser(user);
        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalido' });
    }
};

module.exports = auth;

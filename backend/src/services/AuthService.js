const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

const sanitizeUser = (user) => {
    if (!user) return null;
    const { Password, password_hash, reset_token_hash, invite_token_hash, ...safeUser } = user;
    return {
        ...safeUser,
        id: user.UsuarioID,
        name: user.Nombre,
        role: user.Rol,
        roles: [user.Rol],
        territory: user.Territorio || null,
    };
};

const getUserByCodigo = async (codigo) => db.prepare('SELECT * FROM Usuarios WHERE Codigo = ?').get(codigo);
const getUserByCodigoOrEmail = async (codigo) => db.prepare(
    'SELECT * FROM Usuarios WHERE Codigo = ? OR lower(Email) = ?'
).get(codigo, String(codigo || '').toLowerCase());
const getUserById = async (id) => db.prepare('SELECT * FROM Usuarios WHERE UsuarioID = ?').get(id);

const createToken = (user) => {
    return jwt.sign(
        { userId: user.UsuarioID, rol: user.Rol, codigo: user.Codigo },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
    );
};

const getTokenExpiry = (token) => {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000).toISOString();
};

const createSession = async ({ userId, token, ip, userAgent, expiresAt }) => {
    await db.prepare(`
        INSERT INTO Sesiones (UsuarioID, Token, IP, UserAgent, ExpiresAt)
        VALUES (?, ?, ?, ?, ?)
    `).run(userId, token, ip || null, userAgent || null, expiresAt);
};

const getSessionByToken = async (token) => {
    return db.prepare('SELECT * FROM Sesiones WHERE Token = ?').get(token);
};

const revokeSession = async (token) => {
    await db.prepare('DELETE FROM Sesiones WHERE Token = ?').run(token);
};

const updateLastAccess = async (userId) => {
    await db.prepare(`
        UPDATE Usuarios
        SET UltimoAcceso = CURRENT_TIMESTAMP,
            last_login_at = CURRENT_TIMESTAMP,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE UsuarioID = ?
    `).run(userId);
};

const updatePassword = async (userId, password) => {
    const hash = await bcrypt.hash(password, 10);
    await db.prepare(`
        UPDATE Usuarios
        SET password_hash = ?,
            Password = COALESCE(Password, ?),
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE UsuarioID = ?
    `).run(hash, hash, userId);
};

const logAudit = async ({ usuarioId, accion, entidad, entidadId, detalles, ip }) => {
    await db.prepare(`
        INSERT INTO AuditoriaAcciones (UsuarioID, Accion, Entidad, EntidadID, DetallesJSON, IP)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(usuarioId, accion, entidad || null, entidadId || null, detalles ? JSON.stringify(detalles) : null, ip || null);
};

const login = async ({ codigo, password, ip, userAgent }) => {
    const user = (await getUserByCodigoOrEmail(codigo)) || (await getUserByCodigo(codigo));
    const isActive = user.is_active === undefined || user.is_active === null
        ? user.Activo
        : user.is_active;
    if (!user || !isActive) return null;

    const passwordHash = user.password_hash || user.Password;
    if (!passwordHash) return null;

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) return null;

    const token = createToken(user);
    const expiresAt = getTokenExpiry(token);

    await createSession({
        userId: user.UsuarioID,
        token,
        ip,
        userAgent,
        expiresAt
    });

    await updateLastAccess(user.UsuarioID);
    await logAudit({ usuarioId: user.UsuarioID, accion: 'LOGIN', entidad: 'Usuarios', entidadId: user.UsuarioID, ip });

    return {
        token,
        expiresAt,
        user: sanitizeUser(user)
    };
};

module.exports = {
    sanitizeUser,
    getUserByCodigo,
    getUserByCodigoOrEmail,
    getUserById,
    createToken,
    getTokenExpiry,
    createSession,
    getSessionByToken,
    revokeSession,
    updateLastAccess,
    updatePassword,
    logAudit,
    login,
};

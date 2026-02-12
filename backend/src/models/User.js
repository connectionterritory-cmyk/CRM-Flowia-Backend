const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const mapRow = (row) => {
    if (!row) return null;
    return {
        id: row.UsuarioID,
        user_id: row.UserUUID,
        seller_code: row.Codigo,
        full_name: row.Nombre,
        email: row.Email,
        mobile: row.Telefono,
        address1: row.Address1,
        address2: row.Address2,
        city: row.Ciudad,
        state: row.Estado,
        zip: row.Zipcode,
        country: row.Pais,
        role: row.Rol,
        level: row.Nivel,
        start_date: row.FechaInicio,
        photo_url: row.FotoUrl,
        is_active: row.is_active === undefined || row.is_active === null ? row.Activo : row.is_active,
        last_login_at: row.last_login_at || row.UltimoAcceso || null,
        created_at: row.CreatedAt,
        updated_at: row.UpdatedAt
    };
};

const getById = async (id) => {
    if (!id) return null;
    const isNumeric = String(id).match(/^\d+$/);
    const row = isNumeric
        ? await db.prepare('SELECT * FROM Usuarios WHERE UsuarioID = ?').get(id)
        : await db.prepare('SELECT * FROM Usuarios WHERE UserUUID = ?').get(id);
    return mapRow(row);
};

const getAll = async ({ q, role, active } = {}) => {
    const where = [];
    const params = [];

    if (active !== undefined && active !== null && active !== '') {
        where.push('Activo = ?');
        params.push(Number(active) ? 1 : 0);
    }

    if (role) {
        where.push('Rol = ?');
        params.push(role);
    }

    if (q) {
        const term = `%${q}%`;
        where.push('(Nombre LIKE ? OR Codigo LIKE ? OR Email LIKE ? OR Telefono LIKE ?)');
        params.push(term, term, term, term);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.prepare(`
        SELECT * FROM Usuarios
        ${whereClause}
        ORDER BY Nombre ASC
    `).all(...params);

    return rows.map(mapRow);
};

const create = async (payload) => {
    const userId = payload.user_id || uuidv4();
    const role = payload.role;
    const rawSellerCode = typeof payload.seller_code === 'string' ? payload.seller_code.trim() : payload.seller_code;
    const sellerCode = rawSellerCode || (role === 'TELEMARKETING' ? `TM-${uuidv4().slice(0, 8).toUpperCase()}` : rawSellerCode);
    const fullName = payload.full_name;
    const email = payload.email || null;
    const mobile = payload.mobile || null;
    const address1 = payload.address1 || null;
    const address2 = payload.address2 || null;
    const city = payload.city || null;
    const state = payload.state || null;
    const zip = payload.zip || null;
    const country = payload.country || 'USA';
    const level = payload.level || null;
    const startDate = payload.start_date || null;
    const photoUrl = payload.photo_url || null;
    const isActive = payload.is_active === undefined ? 1 : Number(payload.is_active) ? 1 : 0;

    if ((!sellerCode && role !== 'TELEMARKETING') || !fullName || !mobile || !role) {
        return { error: 'Campos requeridos incompletos' };
    }

    const existing = await db.prepare('SELECT UsuarioID FROM Usuarios WHERE Codigo = ? OR (Email IS NOT NULL AND Email = ?)')
        .get(sellerCode, email);
    if (existing) {
        return { error: 'Codigo o Email ya existe', status: 409 };
    }

    const passwordRaw = payload.password || null;
    const generatedPassword = passwordRaw ? null : crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordRaw || generatedPassword, 10);

    const isActiveFinal = passwordRaw ? isActive : 0;

    const info = await db.prepare(`
        INSERT INTO Usuarios (
            UserUUID,
            Codigo,
            Nombre,
            Email,
            Password,
            password_hash,
            Rol,
            Nivel,
            Telefono,
            Address1,
            Address2,
            Ciudad,
            Estado,
            Zipcode,
            Pais,
            FechaInicio,
            FotoUrl,
            Activo,
            is_active,
            CreatedAt,
            UpdatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING UsuarioID AS "lastInsertRowid"
    `).run(
        userId,
        sellerCode,
        fullName,
        email,
        passwordHash,
        passwordHash,
        role,
        level,
        mobile,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        startDate,
        photoUrl,
        isActiveFinal,
        isActiveFinal
    );

    const created = await getById(info.lastInsertRowid);
    return { ...created };
};

const update = async (id, payload) => {
    const existing = await getById(id);
    if (!existing) return null;

    const incomingSellerCode = typeof payload.seller_code === 'string' ? payload.seller_code.trim() : payload.seller_code;
    const sellerCode = incomingSellerCode || existing.seller_code;
    const fullName = payload.full_name || existing.full_name;
    const role = payload.role || existing.role;
    const email = payload.email === undefined ? existing.email : payload.email;
    const mobile = payload.mobile === undefined ? existing.mobile : payload.mobile;
    const address1 = payload.address1 === undefined ? existing.address1 : payload.address1;
    const address2 = payload.address2 === undefined ? existing.address2 : payload.address2;
    const city = payload.city === undefined ? existing.city : payload.city;
    const state = payload.state === undefined ? existing.state : payload.state;
    const zip = payload.zip === undefined ? existing.zip : payload.zip;
    const country = payload.country === undefined ? existing.country : payload.country;
    const level = payload.level === undefined ? existing.level : payload.level;
    const startDate = payload.start_date === undefined ? existing.start_date : payload.start_date;
    const photoUrl = payload.photo_url === undefined ? existing.photo_url : payload.photo_url;
    const isActive = payload.is_active === undefined ? existing.is_active : (Number(payload.is_active) ? 1 : 0);

    await db.prepare(`
        UPDATE Usuarios
        SET Codigo = ?,
            Nombre = ?,
            Email = ?,
            Rol = ?,
            Nivel = ?,
            Telefono = ?,
            Address1 = ?,
            Address2 = ?,
            Ciudad = ?,
            Estado = ?,
            Zipcode = ?,
            Pais = ?,
            FechaInicio = ?,
            FotoUrl = ?,
            Activo = ?,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE UsuarioID = ?
    `).run(
        sellerCode,
        fullName,
        email,
        role,
        level,
        mobile,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        startDate,
        photoUrl,
        isActive,
        existing.id
    );

    return getById(existing.id);
};

const toggleActive = async (id, isActive) => {
    const existing = await getById(id);
    if (!existing) return null;
    await db.prepare('UPDATE Usuarios SET Activo = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE UsuarioID = ?')
        .run(Number(isActive) ? 1 : 0, existing.id);
    return getById(existing.id);
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    toggleActive
};

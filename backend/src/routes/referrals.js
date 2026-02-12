const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { buildContactoInsert } = require('../utils/contactos');

router.use(auth);

const normalizeValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

const resolveOwner = (body) => {
    if (body.owner_contacto_id || body.ownerContactoId) {
        return { ownerContactoId: body.owner_contacto_id || body.ownerContactoId, ownerClienteId: null };
    }
    if (body.owner_cliente_id || body.ownerClienteId) {
        return { ownerContactoId: null, ownerClienteId: body.owner_cliente_id || body.ownerClienteId };
    }

    const ownerType = normalizeValue(body.owner_person_type || body.ownerPersonType);
    const ownerId = body.owner_person_id || body.ownerPersonId;

    if (ownerType && ownerId) {
        if (ownerType.toUpperCase() === 'CONTACTO') {
            return { ownerContactoId: ownerId, ownerClienteId: null };
        }
        if (ownerType.toUpperCase() === 'CLIENTE') {
            return { ownerContactoId: null, ownerClienteId: ownerId };
        }
    }

    return { ownerContactoId: null, ownerClienteId: null };
};

const ensureContactoReferido = async (nombre, telefono, ciudad, assignedUserId) => {
    if (!nombre || !telefono) return null;

    const existing = await db.prepare('SELECT ContactoID FROM Contactos WHERE Telefono = ?').get(telefono);
    if (existing) return existing.ContactoID;

    const ciudadValue = ciudad || 'NO_DICE';
    const assignedValue = assignedUserId || 1;
    const insertValues = {
        full_name: nombre,
        mobile_phone: telefono,
        address1: null,
        address2: null,
        city: ciudadValue,
        state: 'NO_DICE',
        zip_code: null,
        country: 'USA',
        origin_type: 'REFERIDO',
        source: 'REFERIDO',
        source_name: null,
        referred_by_type: 'NO_DICE',
        referred_by_id: 0,
        relationship_to_referrer: 'NO_DICE',
        assigned_to_user_id: assignedValue,
        marital_status: 'NO_DICE',
        home_ownership: 'NO_DICE',
        both_work: 'NO_DICE',
        has_children: 0,
        children_count: null,
        knows_royal_prestige: 'NO_DICE',
        contact_status: 'NUEVO',
        contact_allowed: 1,
        notes: null,
        NombreCompleto: nombre,
        Telefono: telefono,
        Ciudad: ciudadValue,
    };

    const insertStatement = await buildContactoInsert(db, insertValues);
    const result = await db.prepare(insertStatement.sql).run(...insertStatement.values);
    return result.lastInsertRowid;
};

// POST /api/referrals
router.post('/', async (req, res) => {
    try {
        const nombre = normalizeValue(req.body.nombre);
        const telefono = normalizeValue(req.body.telefono);
        const ciudad = normalizeValue(req.body.ciudad);
        const tipo = normalizeValue(req.body.tipo) || 'simple';
        const oportunidadId = normalizeValue(req.body.opportunity_id || req.body.opportunityId);
        const estado = normalizeValue(req.body.status) || 'nuevo';
        const notas = normalizeValue(req.body.nota || req.body.notas);

        if (!nombre) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }
        if (!telefono) {
            return res.status(400).json({ error: 'Telefono es requerido' });
        }
        if (!['simple', '20_y_gana', '4_en_14'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo invalido' });
        }

        const { ownerContactoId, ownerClienteId } = resolveOwner(req.body);
        if (!ownerContactoId && !ownerClienteId) {
            return res.status(400).json({ error: 'Owner requerido' });
        }

        const contactoReferidoId = await ensureContactoReferido(nombre, telefono, ciudad, req.user?.UsuarioID);

        const info = await db.prepare(`
            INSERT INTO Referidos (
                OwnerContactoID,
                OwnerClienteID,
                ContactoReferidoID,
                Nombre,
                Telefono,
                Ciudad,
                Tipo,
                OportunidadID,
                Estado,
                Notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ReferidoID AS "lastInsertRowid"
        `).run(
            ownerContactoId || null,
            ownerClienteId || null,
            contactoReferidoId || null,
            nombre,
            telefono,
            ciudad || null,
            tipo,
            oportunidadId || null,
            estado || null,
            notas || null
        );

        res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
        console.error('Error al crear referido:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/referrals?owner_person_id=&owner_person_type=
router.get('/', async (req, res) => {
    try {
        const ownerId = req.query.owner_person_id || req.query.ownerPersonId;
        const ownerType = normalizeValue(req.query.owner_person_type || req.query.ownerPersonType);

        let where = '1=1';
        const params = [];

        if (ownerId && ownerType) {
            if (ownerType.toUpperCase() === 'CONTACTO') {
                where += ' AND OwnerContactoID = ?';
                params.push(ownerId);
            } else if (ownerType.toUpperCase() === 'CLIENTE') {
                where += ' AND OwnerClienteID = ?';
                params.push(ownerId);
            }
        }

        const referrals = await db.prepare(`
            SELECT * FROM Referidos
            WHERE ${where}
            ORDER BY CreatedAt DESC
        `).all(...params);

        res.json(referrals || []);
    } catch (error) {
        console.error('Error al listar referidos:', error);
        res.json([]);
    }
});

module.exports = router;

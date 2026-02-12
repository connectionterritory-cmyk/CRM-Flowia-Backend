const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { buildContactoInsert, buildContactoUpdate } = require('../utils/contactos');

router.use(auth);

const normalizeValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

const normalizeEnum = (value, allowed, fallback = null) => {
    const normalized = normalizeValue(value);
    if (!normalized) return fallback;
    const upper = String(normalized).toUpperCase();
    return allowed.includes(upper) ? upper : fallback;
};

    const normalizeBoolean = (value, fallback = null) => {
        if (value === undefined || value === null) return fallback;
        if (typeof value === 'boolean') return value ? 1 : 0;
        if (typeof value === 'number') return value ? 1 : 0;
        const normalized = String(value).trim().toLowerCase();
        if (['true', '1', 'si', 'sí', 'yes'].includes(normalized)) return 1;
        if (['false', '0', 'no'].includes(normalized)) return 0;
        return fallback;
    };

const normalizePhone = (value) => {
    if (!value) return '';
    return String(value).replace(/\D/g, '');
};

const MARITAL_OPTIONS = ['SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'NO_DICE'];
const HOME_OWNERSHIP_OPTIONS = ['DUEÑO', 'RENTA', 'NO_DICE'];
const BOTH_WORK_OPTIONS = ['TRABAJA_1', 'TRABAJAN_2', 'NO_DICE'];
const KNOWS_RP_OPTIONS = ['SI', 'NO', 'HA_ESCUCHADO'];
const CONTACT_STATUS_OPTIONS = ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'CITA_AGENDADA', 'NO_INTERESA', 'NO_MOLESTAR'];
const REFERRED_TYPE_OPTIONS = ['CONTACTO', 'CLIENTE', 'USUARIO', 'NO_DICE'];

const buildContactosConstraintError = (error) => {
    if (!error || !error.message) return null;
    const message = error.message;

    if (message.includes('NOT NULL constraint failed: Contactos.full_name')
        || message.includes('null value in column "full_name"')) {
        return 'Nombre completo es requerido';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.mobile_phone')
        || message.includes('null value in column "mobile_phone"')) {
        return 'Celular es requerido';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.city')
        || message.includes('null value in column "city"')) {
        return 'Ciudad es requerida';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.state')
        || message.includes('null value in column "state"')) {
        return 'Estado es requerido';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.origin_type')
        || message.includes('null value in column "origin_type"')) {
        return 'Origen es requerido';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.referred_by_type')
        || message.includes('null value in column "referred_by_type"')) {
        return 'Tipo de referido es requerido';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.relationship_to_referrer')
        || message.includes('null value in column "relationship_to_referrer"')) {
        return 'Relacion con referido es requerida';
    }
    if (message.includes('NOT NULL constraint failed: Contactos.assigned_to_user_id')
        || message.includes('null value in column "assigned_to_user_id"')) {
        return 'Asignacion es requerida';
    }

    return null;
};

// GET contactos search (minimal fields)
router.get('/search', async (req, res) => {
    try {
        const term = String(req.query.q || '').trim();
        if (!term) return res.json([]);

        const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 15;
        const like = `%${term}%`;
        const contactos = await db.prepare(`
            SELECT
                ContactoID as id,
                COALESCE(full_name, NombreCompleto) as fullName,
                COALESCE(mobile_phone, Telefono) as mobilePhone,
                Email as email,
                COALESCE(address1, Direccion) as address1,
                address2 as address2,
                COALESCE(city, Ciudad) as city,
                COALESCE(state, Estado) as state,
                COALESCE(zip_code, Zipcode) as zip,
                COALESCE(country, Pais) as country,
                COALESCE(origin_type, OrigenFuente) as leadSource,
                COALESCE(referred_by_id, ReferidoPorId) as referredById,
                assigned_to_user_id as ownerUserId
            FROM Contactos
            WHERE
                full_name LIKE ? OR NombreCompleto LIKE ?
                OR mobile_phone LIKE ? OR Telefono LIKE ?
                OR Email LIKE ?
            ORDER BY UpdatedAt DESC
            LIMIT ?
        `).all(like, like, like, like, like, limit);

        res.json(contactos || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET contactos duplicate check
router.get('/check-duplicate', async (req, res) => {
    try {
        const phoneRaw = String(req.query.phone || '').trim();
        const emailRaw = String(req.query.email || '').trim().toLowerCase();
        const phone = normalizePhone(phoneRaw);

        if (!phone && !emailRaw) {
            return res.json({ exists: false });
        }

        const phoneExpr = `replace(replace(replace(replace(replace(replace(coalesce(mobile_phone,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
        const phoneExprLegacy = `replace(replace(replace(replace(replace(replace(coalesce(Telefono,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;

        const contacto = await db.prepare(`
            SELECT
                ContactoID as id,
                COALESCE(full_name, NombreCompleto) as fullName,
                COALESCE(mobile_phone, Telefono) as mobilePhone,
                Email as email,
                COALESCE(city, Ciudad) as city,
                COALESCE(state, Estado) as state
            FROM Contactos
            WHERE
                (${emailRaw ? 'LOWER(Email) = ? OR' : ''}
                ${phone ? `${phoneExpr} = ? OR ${phoneExprLegacy} = ? OR mobile_phone = ? OR Telefono = ?` : '1=0'})
            LIMIT 1
        `).get(
            ...(emailRaw ? [emailRaw] : []),
            ...(phone ? [phone, phone, phoneRaw, phoneRaw] : [])
        );

        if (!contacto) {
            return res.json({ exists: false });
        }

        return res.json({ exists: true, contact: contacto });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET contactos
router.get('/', async (req, res) => {
    try {
        const { convertido, q } = req.query;
        let query = `
            SELECT c.*,
                u.Nombre as AssignedToNombre,
                COALESCE(rc.full_name, rcl.Nombre, ru.Nombre) as ReferidoPorNombre
            FROM Contactos c
            LEFT JOIN Usuarios u ON c.assigned_to_user_id = u.UsuarioID
            LEFT JOIN Contactos rc ON c.referred_by_type = 'CONTACTO' AND c.referred_by_id = rc.ContactoID
            LEFT JOIN Clientes rcl ON c.referred_by_type = 'CLIENTE' AND c.referred_by_id = rcl.ClienteID
            LEFT JOIN Usuarios ru ON c.referred_by_type = 'USUARIO' AND c.referred_by_id = ru.UsuarioID
        `;
        const params = [];

        if (convertido !== undefined) {
            query += ' WHERE c.Convertido = ?';
            params.push(convertido === 'true' ? 1 : 0);
        } else {
            query += ' WHERE c.Convertido = 0';
        }

        if (q) {
            query += ' AND (c.NombreCompleto LIKE ? OR c.Telefono LIKE ? OR c.Email LIKE ? OR c.full_name LIKE ?)';
            const term = `%${q}%`;
            params.push(term, term, term, term);
        }

        query += ' ORDER BY c.CreatedAt DESC';

        const contactos = await db.prepare(query).all(...params);
        res.json(contactos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET contacto by id
router.get('/:id', async (req, res) => {
    try {
        const contacto = await db.prepare(`
            SELECT c.*,
                u.Nombre as AssignedToNombre,
                COALESCE(rc.full_name, rcl.Nombre, ru.Nombre) as ReferidoPorNombre
            FROM Contactos c
            LEFT JOIN Usuarios u ON c.assigned_to_user_id = u.UsuarioID
            LEFT JOIN Contactos rc ON c.referred_by_type = 'CONTACTO' AND c.referred_by_id = rc.ContactoID
            LEFT JOIN Clientes rcl ON c.referred_by_type = 'CLIENTE' AND c.referred_by_id = rcl.ClienteID
            LEFT JOIN Usuarios ru ON c.referred_by_type = 'USUARIO' AND c.referred_by_id = ru.UsuarioID
            WHERE c.ContactoID = ?
        `).get(req.params.id);
        if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
        res.json(contacto);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST contacto
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const {
            full_name,
            mobile_phone,
            email,
            address1,
            address2,
            city,
            state,
            zip_code,
            country,
            origin_type,
            source,
            source_name,
            sourceName,
            custom_source,
            referred_by_type,
            referred_by_id,
            relationship_to_referrer,
            assigned_to_user_id,
            marital_status,
            spouse_name,
            home_ownership,
            both_work,
            has_children,
            children_count,
            knows_royal_prestige,
            contact_status,
            contact_allowed,
            notes,
            // Legacy fallbacks
            nombreCompleto,
            telefono,
            direccion,
            ciudad,
            estado,
            zipcode,
            pais,
            estadoCivil,
            origenFuente,
            referidoPorId,
            NombrePareja
        } = req.body;

        const fullNameValue = normalizeValue(full_name || nombreCompleto);
        const phoneValue = normalizeValue(mobile_phone || telefono);
        const cityValue = normalizeValue(city || ciudad) || 'NO_DICE';
        const stateValue = normalizeValue(state || estado) || 'NO_DICE';
        const originTypeValue = normalizeValue(origin_type || source || origenFuente) || 'Otros';
        const sourceValue = normalizeValue(source || origin_type || origenFuente) || originTypeValue;
        const sourceNameValue = normalizeValue(source_name || sourceName || custom_source);
        const relationshipValue = normalizeValue(relationship_to_referrer) || 'NO_DICE';
        const assignedUserIdValue = assigned_to_user_id || req.user?.UsuarioID;

        let referredByTypeValue = normalizeEnum(referred_by_type, REFERRED_TYPE_OPTIONS, null);
        const legacyReferredId = normalizeValue(referidoPorId);
        if (!referredByTypeValue && legacyReferredId) {
            referredByTypeValue = 'CONTACTO';
        }
        if (!referredByTypeValue) referredByTypeValue = 'NO_DICE';

        const referredByIdValue = Number(referred_by_id || legacyReferredId || 0);

        if (!fullNameValue) {
            return res.status(400).json({ error: 'Nombre completo es requerido' });
        }

        if (!phoneValue) {
            return res.status(400).json({ error: 'Celular es requerido' });
        }

        if (!assignedUserIdValue) {
            return res.status(400).json({ error: 'Asignacion es requerida' });
        }

        if (referredByTypeValue !== 'NO_DICE' && !referredByIdValue) {
            return res.status(400).json({ error: 'Referido por es requerido' });
        }

        const emailValue = normalizeValue(email);
        const address1Value = normalizeValue(address1 || direccion);
        const address2Value = normalizeValue(address2);
        const zipValue = normalizeValue(zip_code || zipcode);
        const countryValue = normalizeValue(country) || 'USA';
        const legacyCountryValue = normalizeValue(pais) || (countryValue === 'USA' ? 'Estados Unidos' : countryValue);

        const phoneNormalized = normalizePhone(phoneValue);
        if (phoneNormalized || emailValue) {
            const phoneExpr = `replace(replace(replace(replace(replace(replace(coalesce(mobile_phone,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
            const phoneExprLegacy = `replace(replace(replace(replace(replace(replace(coalesce(Telefono,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
            const duplicate = await db.prepare(`
                SELECT ContactoID
                FROM Contactos
                WHERE
                    (${emailValue ? 'LOWER(Email) = ? OR' : ''}
                    ${phoneNormalized ? `${phoneExpr} = ? OR ${phoneExprLegacy} = ? OR mobile_phone = ? OR Telefono = ?` : '1=0'})
                LIMIT 1
            `).get(
                ...(emailValue ? [emailValue.toLowerCase()] : []),
                ...(phoneNormalized ? [phoneNormalized, phoneNormalized, phoneValue, phoneValue] : [])
            );

            if (duplicate) {
                return res.status(409).json({ error: 'Contacto ya existe', contactId: duplicate.ContactoID });
            }
        }

        const maritalValue = normalizeEnum(marital_status || estadoCivil, MARITAL_OPTIONS, 'NO_DICE');
        const homeOwnershipValue = normalizeEnum(home_ownership, HOME_OWNERSHIP_OPTIONS, 'NO_DICE');
        const bothWorkValue = normalizeEnum(both_work, BOTH_WORK_OPTIONS, 'NO_DICE');
        const knowsRoyalValue = normalizeEnum(knows_royal_prestige, KNOWS_RP_OPTIONS, null);
        const statusValue = normalizeEnum(contact_status, CONTACT_STATUS_OPTIONS, 'NUEVO');
        const allowedValue = normalizeBoolean(contact_allowed, 1);
        const hasChildrenValue = normalizeBoolean(has_children, 0);
        const childrenCountValue = children_count !== undefined && children_count !== null && children_count !== ''
            ? Number(children_count)
            : null;
        const notesValue = normalizeValue(notes);
        const spouseNameValue = normalizeValue(spouse_name || NombrePareja);

        const insertValues = {
            full_name: fullNameValue,
            mobile_phone: phoneValue,
            address1: address1Value || null,
            address2: address2Value || null,
            city: cityValue,
            state: stateValue,
            zip_code: zipValue || null,
            country: countryValue,
            origin_type: originTypeValue,
            source: sourceValue,
            source_name: sourceNameValue || null,
            referred_by_type: referredByTypeValue,
            referred_by_id: referredByIdValue,
            relationship_to_referrer: relationshipValue,
            assigned_to_user_id: assignedUserIdValue,
            marital_status: maritalValue,
            home_ownership: homeOwnershipValue,
            both_work: bothWorkValue,
            has_children: hasChildrenValue,
            children_count: childrenCountValue,
            knows_royal_prestige: knowsRoyalValue,
            contact_status: statusValue,
            contact_allowed: allowedValue,
            notes: notesValue || null,
            NombrePareja: spouseNameValue || null,
            NombreCompleto: fullNameValue,
            Telefono: phoneValue,
            Email: emailValue || null,
            Direccion: address1Value || null,
            Ciudad: cityValue,
            Estado: stateValue,
            Zipcode: zipValue || null,
            Pais: legacyCountryValue,
            EstadoCivil: maritalValue || null,
            OrigenFuente: originTypeValue || null,
            ReferidoPorId: referredByTypeValue === 'CONTACTO' ? referredByIdValue : null,
        };

        const insertStatement = await buildContactoInsert(db, insertValues);
        const info = await db.prepare(insertStatement.sql).run(...insertStatement.values);

        res.status(201).json({ id: info.lastInsertRowid, message: 'Contacto creado' });
    } catch (err) {
        const constraintError = buildContactosConstraintError(err);
        if (constraintError) {
            return res.status(400).json({ error: constraintError });
        }
        res.status(500).json({ error: err.message });
    }
});

// PATCH contacto (partial update)
    router.patch('/:id', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
        try {
            const existing = await db.prepare('SELECT * FROM Contactos WHERE ContactoID = ?').get(req.params.id);
            if (!existing) return res.status(404).json({ error: 'Contacto no encontrado' });

            const fields = [];
            const values = [];
            const upsertField = (column, value) => {
                fields.push(`${column} = ?`);
                values.push(value);
            };

            const fullNameValue = normalizeValue(req.body.full_name || req.body.NombreCompleto);
            const phoneValue = normalizeValue(req.body.mobile_phone || req.body.Telefono);
            const emailValue = normalizeValue(req.body.email || req.body.Email);
            const address1Value = normalizeValue(req.body.address1 || req.body.Direccion);
            const address2Value = normalizeValue(req.body.address2);
            const cityValue = normalizeValue(req.body.city || req.body.Ciudad);
            const stateValue = normalizeValue(req.body.state || req.body.Estado);
            const zipValue = normalizeValue(req.body.zip_code || req.body.Zipcode);
            const countryValue = normalizeValue(req.body.country || req.body.Pais);

            const maritalValue = normalizeEnum(req.body.marital_status || req.body.EstadoCivil, MARITAL_OPTIONS, null);
            const homeOwnershipValue = normalizeEnum(req.body.home_ownership, HOME_OWNERSHIP_OPTIONS, null);
            const bothWorkValue = normalizeEnum(req.body.both_work || req.body.TrabajaActualmente, BOTH_WORK_OPTIONS, null);
            const knowsRoyalValue = normalizeEnum(req.body.knows_royal_prestige, KNOWS_RP_OPTIONS, null);
            const statusValue = normalizeEnum(req.body.contact_status, CONTACT_STATUS_OPTIONS, null);
            const allowedValue = normalizeBoolean(req.body.contact_allowed, null);
            const hasChildrenValue = normalizeBoolean(req.body.has_children, null);
            const childrenCountValue = req.body.children_count !== undefined && req.body.children_count !== null && req.body.children_count !== ''
                ? Number(req.body.children_count)
                : req.body.children_count === '' ? null : undefined;
            const notesValue = normalizeValue(req.body.notes);
            const spouseNameValue = normalizeValue(req.body.spouse_name || req.body.NombrePareja);
            const relationshipValue = normalizeValue(req.body.relationship_to_referrer);
            const originTypeValue = normalizeValue(req.body.origin_type || req.body.OrigenFuente || req.body.source);
            const sourceValue = normalizeValue(req.body.source || req.body.origin_type || req.body.OrigenFuente);
            const sourceNameValue = normalizeValue(req.body.source_name || req.body.sourceName || req.body.custom_source);
            const referredByTypeValue = normalizeEnum(req.body.referred_by_type, REFERRED_TYPE_OPTIONS, null);
            const referredByIdValue = req.body.referred_by_id !== undefined && req.body.referred_by_id !== null
                ? Number(req.body.referred_by_id)
                : null;
            const assignedUserIdValue = req.body.assigned_to_user_id !== undefined && req.body.assigned_to_user_id !== null
                ? Number(req.body.assigned_to_user_id)
                : null;

            if (fullNameValue !== null) {
                upsertField('full_name', fullNameValue);
                upsertField('NombreCompleto', fullNameValue);
            }
            if (phoneValue !== null) {
                upsertField('mobile_phone', phoneValue);
                upsertField('Telefono', phoneValue);
            }
            if (emailValue !== null) {
                upsertField('Email', emailValue);
            }
            if (address1Value !== null) {
                upsertField('address1', address1Value);
                upsertField('Direccion', address1Value);
            }
            if (address2Value !== null) {
                upsertField('address2', address2Value);
            }
            if (cityValue !== null) {
                upsertField('city', cityValue);
                upsertField('Ciudad', cityValue);
            }
            if (stateValue !== null) {
                upsertField('state', stateValue);
                upsertField('Estado', stateValue);
            }
            if (zipValue !== null) {
                upsertField('zip_code', zipValue);
                upsertField('Zipcode', zipValue);
            }
            if (countryValue !== null) {
                upsertField('country', countryValue);
                upsertField('Pais', countryValue);
            }
            if (maritalValue !== null) {
                upsertField('marital_status', maritalValue);
                upsertField('EstadoCivil', maritalValue);
            }
            if (homeOwnershipValue !== null) {
                upsertField('home_ownership', homeOwnershipValue);
            }
            if (bothWorkValue !== null) {
                upsertField('both_work', bothWorkValue);
                upsertField('TrabajaActualmente', bothWorkValue);
            }
            if (knowsRoyalValue !== null) {
                upsertField('knows_royal_prestige', knowsRoyalValue);
            }
            if (statusValue !== null) {
                upsertField('contact_status', statusValue);
            }
            if (allowedValue !== null) {
                upsertField('contact_allowed', allowedValue);
            }
            if (hasChildrenValue !== null) {
                upsertField('has_children', hasChildrenValue);
            }
            if (childrenCountValue !== undefined) {
                upsertField('children_count', childrenCountValue);
            }
            if (notesValue !== null) {
                upsertField('notes', notesValue);
            }
            if (spouseNameValue !== null) {
                upsertField('NombrePareja', spouseNameValue);
            }
            if (relationshipValue !== null) {
                upsertField('relationship_to_referrer', relationshipValue);
            }
            if (originTypeValue !== null) {
                upsertField('origin_type', originTypeValue);
                upsertField('OrigenFuente', originTypeValue);
            }
            if (sourceValue !== null) {
                upsertField('source', sourceValue);
            }
            if (sourceNameValue !== null) {
                upsertField('source_name', sourceNameValue);
            }
            if (referredByTypeValue !== null) {
                upsertField('referred_by_type', referredByTypeValue);
            }
            if (referredByIdValue !== null) {
                upsertField('referred_by_id', referredByIdValue);
                if (referredByTypeValue === 'CONTACTO') {
                    upsertField('ReferidoPorId', referredByIdValue);
                }
            }
            if (assignedUserIdValue !== null) {
                upsertField('assigned_to_user_id', assignedUserIdValue);
            }

            if (fields.length === 0) {
                return res.json({ message: 'Sin cambios' });
            }

        const sql = `UPDATE Contactos SET ${fields.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP WHERE ContactoID = ?`;
        await db.prepare(sql).run(...values, req.params.id);
        const updated = await db.prepare('SELECT * FROM Contactos WHERE ContactoID = ?').get(req.params.id);
        return res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT contacto
router.put('/:id', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const {
            full_name,
            mobile_phone,
            email,
            address1,
            address2,
            city,
            state,
            zip_code,
            country,
            origin_type,
            source,
            source_name,
            sourceName,
            custom_source,
            referred_by_type,
            referred_by_id,
            relationship_to_referrer,
            assigned_to_user_id,
            marital_status,
            spouse_name,
            home_ownership,
            both_work,
            has_children,
            children_count,
            knows_royal_prestige,
            contact_status,
            contact_allowed,
            notes,
            convertido,
            clienteId,
            // Legacy fallbacks
            nombreCompleto,
            telefono,
            direccion,
            ciudad,
            estado,
            zipcode,
            pais,
            estadoCivil,
            origenFuente,
            referidoPorId,
            NombrePareja
        } = req.body;

        const fullNameValue = normalizeValue(full_name || nombreCompleto);
        const phoneValue = normalizeValue(mobile_phone || telefono);
        const cityValue = normalizeValue(city || ciudad);
        const stateValue = normalizeValue(state || estado);
        const originTypeValue = normalizeValue(origin_type || source || origenFuente) || 'Otros';
        const sourceValue = normalizeValue(source || origin_type || origenFuente) || originTypeValue;
        const sourceNameValue = normalizeValue(source_name || sourceName || custom_source);
        const relationshipValue = normalizeValue(relationship_to_referrer) || 'NO_DICE';
        const assignedUserIdValue = assigned_to_user_id || req.user?.UsuarioID;

        let referredByTypeValue = normalizeEnum(referred_by_type, REFERRED_TYPE_OPTIONS, null);
        const legacyReferredId = normalizeValue(referidoPorId);
        if (!referredByTypeValue && legacyReferredId) {
            referredByTypeValue = 'CONTACTO';
        }
        if (!referredByTypeValue) referredByTypeValue = 'NO_DICE';
        const referredByIdValue = Number(referred_by_id || legacyReferredId || 0);

        if (!fullNameValue) {
            return res.status(400).json({ error: 'Nombre completo es requerido' });
        }

        if (!phoneValue) {
            return res.status(400).json({ error: 'Celular es requerido' });
        }

        if (!cityValue) {
            return res.status(400).json({ error: 'Ciudad es requerida' });
        }

        if (!stateValue) {
            return res.status(400).json({ error: 'Estado es requerido' });
        }

        if (!relationshipValue) {
            return res.status(400).json({ error: 'Relacion con referido es requerida' });
        }

        if (!assignedUserIdValue) {
            return res.status(400).json({ error: 'Asignacion es requerida' });
        }

        if (referredByTypeValue !== 'NO_DICE' && !referredByIdValue) {
            return res.status(400).json({ error: 'Referido por es requerido' });
        }

        const emailValue = normalizeValue(email);
        const address1Value = normalizeValue(address1 || direccion);
        const address2Value = normalizeValue(address2);
        const zipValue = normalizeValue(zip_code || zipcode);
        const countryValue = normalizeValue(country) || 'USA';
        const legacyCountryValue = normalizeValue(pais) || (countryValue === 'USA' ? 'Estados Unidos' : countryValue);
        const maritalValue = normalizeEnum(marital_status || estadoCivil, MARITAL_OPTIONS, 'NO_DICE');
        const homeOwnershipValue = normalizeEnum(home_ownership, HOME_OWNERSHIP_OPTIONS, 'NO_DICE');
        const bothWorkValue = normalizeEnum(both_work, BOTH_WORK_OPTIONS, 'NO_DICE');
        const knowsRoyalValue = normalizeEnum(knows_royal_prestige, KNOWS_RP_OPTIONS, null);
        const statusValue = normalizeEnum(contact_status, CONTACT_STATUS_OPTIONS, 'NUEVO');
        const allowedValue = normalizeBoolean(contact_allowed, 1);
        const hasChildrenValue = normalizeBoolean(has_children, 0);
        const childrenCountValue = children_count !== undefined && children_count !== null && children_count !== ''
            ? Number(children_count)
            : null;
        const notesValue = normalizeValue(notes);
        const spouseNameValue = normalizeValue(spouse_name || NombrePareja);

        const updateValues = {
            full_name: fullNameValue,
            mobile_phone: phoneValue,
            address1: address1Value || null,
            address2: address2Value || null,
            city: cityValue,
            state: stateValue,
            zip_code: zipValue || null,
            country: countryValue,
            origin_type: originTypeValue,
            source: sourceValue,
            source_name: sourceNameValue || null,
            referred_by_type: referredByTypeValue,
            referred_by_id: referredByIdValue,
            relationship_to_referrer: relationshipValue,
            assigned_to_user_id: assignedUserIdValue,
            marital_status: maritalValue,
            home_ownership: homeOwnershipValue,
            both_work: bothWorkValue,
            has_children: hasChildrenValue,
            children_count: childrenCountValue,
            knows_royal_prestige: knowsRoyalValue,
            contact_status: statusValue,
            contact_allowed: allowedValue,
            notes: notesValue || null,
            NombrePareja: spouseNameValue || null,
            NombreCompleto: fullNameValue,
            Telefono: phoneValue,
            Email: emailValue || null,
            Direccion: address1Value || null,
            Ciudad: cityValue,
            Estado: stateValue,
            Zipcode: zipValue || null,
            Pais: legacyCountryValue,
            EstadoCivil: maritalValue || null,
            OrigenFuente: originTypeValue || null,
            ReferidoPorId: referredByTypeValue === 'CONTACTO' ? referredByIdValue : null,
            Convertido: convertido ? 1 : 0,
            ClienteID: clienteId || null,
        };

        const updateStatement = await buildContactoUpdate(db, updateValues);
        await db.prepare(updateStatement.sql).run(...updateStatement.values, req.params.id);

        res.json({ message: 'Contacto actualizado' });
    } catch (err) {
        const constraintError = buildContactosConstraintError(err);
        if (constraintError) {
            return res.status(400).json({ error: constraintError });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE contacto (admin only)
router.delete('/:id', checkRole('DISTRIBUIDOR'), async (req, res) => {
    try {
        const existing = await db.prepare('SELECT ContactoID FROM Contactos WHERE ContactoID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Contacto no encontrado' });

        await db.prepare('DELETE FROM Contactos WHERE ContactoID = ?').run(req.params.id);
        res.json({ message: 'Contacto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

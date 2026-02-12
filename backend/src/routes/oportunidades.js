const express = require('express');
const router = express.Router();
const Oportunidad = require('../models/Oportunidad');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { buildContactoInsert } = require('../utils/contactos');

router.use(auth);

const TELEMARKETING_ETAPAS = [
    'NUEVO_LEAD',
    'INTENTO_CONTACTO',
    'CONTACTADO',
    'CALIFICACION'
];
const ESTADOS_CIERRE = ['Activo', 'Seguimiento', 'No interesado'];

const isDistribuidor = (req) => req.user?.Rol === 'DISTRIBUIDOR';
const isTelemarketing = (req) => req.user?.Rol === 'TELEMARKETING';

const getTelemarketingOwnerIds = async (req) => {
    if (!isTelemarketing(req)) return [];
    const table = await db.prepare("SELECT to_regclass('public.telemarketingasignaciones') as name").get();
    if (!table?.name) return [];
    const rows = await db.prepare(`
        SELECT SellerUserID
        FROM TelemarketingAsignaciones
        WHERE TelemarketingUserID = ?
    `).all(req.user?.UsuarioID);
    return (rows || []).map((row) => row.SellerUserID);
};

const ensureOwnerAccess = async (req, oportunidad) => {
    if (isDistribuidor(req)) return true;
    if (isTelemarketing(req)) {
        const assigned = await getTelemarketingOwnerIds(req);
        return assigned.includes(oportunidad?.OwnerUserID);
    }
    return oportunidad?.OwnerUserID === req.user?.UsuarioID;
};

const normalizeValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

const normalizePhone = (value) => {
    if (!value) return '';
    return String(value).replace(/\D/g, '');
};

const mapOriginTypeToNombre = (value) => {
    const upper = String(value || '').toUpperCase();
    const mapping = {
        REFERIDO: 'Referido',
        MARKETING: 'Marketing',
        PROSPECCION: 'Puerta a Puerta',
        EVENTO: 'Evento',
        PROGRAMA: 'Programa',
        OTRO: 'Otro',
        NO_DICE: null
    };
    return mapping[upper] || value || null;
};

const resolveOrigenId = async (origenId, origenNombre) => {
    if (origenId) return origenId;
    const nameValue = normalizeValue(origenNombre);
    if (!nameValue) return null;
    const existing = await db.prepare('SELECT OrigenID FROM Origenes WHERE Nombre = ?').get(nameValue);
    if (existing) return existing.OrigenID;
    const created = await db.prepare('INSERT INTO Origenes (Nombre) VALUES (?) RETURNING OrigenID AS "lastInsertRowid"').run(nameValue);
    return created.lastInsertRowid;
};

const resolveReferidoNombre = async (referidoByType, referidoById) => {
    if (!referidoById || !referidoByType) return null;
    if (referidoByType === 'CONTACTO') {
        const contacto = await db.prepare('SELECT NombreCompleto FROM Contactos WHERE ContactoID = ?').get(referidoById);
        return contacto?.NombreCompleto || null;
    }
    if (referidoByType === 'CLIENTE') {
        const cliente = await db.prepare('SELECT Nombre FROM Clientes WHERE ClienteID = ?').get(referidoById);
        return cliente?.Nombre || null;
    }
    return null;
};

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

// GET /api/oportunidades
router.get('/', async (req, res) => {
    try {
        const filters = {
            etapa: req.query.etapa,
            ownerUserId: req.query.ownerUserId,
            origenId: req.query.origenId,
            productoInteres: req.query.productoInteres,
            excludeEtapas: req.query.excludeEtapas ? req.query.excludeEtapas.split(',') : null,
            estadoCierre: req.query.estadoCierre
        };

        if (isTelemarketing(req)) {
            const assigned = await getTelemarketingOwnerIds(req);
            if (assigned.length === 0) {
                return res.json([]);
            }
            filters.ownerUserIds = assigned;
        } else if (!isDistribuidor(req)) {
            filters.ownerUserId = req.user.UsuarioID;
        }

        if (isTelemarketing(req)) {
            const exclude = new Set(filters.excludeEtapas || []);
            ['CITA_AGENDADA', 'DEMO_REALIZADA', 'PROPUESTA', 'SEGUIMIENTO', 'CIERRE_GANADO', 'CIERRE_PERDIDO']
                .forEach((etapa) => exclude.add(etapa));
            filters.excludeEtapas = Array.from(exclude);
        }

        const oportunidades = await Oportunidad.getAll(filters);
        res.json(oportunidades);
    } catch (error) {
        console.error('Error al obtener oportunidades:', error);
        res.status(500).json({ error: 'Error al obtener oportunidades' });
    }
});

// GET /api/oportunidades/owners
router.get('/owners', async (req, res) => {
    try {
        let owners = [];
        if (isTelemarketing(req)) {
            owners = await db.prepare(`
                SELECT u.UsuarioID as id, u.Nombre as nombre
                FROM TelemarketingAsignaciones ta
                JOIN Usuarios u ON u.UsuarioID = ta.SellerUserID
                WHERE ta.TelemarketingUserID = ?
                ORDER BY u.Nombre
            `).all(req.user?.UsuarioID);
        } else {
            owners = await db.prepare(`
                SELECT UsuarioID as id, Nombre as nombre
                FROM Usuarios
                WHERE Activo = 1 AND Rol IN ('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING')
                ORDER BY Nombre
            `).all();
        }

        res.json(owners || []);
    } catch (error) {
        console.error('Error al obtener owners:', error);
        res.json([]);
    }
});

// GET /api/oportunidades/active-by-contact/:contactoId
router.get('/active-by-contact/:contactoId', async (req, res) => {
    try {
        const contactoId = req.params.contactoId;
        const oportunidad = await db.prepare(`
            SELECT o.*,
                COALESCE(o.source_name, o.source, ori.Nombre) as source_name,
                COALESCE(o.source, ori.Nombre) as source,
                u.Nombre as OwnerNombre
            FROM Oportunidades o
            LEFT JOIN Origenes ori ON o.OrigenID = ori.OrigenID
            LEFT JOIN Usuarios u ON o.OwnerUserID = u.UsuarioID
            WHERE o.ContactoID = ? AND o.EstadoCierre = 'Activo'
            ORDER BY o.UpdatedAt DESC
            LIMIT 1
        `).get(contactoId);

        return res.json(oportunidad || null);
    } catch (error) {
        console.error('Error al obtener oportunidad activa:', error);
        res.status(500).json({ error: 'Error al obtener oportunidad activa' });
    }
});

// GET /api/oportunidades/:id
router.get('/:id', async (req, res) => {
    try {
        const oportunidad = await Oportunidad.getById(req.params.id);
        if (!oportunidad) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, oportunidad)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        res.json(oportunidad);
    } catch (error) {
        console.error('Error al obtener oportunidad:', error);
        res.status(500).json({ error: 'Error al obtener oportunidad' });
    }
});

// POST /api/oportunidades/crear-con-contacto
// Crea cliente + oportunidad en una transacción
router.post('/crear-con-contacto', async (req, res) => {
    const { v4: uuidv4 } = require('uuid');

    try {
        const {
            // Datos del contacto
            nombre,
            telefono,
            email,
            direccion,
            ciudad,
            estadoProvincia,
            zipcode,
            pais,
            // Datos de la oportunidad
            origenId,
            origenNombre,
            referidoPor,
            productoInteres,
            etapa,
            notas,
            estadoCierre,
            proximoContactoFecha,
            motivoNoInteresado,
            estadoCivil,
            nombrePareja,
            trabajaActualmente,
            mejorHoraContacto,
            ownerUserId
        } = req.body;

        const nombreValue = normalizeValue(nombre);
        const telefonoValue = normalizeValue(telefono);
        const paisValue = normalizeValue(pais) || 'Estados Unidos';
        const emailValue = normalizeValue(email);

        // Validaciones
        if (!nombreValue) {
            return res.status(400).json({ error: 'Nombre es requerido' });
        }

        if (!telefonoValue) {
            return res.status(400).json({ error: 'Telefono es requerido' });
        }

        if (!paisValue) {
            return res.status(400).json({ error: 'Pais es requerido' });
        }

        const phoneNormalized = normalizePhone(telefonoValue);
        if (phoneNormalized || emailValue) {
            const phoneExpr = `replace(replace(replace(replace(replace(replace(coalesce(mobile_phone,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
            const phoneExprLegacy = `replace(replace(replace(replace(replace(replace(coalesce(Telefono,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
            const duplicate = await db.prepare(`
                SELECT ContactoID as id, COALESCE(full_name, NombreCompleto) as fullName, COALESCE(mobile_phone, Telefono) as mobilePhone, Email as email
                FROM Contactos
                WHERE
                    (${emailValue ? 'LOWER(Email) = ? OR' : ''}
                    ${phoneNormalized ? `${phoneExpr} = ? OR ${phoneExprLegacy} = ? OR mobile_phone = ? OR Telefono = ?` : '1=0'})
                LIMIT 1
            `).get(
                ...(emailValue ? [emailValue.toLowerCase()] : []),
                ...(phoneNormalized ? [phoneNormalized, phoneNormalized, telefonoValue, telefonoValue] : [])
            );

            if (duplicate) {
                return res.status(409).json({ error: 'Contacto ya existe', contact: duplicate });
            }
        }

        // Iniciar transacción
        const transaction = db.transaction(async () => {
            const direccionValue = normalizeValue(direccion);
            const ciudadValue = normalizeValue(ciudad);
            const estadoProvinciaValue = normalizeValue(estadoProvincia);
            const zipcodeValue = normalizeValue(zipcode);
            const estadoCivilValue = normalizeValue(estadoCivil);
            const nombreParejaValue = normalizeValue(nombrePareja);
            const trabajaActualmenteValue = normalizeValue(trabajaActualmente);
            const mejorHoraContactoValue = normalizeValue(mejorHoraContacto);
            const origenNombreValue = normalizeValue(origenNombre);
            const sourceNameValue = normalizeValue(req.body.source_name || req.body.custom_source || origenNombre);
            const sourceValue = normalizeValue(req.body.source || sourceNameValue);
            const referidoPorValue = normalizeValue(referidoPor);

            const ownerUserIdValue = isDistribuidor(req) && ownerUserId ? ownerUserId : (req.user ? req.user.UsuarioID : 1);

            const maritalAllowed = ['SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'NO_DICE'];
            const bothWorkAllowed = ['TRABAJA_1', 'TRABAJAN_2', 'NO_DICE'];
            const maritalValue = maritalAllowed.includes(String(estadoCivilValue || '').toUpperCase())
                ? String(estadoCivilValue).toUpperCase()
                : 'NO_DICE';
            const bothWorkValue = bothWorkAllowed.includes(String(trabajaActualmenteValue || '').toUpperCase())
                ? String(trabajaActualmenteValue).toUpperCase()
                : 'NO_DICE';

            let referidoPorIdValue = null;
            let referidoPorTypeValue = 'NO_DICE';
            if (referidoPorValue) {
                const contactoReferido = await db.prepare('SELECT ContactoID FROM Contactos WHERE NombreCompleto = ?').get(referidoPorValue);
                if (contactoReferido) {
                    referidoPorIdValue = contactoReferido.ContactoID;
                    referidoPorTypeValue = 'CONTACTO';
                } else {
                    const clienteReferido = await db.prepare('SELECT ClienteID FROM Clientes WHERE Nombre = ?').get(referidoPorValue);
                    if (clienteReferido) {
                        referidoPorIdValue = clienteReferido.ClienteID;
                        referidoPorTypeValue = 'CLIENTE';
                    }
                }
            }

            let origenFinalId = origenId || null;
            if (!origenFinalId && origenNombre) {
                const existingOrigen = await db.prepare('SELECT OrigenID FROM Origenes WHERE Nombre = ?').get(origenNombre);
                if (existingOrigen) {
                    origenFinalId = existingOrigen.OrigenID;
                } else {
                    const resultOrigen = await db.prepare('INSERT INTO Origenes (Nombre) VALUES (?) RETURNING OrigenID AS "lastInsertRowid"').run(origenNombre);
                    origenFinalId = resultOrigen.lastInsertRowid;
                }
            }

            // 1. Crear nuevo contacto
            const contactCityValue = ciudadValue || 'NO_DICE';
            const contactStateValue = estadoProvinciaValue || 'NO_DICE';
            const originTypeValue = origenNombreValue || 'NO_DICE';
            const insertValues = {
                full_name: nombreValue,
                mobile_phone: telefonoValue,
                address1: direccionValue || null,
                address2: null,
                city: contactCityValue,
                state: contactStateValue,
                zip_code: zipcodeValue || null,
                country: 'USA',
                origin_type: originTypeValue,
                source: sourceValue || originTypeValue,
                source_name: sourceNameValue,
                referred_by_type: referidoPorTypeValue,
                referred_by_id: referidoPorIdValue || 0,
                relationship_to_referrer: 'NO_DICE',
                assigned_to_user_id: ownerUserIdValue,
                marital_status: maritalValue,
                home_ownership: 'NO_DICE',
                both_work: bothWorkValue,
                has_children: 0,
                children_count: null,
                knows_royal_prestige: null,
                contact_status: 'NUEVO',
                contact_allowed: 1,
                notes: null,
                NombreCompleto: nombreValue,
                Telefono: telefonoValue,
                Email: emailValue || null,
                Direccion: direccionValue || null,
                Ciudad: contactCityValue,
                Estado: contactStateValue,
                Zipcode: zipcodeValue || null,
                Pais: paisValue || 'Estados Unidos',
                EstadoCivil: maritalValue || null,
                NombrePareja: nombreParejaValue || null,
                TrabajaActualmente: bothWorkValue || null,
                MejorHoraContacto: mejorHoraContactoValue || null,
                OrigenFuente: originTypeValue || null,
                ReferidoPorId: referidoPorTypeValue === 'CONTACTO' ? referidoPorIdValue : null,
            };

            const insertStatement = await buildContactoInsert(db, insertValues);
            const resultContacto = await db.prepare(insertStatement.sql).run(...insertStatement.values);

            const contactoId = resultContacto.lastInsertRowid;

            // 3. Crear oportunidad
            const oportunidadId = uuidv4();

            // We need to fetch the system user if req.user is undefined (since auth might be simple)
            // For MVP, we'll assume a default user if not present, or use the query params?
            // In the plan, it mentions req.user.UsuarioID. 
            // If no auth middleware, we should probably hardcode ID 1 (Sistema) or check.
            const ownerName = req.user ? req.user.Nombre : 'Sistema';

            if (isTelemarketing(req) && etapa && !TELEMARKETING_ETAPAS.includes(etapa)) {
                throw new Error('Etapa no permitida para telemarketing');
            }

            const estadoCierreValue = estadoCierre || 'Activo';
            if (!ESTADOS_CIERRE.includes(estadoCierreValue)) {
                throw new Error('EstadoCierre invalido');
            }

            if (estadoCierreValue === 'Seguimiento' && !proximoContactoFecha) {
                throw new Error('ProximoContactoFecha requerido');
            }

            if (estadoCierreValue === 'No interesado' && !motivoNoInteresado) {
                // Motivo opcional
            }

            await db.prepare(`
        INSERT INTO Oportunidades (
          OportunidadID,
          ContactoID,
          ClienteID,
          OrigenID,
          source,
          source_name,
          Etapa,
          ProductoInteres,
          OwnerUserID,
          assigned_to_user_id,
          ProximaAccion,
          FechaProximaAccion,
          EstadoCierre,
          ProximoContactoFecha,
          MotivoNoInteresado
          , ReferidoPor, EstadoCivil, NombrePareja, TrabajaActualmente, MejorHoraContacto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp + interval '1 day', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                oportunidadId,
                contactoId,
                null,
                origenFinalId || null,
                sourceValue || origenNombreValue || null,
                sourceNameValue || origenNombreValue || null,
                etapa || 'NUEVO_LEAD',
                normalizeValue(productoInteres) || null,
                ownerUserIdValue,
                ownerUserIdValue,
                'Primer contacto',
                estadoCierreValue,
                proximoContactoFecha || null,
                motivoNoInteresado || null,
                referidoPorValue || null,
                estadoCivilValue || null,
                nombreParejaValue || null,
                trabajaActualmenteValue || null,
                mejorHoraContactoValue || null
            );

            // 4. Crear nota inicial si hay notas
            return { oportunidadId, contactoId, contactoExistente: false };
        });

        const resultado = await transaction();

        // Obtener la oportunidad completa con joins
        const oportunidad = await db.prepare(`
      SELECT 
        o.*,
        COALESCE(o.source_name, o.source, ori.Nombre) as source_name,
        COALESCE(o.source, ori.Nombre) as source,
        COALESCE(ct.NombreCompleto, cl.Nombre) as ContactoNombre,
        COALESCE(ct.Telefono, cl.Telefono) as ContactoTelefono,
        COALESCE(ct.Email, cl.Email) as ContactoEmail,
        ori.Nombre as OrigenNombre,
        u.Nombre as OwnerNombre
      FROM Oportunidades o
      LEFT JOIN Contactos ct ON o.ContactoID = ct.ContactoID
      LEFT JOIN Clientes cl ON o.ClienteID = cl.ClienteID
      LEFT JOIN Origenes ori ON o.OrigenID = ori.OrigenID
      LEFT JOIN Usuarios u ON o.OwnerUserID = u.UsuarioID
      WHERE o.OportunidadID = ?
    `).get(resultado.oportunidadId);

        res.status(201).json({
            mensaje: 'Oportunidad creada',
            oportunidad,
            contactoExistente: resultado.contactoExistente,
            contactoNuevo: !resultado.contactoExistente
        });

    } catch (error) {
        if (error.message === 'Etapa no permitida para telemarketing') {
            return res.status(403).json({ error: error.message });
        }
        if (error.message === 'EstadoCierre invalido') {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'ProximoContactoFecha requerido' || error.message === 'Motivo requerido') {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Nombre es requerido' || error.message === 'Telefono es requerido' || error.message === 'Pais es requerido') {
            return res.status(400).json({ error: error.message });
        }

        const constraintError = buildContactosConstraintError(error);
        if (constraintError) {
            return res.status(400).json({ error: constraintError });
        }

        console.error('Error al crear contacto y oportunidad:', error);
        res.status(500).json({ error: error.message || 'Error al crear contacto y oportunidad' });
    }
});

// POST /api/oportunidades
router.post('/', async (req, res) => {
    try {
        const contactoId = req.body.contactId || req.body.contactoId;
        const clienteId = req.body.clienteId;
        const etapa = req.body.stage || req.body.etapa;
        const status = req.body.status;

        if ((contactoId && clienteId) || (!contactoId && !clienteId)) {
            return res.status(400).json({ error: 'Debe indicar contactoId o clienteId (solo uno)' });
        }
        if (isTelemarketing(req) && etapa && !TELEMARKETING_ETAPAS.includes(etapa)) {
            return res.status(403).json({ error: 'Etapa no permitida para telemarketing' });
        }

        if (req.body.estadoCierre && !ESTADOS_CIERRE.includes(req.body.estadoCierre)) {
            return res.status(400).json({ error: 'EstadoCierre invalido' });
        }

        if (req.body.estadoCierre === 'Seguimiento' && !req.body.proximoContactoFecha) {
            return res.status(400).json({ error: 'ProximoContactoFecha requerido' });
        }

        if (req.body.estadoCierre === 'No interesado' && !req.body.motivoNoInteresado) {
            // Motivo opcional
        }

        let contacto = null;
        if (contactoId) {
            contacto = await db.prepare('SELECT * FROM Contactos WHERE ContactoID = ?').get(contactoId);
            if (!contacto) {
                return res.status(404).json({ error: 'Contacto no encontrado' });
            }

            if (!req.body.forceCreate) {
                const activa = await db.prepare(`
                    SELECT OportunidadID, Etapa, EstadoCierre
                    FROM Oportunidades
                    WHERE ContactoID = ? AND EstadoCierre = 'Activo'
                    ORDER BY UpdatedAt DESC
                    LIMIT 1
                `).get(contactoId);
                if (activa) {
                    return res.status(409).json({ error: 'Oportunidad activa existente', opportunity: activa });
                }
            }
        }

        const assignedToUserId = req.body.assignedToUserId || req.body.assignedTo || req.body.ownerUserId || req.body.assigned_to_user_id;
        const sourceCategory = normalizeValue(req.body.source_category || req.body.sourceCategory || req.body.source || req.body.origin_type || req.body.origenFuente);
        const sourceName = normalizeValue(req.body.source_name || req.body.sourceName || req.body.custom_source || req.body.origenNombre || req.body.source);
        const contactSourceName = contacto ? mapOriginTypeToNombre(contacto.origin_type || contacto.OrigenFuente) : null;
        const resolvedSourceName = sourceName || contactSourceName || null;
        const origenId = await resolveOrigenId(req.body.origenId, resolvedSourceName);

        const referidoById = req.body.referredById || req.body.referidoPorId;
        const referidoByType = req.body.referredByType || req.body.referidoPorType || (contacto ? contacto.referred_by_type : null);
        const contactReferidoId = contacto ? contacto.referred_by_id || contacto.ReferidoPorId : null;
        const referidoNombre = await resolveReferidoNombre(referidoByType, referidoById || contactReferidoId) || req.body.referidoPor || null;

        if (resolvedSourceName && resolvedSourceName.toLowerCase().includes('referido') && !referidoById && !contactReferidoId) {
            return res.status(400).json({ error: 'Referido por es obligatorio cuando la fuente es Referido' });
        }

        const payload = {
            ...req.body,
            contactoId,
            clienteId,
            etapa: etapa || (status === 'won' ? 'CIERRE_GANADO' : status === 'lost' ? 'CIERRE_PERDIDO' : 'NUEVO_LEAD'),
            origenId,
            source: sourceCategory || resolvedSourceName || null,
            source_name: sourceName || null,
            productoInteres: req.body.productoInteres || req.body.productInterest || null,
            ownerUserId: isDistribuidor(req)
                ? (assignedToUserId || contacto?.assigned_to_user_id || req.user.UsuarioID)
                : req.user.UsuarioID,
            assigned_to_user_id: isDistribuidor(req)
                ? (assignedToUserId || contacto?.assigned_to_user_id || req.user.UsuarioID)
                : req.user.UsuarioID,
            referidoPor: referidoNombre,
            proximaAccion: req.body.proximaAccion || req.body.nextAction || null,
            fechaProximaAccion: req.body.fechaProximaAccion || req.body.nextActionAt || null,
            estadoCierre: req.body.estadoCierre || (status === 'lost' ? 'No interesado' : 'Activo')
        };

        const oportunidad = await Oportunidad.create(payload);
        res.status(201).json(oportunidad);
    } catch (error) {
        console.error('Error al crear oportunidad:', error);
        res.status(400).json({ error: error.message });
    }
});

// PUT /api/oportunidades/:id
router.put('/:id', async (req, res) => {
    try {
        const existing = await Oportunidad.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, existing)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const payload = { ...req.body };
        if (payload.source !== undefined || payload.source_category !== undefined || payload.sourceCategory !== undefined) {
            payload.source = normalizeValue(payload.source || payload.source_category || payload.sourceCategory);
        }
        if (payload.source_name !== undefined || payload.sourceName !== undefined || payload.custom_source !== undefined) {
            payload.source_name = normalizeValue(payload.source_name || payload.sourceName || payload.custom_source);
        }
        if (!isDistribuidor(req)) {
            delete payload.ownerUserId;
            delete payload.assigned_to_user_id;
        }

        if (payload.contactoId !== undefined || payload.clienteId !== undefined) {
            if ((payload.contactoId && payload.clienteId) || (!payload.contactoId && !payload.clienteId)) {
                return res.status(400).json({ error: 'Debe indicar contactoId o clienteId (solo uno)' });
            }
        }

        if (payload.estadoCierre && !ESTADOS_CIERRE.includes(payload.estadoCierre)) {
            return res.status(400).json({ error: 'EstadoCierre invalido' });
        }

        if (payload.estadoCierre === 'Seguimiento' && !payload.proximoContactoFecha) {
            return res.status(400).json({ error: 'ProximoContactoFecha requerido' });
        }

        if (payload.estadoCierre === 'No interesado' && !payload.motivoNoInteresado) {
            return res.status(400).json({ error: 'Motivo requerido' });
        }

        const oportunidad = await Oportunidad.update(req.params.id, payload);
        res.json(oportunidad);
    } catch (error) {
        console.error('Error al actualizar oportunidad:', error);
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/oportunidades/:id
router.patch('/:id', async (req, res) => {
    try {
        const existing = await Oportunidad.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, existing)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const payload = { ...req.body };
        if (!isDistribuidor(req)) {
            delete payload.owner_id;
            delete payload.ownerUserId;
            delete payload.assigned_to_user_id;
        }

        if (payload.source !== undefined || payload.source_category !== undefined || payload.sourceCategory !== undefined) {
            payload.source = normalizeValue(payload.source || payload.source_category || payload.sourceCategory);
        }
        if (payload.source_name !== undefined || payload.sourceName !== undefined || payload.custom_source !== undefined) {
            payload.source_name = normalizeValue(payload.source_name || payload.sourceName || payload.custom_source);
        }

        const etapa = payload.etapa;
        const estadoCierre = payload.cierre_estado || payload.estadoCierre;

        if (estadoCierre && !ESTADOS_CIERRE.includes(estadoCierre)) {
            return res.status(400).json({ error: 'EstadoCierre invalido' });
        }

        if (estadoCierre === 'Seguimiento' && !payload.proximoContactoFecha) {
            return res.status(400).json({ error: 'ProximoContactoFecha requerido' });
        }

        if (estadoCierre === 'No interesado' && !payload.motivoNoInteresado) {
            // Motivo opcional
        }

        if (etapa && isTelemarketing(req) && !TELEMARKETING_ETAPAS.includes(etapa)) {
            return res.status(403).json({ error: 'Etapa no permitida para telemarketing' });
        }

        let updated = existing;

        if (etapa) {
            updated = await Oportunidad.updateEtapa(req.params.id, etapa, {
                fechaCita: payload.fechaCita,
                proximaAccion: payload.proximaAccion,
                fechaProximaAccion: payload.fechaProximaAccion,
                razonPerdida: payload.razonPerdida,
            });
        }

        const updatePayload = {
            ownerUserId: payload.owner_id ?? payload.ownerUserId,
            origenId: payload.origen_id ?? payload.origenId,
            source: payload.source,
            source_name: payload.source_name,
            assigned_to_user_id: payload.assigned_to_user_id ?? payload.assignedToUserId,
            estadoCierre,
            proximoContactoFecha: payload.proximoContactoFecha,
            motivoNoInteresado: payload.motivoNoInteresado,
            romperHielo: payload.romperHielo ?? payload.ice_breaker_done,
            regaloVisitaEntregado: payload.regaloVisitaEntregado ?? payload.gift_visit_delivered,
            demoCompletada: payload.demoCompletada ?? payload.demo_completed,
            programaVisitaId: payload.programaVisitaId,
        };

        Object.keys(updatePayload).forEach((key) => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        if (Object.keys(updatePayload).length > 0) {
            updated = await Oportunidad.update(req.params.id, updatePayload);
        }

        res.json(updated);
    } catch (error) {
        console.error('Error al actualizar oportunidad (patch):', error);
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/oportunidades/:id/etapa
router.patch('/:id/etapa', async (req, res) => {
    try {
        const { etapa, ...additionalData } = req.body;

        if (!etapa) {
            return res.status(400).json({ error: 'Etapa es requerida' });
        }

        const existing = await Oportunidad.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, existing)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        if (isTelemarketing(req) && !TELEMARKETING_ETAPAS.includes(etapa)) {
            return res.status(403).json({ error: 'Etapa no permitida para telemarketing' });
        }

        const oportunidad = await Oportunidad.updateEtapa(req.params.id, etapa, additionalData);
        res.json(oportunidad);
    } catch (error) {
        console.error('Error al actualizar etapa:', error);
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/oportunidades/:id
router.delete('/:id', async (req, res) => {
    try {
        const existing = await Oportunidad.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, existing)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        await Oportunidad.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar oportunidad:', error);
        res.status(500).json({ error: 'Error al eliminar oportunidad' });
    }
});

// POST /api/oportunidades/:id/crear-orden
router.post('/:id/crear-orden', async (req, res) => {
    try {
        const db = require('../config/database');
        const { v4: uuidv4 } = require('uuid');

        const oportunidad = await Oportunidad.getById(req.params.id);
        if (!oportunidad) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }

        if (!await ensureOwnerAccess(req, oportunidad)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        if (oportunidad.Etapa !== 'CIERRE_GANADO') {
            return res.status(400).json({ error: 'La oportunidad no esta cerrada' });
        }

        const transaction = db.transaction(async () => {
            let clienteId = oportunidad.ClienteID;

            if (!clienteId && oportunidad.ContactoID) {
                const contacto = await db.prepare('SELECT * FROM Contactos WHERE ContactoID = ?').get(oportunidad.ContactoID);
                if (!contacto) throw new Error('Contacto no encontrado');

                const resultCliente = await db.prepare(`
                    INSERT INTO Clientes (Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, Estado, TipoCliente, LifecycleStage)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', 'Residencial', 'CLIENTE')
                    RETURNING ClienteID AS "lastInsertRowid"
                `).run(
                    contacto.NombreCompleto,
                    contacto.Telefono || null,
                    contacto.Email || null,
                    contacto.Direccion || null,
                    contacto.Ciudad || null,
                    contacto.Estado || null,
                    contacto.Zipcode || null,
                    contacto.Pais || 'Estados Unidos'
                );

                clienteId = resultCliente.lastInsertRowid;

                await db.prepare('UPDATE Contactos SET Convertido = 1, ClienteID = ? WHERE ContactoID = ?')
                    .run(clienteId, oportunidad.ContactoID);

                await db.prepare('UPDATE Oportunidades SET ClienteID = ?, ContactoID = NULL WHERE OportunidadID = ?')
                    .run(clienteId, oportunidad.OportunidadID);

                await db.prepare('INSERT INTO CuentaRP (ClienteID) VALUES (?)').run(clienteId);
            }

            if (!clienteId) {
                throw new Error('Cliente no disponible');
            }

            let cuenta = await db.prepare('SELECT CuentaID FROM CuentaRP WHERE ClienteID = ?').get(clienteId);
            if (!cuenta) {
                const infoCuenta = await db.prepare('INSERT INTO CuentaRP (ClienteID) VALUES (?) RETURNING CuentaID AS "lastInsertRowid"').run(clienteId);
                cuenta = { CuentaID: infoCuenta.lastInsertRowid };
            }

            const numeroOrden = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${uuidv4().slice(0,6)}`;
            const total = 0;

            const info = await db.prepare(`
                INSERT INTO OrdenesRP (ClienteID, CuentaID, NumeroOrden, Fecha, TipoOrden, Total, Balance, Estado, Notas, Impuestos)
                VALUES (?, ?, ?, current_date, 'Venta', ?, ?, 'Pendiente', ?, 0)
                RETURNING OrdenID AS "lastInsertRowid"
            `).run(
                clienteId,
                cuenta.CuentaID,
                numeroOrden,
                total,
                total,
                `Generada desde oportunidad ${oportunidad.OportunidadID}`
            );

            return info.lastInsertRowid;
        });

        const ordenId = await transaction();
        res.json({ message: 'Orden creada', ordenId });
    } catch (error) {
        console.error('Error al crear orden desde oportunidad:', error);
        if (error.message === 'Contacto no encontrado' || error.message === 'Cliente no disponible') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear orden' });
    }
});

// GET /api/oportunidades/contacto/:contactoId
router.get('/contacto/:contactoId', async (req, res) => {
    try {
        let oportunidades = await Oportunidad.getByContacto(req.params.contactoId);
        if (isTelemarketing(req)) {
            const assigned = await getTelemarketingOwnerIds(req);
            oportunidades = assigned.length > 0
                ? oportunidades.filter((item) => assigned.includes(item.OwnerUserID))
                : [];
        } else if (!isDistribuidor(req)) {
            oportunidades = oportunidades.filter((item) => item.OwnerUserID === req.user.UsuarioID);
        }
        res.json(oportunidades);
    } catch (error) {
        console.error('Error al obtener oportunidades del contacto:', error);
        res.status(500).json({ error: 'Error al obtener oportunidades' });
    }
});

module.exports = router;

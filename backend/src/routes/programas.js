const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const EmailService = require('../services/EmailService');

router.use(auth);

const referenciasDir = path.join(__dirname, '../../data/programas-referencias');
const ensureReferenciasDir = () => {
    if (!fs.existsSync(referenciasDir)) {
        fs.mkdirSync(referenciasDir, { recursive: true });
    }
};

const referenciasStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureReferenciasDir();
        cb(null, referenciasDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        cb(null, `${uuidv4()}${ext}`);
    }
});

const referenciasUpload = multer({
    storage: referenciasStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const canBypassDemo = (req) => ['ADMIN', 'DISTRIBUIDOR'].includes(req.user?.Rol);

const normalizeValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

const normalizePhone = (value) => {
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9+]/g, '');
    return cleaned || null;
};

const tableExists = async (table) => {
    const tableName = `public.${String(table || '').toLowerCase()}`;
    const row = await db.prepare('SELECT to_regclass(?) as name').get(tableName);
    return Boolean(row?.name);
};

const getProgramById = async (id) => {
    return await db.prepare('SELECT * FROM ProgramasCRM WHERE ProgramaID = ?').get(id);
};

const getOwnerInfo = async (program) => {
    if (!program) return { name: null, email: null };
    if (program.OwnerType === 'contacto') {
        const row = await db.prepare('SELECT NombreCompleto as Nombre, Email FROM Contactos WHERE ContactoID = ?').get(program.OwnerID);
        return { name: row?.Nombre || null, email: row?.Email || null };
    }
    const row = await db.prepare('SELECT Nombre, Email FROM Clientes WHERE ClienteID = ?').get(program.OwnerID);
    return { name: row?.Nombre || null, email: row?.Email || null };
};

const findContactoByPhone = async (phone) => {
    if (!phone) return null;
    const phoneExpr = `replace(replace(replace(replace(replace(replace(coalesce(mobile_phone,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
    const phoneExprLegacy = `replace(replace(replace(replace(replace(replace(coalesce(Telefono,''), '+',''), ' ', ''), '-', ''), '(', ''), ')',''), '.', '')`;
    const row = await db.prepare(`
        SELECT ContactoID as id
        FROM Contactos
        WHERE ${phoneExpr} = ? OR ${phoneExprLegacy} = ?
        LIMIT 1
    `).get(phone, phone);
    return row?.id || null;
};

const createContactoFromReferral = async (data) => {
    const fullName = data.nombre;
    const phone = data.telefono;
    if (!fullName || !phone) return null;

    const existingId = await findContactoByPhone(phone);
    if (existingId) return existingId;

    const cityValue = data.ciudad || 'NO_DICE';
    const stateValue = data.estado || 'NO_DICE';
    const countryValue = data.pais || 'USA';
    const originTypeValue = 'REFERIDO';
    const referredByTypeValue = data.referredByType || 'NO_DICE';
    const referredByIdValue = data.referredById || 0;
    const relationshipValue = data.relacion || 'NO_DICE';
    const assignedUserIdValue = data.assignedToUserId || null;
    if (!assignedUserIdValue) return null;

    const info = await db.prepare(`
        INSERT INTO Contactos (
            full_name,
            mobile_phone,
            address1,
            city,
            state,
            zip_code,
            country,
            origin_type,
            source,
            source_name,
            referred_by_type,
            referred_by_id,
            relationship_to_referrer,
            assigned_to_user_id,
            contact_status,
            contact_allowed,
            NombreCompleto,
            Telefono,
            Email,
            Ciudad,
            Estado,
            Zipcode,
            Pais
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING ContactoID AS "lastInsertRowid"
    `).run(
        fullName,
        phone,
        data.direccion || null,
        cityValue,
        stateValue,
        data.zipcode || null,
        countryValue,
        originTypeValue,
        originTypeValue,
        null,
        referredByTypeValue,
        referredByIdValue,
        relationshipValue,
        assignedUserIdValue,
        'NUEVO',
        1,
        fullName,
        phone,
        data.email || null,
        cityValue,
        stateValue,
        data.zipcode || null,
        countryValue
    );

    return info.lastInsertRowid || null;
};

const findActiveOpportunity = async (contactId) => {
    if (!contactId) return null;
    const row = await db.prepare(`
        SELECT OportunidadID
        FROM Oportunidades
        WHERE ContactoID = ?
          AND (EstadoCierre = 'Activo' OR EstadoCierre IS NULL)
        ORDER BY CreatedAt DESC
        LIMIT 1
    `).get(contactId);
    return row?.OportunidadID || null;
};

const createOpportunityFromReferral = async (data) => {
    const contactoId = data.contactoId;
    if (!contactoId) return null;

    const existing = await findActiveOpportunity(contactoId);
    if (existing) return existing;

    const Oportunidad = require('../models/Oportunidad');
    const created = await Oportunidad.create({
        contactoId,
        etapa: 'NUEVO_LEAD',
        ownerUserId: data.assignedToUserId || null,
        assigned_to_user_id: data.assignedToUserId || null,
        source: 'REFERIDO',
        source_name: data.referidoPor || null,
        referidoPor: data.referidoPor || null,
        referidoPorTipo: data.referidoPorTipo || null,
        referidoPorId: data.referidoPorId || null,
        programaId: data.programaId || null,
        programaTipo: data.programaTipo || null,
        estadoCivil: data.estadoCivil || null,
        nombrePareja: data.nombrePareja || null,
        trabajaActualmente: data.trabajaActualmente || null,
        mejorHoraContacto: data.mejorHoraContacto || null
    });

    return created?.OportunidadID || null;
};

const enrichProgram = async (program) => {
    if (!program) return null;
    let ownerName = null;
    if (program.OwnerType === 'contacto') {
        ownerName = (await db.prepare('SELECT NombreCompleto as Nombre FROM Contactos WHERE ContactoID = ?')
            .get(program.OwnerID))?.Nombre;
    } else if (program.OwnerType === 'cliente') {
        ownerName = (await db.prepare('SELECT Nombre FROM Clientes WHERE ClienteID = ?')
            .get(program.OwnerID))?.Nombre;
    }
    const asesor = program.AsesorID
        ? await db.prepare('SELECT Nombre, Telefono FROM Usuarios WHERE UsuarioID = ?').get(program.AsesorID)
        : null;

    return {
        ...program,
        OwnerNombre: ownerName || null,
        AsesorNombre: asesor?.Nombre || null,
        AsesorTelefono: asesor?.Telefono || null,
    };
};

const getProgramMetrics = async (program) => {
    if (!program) return null;

    const referralsRow = await db.prepare('SELECT COUNT(*) as total FROM ProgramasReferidosCRM WHERE ProgramaID = ?')
        .get(program.ProgramaID);
    const referralsTotal = referralsRow?.total || 0;

    const demosRow = await db.prepare(`
        SELECT COUNT(*) as total FROM ProgramasReferidosCRM
        WHERE ProgramaID = ? AND Estado = 'DEMO'
    `).get(program.ProgramaID);
    const demosCount = demosRow?.total || 0;

    let remainingDays = null;
    let expired = false;
    if (program.Tipo === '4_EN_14' && program.FechaFin) {
        const today = new Date();
        const endDate = new Date(program.FechaFin);
        const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        remainingDays = diff;
        expired = diff < 0;
    }

    return { referralsTotal, demosCount, remainingDays, expired };
};

const recordEvent = async (programId, type, payload) => {
    const eventId = uuidv4();
    await db.prepare(`
        INSERT INTO ProgramasEventosCRM (EventoID, ProgramaID, TipoEvento, PayloadJSON)
        VALUES (?, ?, ?, ?)
    `).run(eventId, programId, type, payload ? JSON.stringify(payload) : null);
};

const ensureProgramStatus = async (program) => {
    if (!program) return program;

    const metrics = await getProgramMetrics(program);
    let status = program.Estado;
    let giftEligible = program.RegaloElegible;

    if (program.Tipo === '20_Y_GANA') {
        if (metrics.referralsTotal < 20) {
            status = 'PENDIENTE';
        } else {
            status = 'ACTIVO';
        }
        giftEligible = metrics.referralsTotal >= 20 && program.WhatsappEnviado === 1 ? 1 : 0;
    }

    if (program.Tipo === '4_EN_14') {
        if (metrics.expired && status !== 'COMPLETADO') {
            status = 'EXPIRADO';
        }
        if (!metrics.expired && metrics.demosCount >= 4) {
            status = 'COMPLETADO';
            giftEligible = 1;
        }
    }

    if (status !== program.Estado || giftEligible !== program.RegaloElegible) {
        await db.prepare(`
            UPDATE ProgramasCRM
            SET Estado = ?, RegaloElegible = ?, UpdatedAt = CURRENT_TIMESTAMP
            WHERE ProgramaID = ?
        `).run(status, giftEligible, program.ProgramaID);
        return await getProgramById(program.ProgramaID);
    }

    return program;
};

// POST /api/programas
router.post('/', async (req, res) => {
    try {
        const tipo = normalizeValue(req.body.tipo);
        const opportunityId = normalizeValue(req.body.opportunity_id || req.body.opportunityId);
        const ownerType = normalizeValue(req.body.owner_type || req.body.ownerType);
        const ownerId = normalizeValue(req.body.owner_id || req.body.ownerId);
        let asesorId = req.body.asesor_id || req.body.asesorId || req.user?.UsuarioID || null;

        if (!tipo || !['20_Y_GANA', '4_EN_14', 'REFERIDO_SIMPLE'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo invalido' });
        }

        const allowWithoutDemo = Boolean(req.body.allow_without_demo || req.body.allowWithoutDemo);
        if (tipo !== 'REFERIDO_SIMPLE' && !opportunityId && !allowWithoutDemo) {
            return res.status(400).json({ error: 'Oportunidad requerida' });
        }

        if (!ownerType || !ownerId) {
            return res.status(400).json({ error: 'Owner requerido' });
        }

        if (!['contacto', 'cliente'].includes(ownerType)) {
            return res.status(400).json({ error: 'OwnerType invalido' });
        }

        const ownerExists = ownerType === 'contacto'
            ? await db.prepare('SELECT 1 FROM Contactos WHERE ContactoID = ?').get(ownerId)
            : await db.prepare('SELECT 1 FROM Clientes WHERE ClienteID = ?').get(ownerId);
        if (!ownerExists) {
            return res.status(404).json({ error: 'Owner no encontrado' });
        }

        if (asesorId) {
            const asesorExists = await db.prepare('SELECT 1 FROM Usuarios WHERE UsuarioID = ?').get(asesorId);
            if (!asesorExists) {
                asesorId = null;
            }
        }

        if (opportunityId) {
            const oportunidad = await db.prepare('SELECT * FROM Oportunidades WHERE OportunidadID = ?').get(opportunityId);
            if (!oportunidad) {
                return res.status(404).json({ error: 'Oportunidad no encontrada' });
            }
            if (tipo !== 'REFERIDO_SIMPLE' && oportunidad.Etapa !== 'DEMO_REALIZADA') {
                if (!allowWithoutDemo || !canBypassDemo(req)) {
                    return res.status(400).json({ error: 'Disponible solo en demostracion realizada' });
                }
            }

            const existing = await db.prepare(`
                SELECT * FROM ProgramasCRM
                WHERE OportunidadID = ? AND Tipo = ? AND Estado != 'CANCELADO'
            `).get(opportunityId, tipo);
            if (existing) {
                return res.json(existing);
            }
        }

        if (allowWithoutDemo && !canBypassDemo(req)) {
            return res.status(403).json({ error: 'No autorizado para crear sin demo' });
        }

        const programId = uuidv4();
        const startDate = new Date();
        const startDateValue = startDate.toISOString().split('T')[0];
        const endDateValue = tipo === '4_EN_14'
            ? new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            : null;

        await db.prepare(`
            INSERT INTO ProgramasCRM (
                ProgramaID,
                Tipo,
                OwnerType,
                OwnerID,
                OportunidadID,
                AsesorID,
                Estado,
                FechaInicio,
                FechaFin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            programId,
            tipo,
            ownerType,
            ownerId,
            opportunityId || null,
            asesorId,
            'ACTIVO',
            startDateValue,
            endDateValue
        );

        await recordEvent(programId, 'CREATED', { tipo, opportunityId });
        const program = await getProgramById(programId);
        res.status(201).json(await enrichProgram(program));
    } catch (error) {
        console.error('Error al crear programa:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/programas
router.get('/', async (req, res) => {
    try {
        const { owner_id, tipo, status } = req.query;
        let where = '1=1';
        const params = [];

        if (owner_id) {
            where += ' AND OwnerID = ?';
            params.push(owner_id);
        }
        if (tipo) {
            where += ' AND Tipo = ?';
            params.push(tipo);
        }
        if (status) {
            where += ' AND Estado = ?';
            params.push(status);
        }

        const programs = await db.prepare(`
            SELECT * FROM ProgramasCRM
            WHERE ${where}
            ORDER BY CreatedAt DESC
        `).all(...params);

        const enriched = await Promise.all((programs || []).map(async (program) => {
            const ensured = await ensureProgramStatus(program);
            const metrics = await getProgramMetrics(ensured);
            const base = await enrichProgram(ensured);
            return {
                ...base,
                referralsTotal: metrics?.referralsTotal || 0,
                demosCount: metrics?.demosCount || 0,
                remainingDays: metrics?.remainingDays ?? null,
                expired: metrics?.expired || false
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error al listar programas:', error);
        res.json([]);
    }
});

// GET /api/programas/:id
router.get('/:id', async (req, res) => {
    try {
        const program = await ensureProgramStatus(await getProgramById(req.params.id));
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const referrals = await db.prepare(`
            SELECT * FROM ProgramasReferidosCRM
            WHERE ProgramaID = ?
            ORDER BY CreatedAt DESC
        `).all(program.ProgramaID);

        res.json({ program: await enrichProgram(program), referrals: referrals || [] });
    } catch (error) {
        console.error('Error al obtener programa:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/programas/:id
router.patch('/:id', async (req, res) => {
    try {
        let program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const notes = normalizeValue(req.body.notes || req.body.notas);
        const status = normalizeValue(req.body.status);
        const whatsappSent = req.body.whatsapp_sent;
        const giftDelivered = req.body.gift_delivered;
        const giftChoice = normalizeValue(req.body.gift_choice || req.body.regalo_elegido);
        const giftChoiceOther = normalizeValue(req.body.gift_choice_other || req.body.regalo_elegido_otro);

        const updates = [];
        const values = [];

        if (status) {
            updates.push('Estado = ?');
            values.push(status);
        }
        if (notes !== null) {
            updates.push('Notas = ?');
            values.push(notes);
        }
        if (typeof whatsappSent === 'boolean') {
            updates.push('WhatsappEnviado = ?');
            values.push(whatsappSent ? 1 : 0);
            updates.push('WhatsappEnviadoAt = ?');
            values.push(whatsappSent ? new Date().toISOString() : null);
            await recordEvent(program.ProgramaID, 'WHATSAPP_SENT', { sent: whatsappSent });
        }
        if (typeof giftDelivered === 'boolean') {
            const metrics = await getProgramMetrics(program);
            if (program.Tipo === '20_Y_GANA') {
                if (metrics.referralsTotal < 20 || program.WhatsappEnviado !== 1) {
                    return res.status(400).json({ error: 'No cumple requisitos para entregar regalo' });
                }
            }
            if (program.Tipo === '4_EN_14') {
                if (metrics.demosCount < 4 || metrics.expired) {
                    return res.status(400).json({ error: 'No cumple requisitos para entregar regalo' });
                }
            }
            updates.push('RegaloEntregado = ?');
            values.push(giftDelivered ? 1 : 0);
            updates.push('RegaloEntregadoAt = ?');
            values.push(giftDelivered ? new Date().toISOString() : null);
            await recordEvent(program.ProgramaID, 'GIFT_DELIVERED', { delivered: giftDelivered });
        }

        if (giftChoice !== null) {
            updates.push('RegaloElegido = ?');
            values.push(giftChoice);
        }
        if (giftChoiceOther !== null) {
            updates.push('RegaloElegidoOtro = ?');
            values.push(giftChoiceOther);
        }

        if (updates.length > 0) {
            values.push(req.params.id);
            await db.prepare(`
                UPDATE ProgramasCRM
                SET ${updates.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP
                WHERE ProgramaID = ?
            `).run(...values);
        }

        program = await ensureProgramStatus(await getProgramById(req.params.id));
        res.json(await enrichProgram(program));
    } catch (error) {
        console.error('Error al actualizar programa:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programas/:id/referidos
router.post('/:id/referidos', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const nombre = normalizeValue(req.body.full_name || req.body.nombre);
        const telefono = normalizePhone(req.body.phone || req.body.telefono);
        const nombrePareja = normalizeValue(req.body.spouse_name || req.body.nombre_pareja);
        const estadoCivil = normalizeValue(req.body.marital_status || req.body.estado_civil || '');
        const direccion = normalizeValue(req.body.address1 || req.body.direccion);
        const ciudad = normalizeValue(req.body.city || req.body.ciudad);
        const estado = normalizeValue(req.body.state || req.body.estado);
        const zipcode = normalizeValue(req.body.zip_code || req.body.zipcode);
        const relacion = normalizeValue(req.body.relationship || req.body.relacion);
        const trabaja = normalizeValue(req.body.both_work || req.body.trabaja_actualmente);
        const mejorHora = normalizeValue(req.body.best_contact_time || req.body.mejor_hora_contacto);
        const propietario = normalizeValue(req.body.home_ownership || req.body.propietario_casa);
        const conoceRp = normalizeValue(req.body.knows_royal_prestige || req.body.conoce_royal_prestige);
        const notas = normalizeValue(req.body.notes || req.body.notas);
        if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

        const refId = uuidv4();
        await db.prepare(`
            INSERT INTO ProgramasReferidosCRM (
                ReferidoID,
                ProgramaID,
                NombreCompleto,
                Telefono,
                NombrePareja,
                EstadoCivil,
                Direccion,
                Ciudad,
                EstadoLugar,
                Zipcode,
                Relacion,
                TrabajaActualmente,
                MejorHoraContacto,
                PropietarioCasa,
                ConoceRoyalPrestige,
                Notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            refId,
            program.ProgramaID,
            nombre,
            telefono || null,
            nombrePareja,
            estadoCivil,
            direccion,
            ciudad,
            estado,
            zipcode,
            relacion,
            trabaja,
            mejorHora,
            propietario,
            conoceRp,
            notas
        );

        const ownerInfo = await getOwnerInfo(program);
        const referredByType = program.OwnerType === 'cliente' ? 'CLIENTE' : 'CONTACTO';
        const assignedToUserId = program.AsesorID || req.user?.UsuarioID || null;

        const contactId = await createContactoFromReferral({
            nombre,
            telefono,
            direccion,
            ciudad,
            estado,
            zipcode,
            relacion,
            assignedToUserId,
            referredByType,
            referredById: program.OwnerID,
            email: null,
            pais: 'USA'
        });

        let opportunityId = null;
        if (contactId) {
            try {
                opportunityId = await createOpportunityFromReferral({
                    contactoId: contactId,
                    assignedToUserId,
                    referidoPor: ownerInfo.name,
                    referidoPorTipo: referredByType,
                    referidoPorId: program.OwnerID,
                    programaId: program.ProgramaID,
                    programaTipo: program.Tipo,
                    estadoCivil,
                    nombrePareja,
                    trabajaActualmente: trabaja,
                    mejorHoraContacto: mejorHora
                });

                await db.prepare(`
                    UPDATE ProgramasReferidosCRM
                    SET CreatedLeadID = ?, CreatedOpportunityID = ?, UpdatedAt = CURRENT_TIMESTAMP
                    WHERE ReferidoID = ?
                `).run(String(contactId), opportunityId, refId);
            } catch (err) {
                console.warn('No se pudo crear oportunidad del referido:', err.message);
            }
        }

        await recordEvent(program.ProgramaID, 'IMPORTED', { count: 1 });
        if (ownerInfo.email) {
            try {
                const referrals = await db.prepare(`
                    SELECT NombreCompleto, Telefono FROM ProgramasReferidosCRM
                    WHERE ProgramaID = ? ORDER BY CreatedAt DESC
                `).all(program.ProgramaID);
                await EmailService.sendProgramReferralSummary({
                    to: ownerInfo.email,
                    ownerName: ownerInfo.name,
                    programType: program.Tipo,
                    referrals
                });
            } catch (err) {
                console.warn('No se pudo enviar email de referido:', err.message);
            }
        }

        res.status(201).json({ id: refId });
    } catch (error) {
        console.error('Error al crear referido:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/programas/:id/referidos
router.get('/:id/referidos', async (req, res) => {
    try {
        const referrals = await db.prepare(`
            SELECT * FROM ProgramasReferidosCRM
            WHERE ProgramaID = ?
            ORDER BY CreatedAt DESC
        `).all(req.params.id);
        res.json(referrals || []);
    } catch (error) {
        console.error('Error al listar referidos:', error);
        res.json([]);
    }
});

// GET /api/programas/:id/referencias
router.get('/:id/referencias', async (req, res) => {
    try {
        if (!await tableExists('ProgramasReferencias')) {
            return res.json([]);
        }
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const rows = await db.prepare(`
            SELECT * FROM ProgramasReferencias
            WHERE ProgramaID = ?
            ORDER BY CreatedAt DESC
        `).all(program.ProgramaID);

        res.json(rows || []);
    } catch (error) {
        console.error('Error al listar referencias:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programas/:id/referencias
router.post('/:id/referencias', referenciasUpload.array('files', 10), async (req, res) => {
    try {
        if (!await tableExists('ProgramasReferencias')) {
            return res.status(400).json({ error: 'Tabla de referencias no existe. Ejecuta migraciones.' });
        }
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Archivos requeridos' });
        }

        const insert = db.prepare(`
            INSERT INTO ProgramasReferencias (ReferenciaID, ProgramaID, FileName, FilePath, FileType)
            VALUES (?, ?, ?, ?, ?)
        `);

        const refs = [];
        const tx = db.transaction(async (files) => {
            for (const file of files) {
                const refId = uuidv4();
                await insert.run(refId, program.ProgramaID, file.originalname, file.filename, file.mimetype || '');
                refs.push({
                    ReferenciaID: refId,
                    ProgramaID: program.ProgramaID,
                    FileName: file.originalname,
                    FilePath: file.filename,
                    FileType: file.mimetype || ''
                });
            }
        });
        await tx(req.files);

        res.status(201).json({ items: refs });
    } catch (error) {
        console.error('Error al subir referencias:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/programas/:id/referencias/:refId
router.delete('/:id/referencias/:refId', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const ref = await db.prepare(`
            SELECT * FROM ProgramasReferencias
            WHERE ReferenciaID = ? AND ProgramaID = ?
        `).get(req.params.refId, program.ProgramaID);
        if (!ref) return res.status(404).json({ error: 'Referencia no encontrada' });

        await db.prepare('DELETE FROM ProgramasReferencias WHERE ReferenciaID = ?').run(req.params.refId);
        const filePath = path.join(referenciasDir, ref.FilePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al borrar referencia:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/programas/:id/referencias/:refId/file
router.get('/:id/referencias/:refId/file', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const ref = await db.prepare(`
            SELECT * FROM ProgramasReferencias
            WHERE ReferenciaID = ? AND ProgramaID = ?
        `).get(req.params.refId, program.ProgramaID);
        if (!ref) return res.status(404).json({ error: 'Referencia no encontrada' });

        const filePath = path.join(referenciasDir, ref.FilePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        res.setHeader('Content-Type', ref.FileType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${ref.FileName}"`);
        return res.sendFile(filePath);
    } catch (error) {
        console.error('Error al abrir referencia:', error);
        return res.status(500).json({ error: error.message });
    }
});

// PATCH /api/programas/:id/referidos/:refId
router.patch('/:id/referidos/:refId', async (req, res) => {
    try {
        const status = normalizeValue(req.body.status);
        const createdLeadId = normalizeValue(req.body.created_lead_id || req.body.createdLeadId);
        const nombrePareja = normalizeValue(req.body.spouse_name || req.body.nombre_pareja);
        const estadoCivil = normalizeValue(req.body.marital_status || req.body.estado_civil || '');
        const direccion = normalizeValue(req.body.address1 || req.body.direccion);
        const ciudad = normalizeValue(req.body.city || req.body.ciudad);
        const estado = normalizeValue(req.body.state || req.body.estado);
        const zipcode = normalizeValue(req.body.zip_code || req.body.zipcode);
        const relacion = normalizeValue(req.body.relationship || req.body.relacion);
        const trabaja = normalizeValue(req.body.both_work || req.body.trabaja_actualmente);
        const mejorHora = normalizeValue(req.body.best_contact_time || req.body.mejor_hora_contacto);
        const propietario = normalizeValue(req.body.home_ownership || req.body.propietario_casa);
        const conoceRp = normalizeValue(req.body.knows_royal_prestige || req.body.conoce_royal_prestige);
        const prioridad = req.body.priority !== undefined ? (req.body.priority ? 1 : 0) : null;
        const prioridadNota = normalizeValue(req.body.priority_note || req.body.nota_prioridad);
        const notas = normalizeValue(req.body.notes || req.body.notas);

        const updates = [];
        const values = [];
        if (status) {
            updates.push('Estado = ?');
            values.push(status);
        }
        if (createdLeadId) {
            updates.push('CreatedLeadID = ?');
            values.push(createdLeadId);
        }
        if (nombrePareja !== null) {
            updates.push('NombrePareja = ?');
            values.push(nombrePareja);
        }
        if (direccion !== null) {
            updates.push('Direccion = ?');
            values.push(direccion);
        }
        if (estadoCivil !== null) {
            updates.push('EstadoCivil = ?');
            values.push(estadoCivil);
        }
        if (ciudad !== null) {
            updates.push('Ciudad = ?');
            values.push(ciudad);
        }
        if (estado !== null) {
            updates.push('EstadoLugar = ?');
            values.push(estado);
        }
        if (zipcode !== null) {
            updates.push('Zipcode = ?');
            values.push(zipcode);
        }
        if (relacion !== null) {
            updates.push('Relacion = ?');
            values.push(relacion);
        }
        if (trabaja !== null) {
            updates.push('TrabajaActualmente = ?');
            values.push(trabaja);
        }
        if (mejorHora !== null) {
            updates.push('MejorHoraContacto = ?');
            values.push(mejorHora);
        }
        if (propietario !== null) {
            updates.push('PropietarioCasa = ?');
            values.push(propietario);
        }
        if (conoceRp !== null) {
            updates.push('ConoceRoyalPrestige = ?');
            values.push(conoceRp);
        }
        if (prioridad !== null) {
            updates.push('Prioridad = ?');
            values.push(prioridad ? 1 : 0);
        }
        if (prioridadNota !== null) {
            updates.push('PrioridadNota = ?');
            values.push(prioridadNota);
        }
        if (notas !== null) {
            updates.push('Notas = ?');
            values.push(notas);
        }
        if (updates.length === 0) {
            return res.json({ ok: true });
        }

        values.push(req.params.refId);
        await db.prepare(`
            UPDATE ProgramasReferidosCRM
            SET ${updates.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP
            WHERE ReferidoID = ?
        `).run(...values);

        if (status === 'DEMO') {
            const program = await getProgramById(req.params.id);
            if (program) {
                const metrics = await getProgramMetrics(program);
                const ownerInfo = await getOwnerInfo(program);
                if (ownerInfo.email) {
                    const referred = await db.prepare('SELECT NombreCompleto FROM ProgramasReferidosCRM WHERE ReferidoID = ?')
                        .get(req.params.refId);
                    await EmailService.sendProgramDemoUpdate({
                        to: ownerInfo.email,
                        ownerName: ownerInfo.name,
                        programType: program.Tipo,
                        referredName: referred?.NombreCompleto,
                        demoCount: metrics?.demosCount
                    });
                }
            }
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Error al actualizar referido:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/programas/:id/referidos/:refId
router.delete('/:id/referidos/:refId', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const ref = await db.prepare(`
            SELECT ReferidoID, CreatedLeadID FROM ProgramasReferidosCRM
            WHERE ReferidoID = ? AND ProgramaID = ?
        `).get(req.params.refId, program.ProgramaID);
        if (!ref) return res.status(404).json({ error: 'Referido no encontrado' });

        const tx = db.transaction(async () => {
            await db.prepare('DELETE FROM ProgramasReferidosCRM WHERE ReferidoID = ?').run(req.params.refId);
            if (ref.CreatedLeadID) {
                await db.prepare('DELETE FROM Oportunidades WHERE ContactoID = ?').run(ref.CreatedLeadID);
                await db.prepare('DELETE FROM Contactos WHERE ContactoID = ?').run(ref.CreatedLeadID);
            }
        });
        await tx();
        await recordEvent(program.ProgramaID, 'DELETED', { refId: req.params.refId });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error al borrar referido:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programas/:id/referidos/import
router.post('/:id/referidos/import', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const rawText = normalizeValue(req.body.rawText || req.body.text || req.body.lista || req.body.list);
        if (!rawText) return res.status(400).json({ error: 'Texto requerido' });

        const parseReferralLine = (line) => {
            const cleaned = String(line || '').replace(/\r/g, '').trim();
            if (!cleaned) return null;

            const phoneMatch = cleaned.match(/(?:\+?\d[\d\s().-]{6,}\d)$/);
            if (phoneMatch) {
                const phoneRaw = phoneMatch[0].trim();
                const name = cleaned.slice(0, cleaned.length - phoneRaw.length).replace(/[-,;|\t]+$/g, '').trim();
                return { nombre: name || cleaned, telefono: phoneRaw };
            }

            const parts = cleaned.split(/[\t,;|]/).map((part) => part.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return { nombre: parts[0], telefono: parts.slice(1).join(' ') };
            }

            const dashParts = cleaned.split('-').map((part) => part.trim()).filter(Boolean);
            if (dashParts.length >= 2) {
                return { nombre: dashParts[0], telefono: dashParts.slice(1).join('-') };
            }

            return { nombre: cleaned, telefono: '' };
        };

        const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);
        const parsed = lines
            .map(parseReferralLine)
            .filter((item) => item?.nombre);

        const existing = await db.prepare(`
            SELECT NombreCompleto, Telefono FROM ProgramasReferidosCRM
            WHERE ProgramaID = ?
        `).all(program.ProgramaID);

        const existingKeys = new Set(existing.map((item) => `${item.NombreCompleto}|${item.Telefono || ''}`));
        const toInsert = parsed.filter((item) => {
            const phone = normalizePhone(item.telefono) || '';
            const key = `${item.nombre}|${phone}`;
            if (existingKeys.has(key)) return false;
            existingKeys.add(key);
            return true;
        });

        const insert = db.prepare(`
            INSERT INTO ProgramasReferidosCRM (ReferidoID, ProgramaID, NombreCompleto, Telefono)
            VALUES (?, ?, ?, ?)
        `);

        const ownerInfo = await getOwnerInfo(program);
        const referredByType = program.OwnerType === 'cliente' ? 'CLIENTE' : 'CONTACTO';
        const assignedToUserId = program.AsesorID || req.user?.UsuarioID || null;

        const tx = db.transaction(async (items) => {
            for (const item of items) {
                const refId = uuidv4();
                const phone = normalizePhone(item.telefono);
                await insert.run(refId, program.ProgramaID, item.nombre, phone);

                const contactId = await createContactoFromReferral({
                    nombre: item.nombre,
                    telefono: phone,
                    ciudad: null,
                    estado: null,
                    zipcode: null,
                    relacion: null,
                    assignedToUserId,
                    referredByType,
                    referredById: program.OwnerID,
                    email: null,
                    pais: 'USA'
                });

                if (contactId) {
                    const opportunityId = await createOpportunityFromReferral({
                        contactoId: contactId,
                        assignedToUserId,
                        referidoPor: ownerInfo.name,
                        referidoPorTipo: referredByType,
                        referidoPorId: program.OwnerID,
                        programaId: program.ProgramaID,
                        programaTipo: program.Tipo
                    });

                    await db.prepare(`
                        UPDATE ProgramasReferidosCRM
                        SET CreatedLeadID = ?, CreatedOpportunityID = ?, UpdatedAt = CURRENT_TIMESTAMP
                        WHERE ReferidoID = ?
                    `).run(String(contactId), opportunityId, refId);
                }
            }
        });
        await tx(toInsert);

        await recordEvent(program.ProgramaID, 'IMPORTED', { count: toInsert.length });
        if (ownerInfo.email) {
            const referrals = await db.prepare(`
                SELECT NombreCompleto, Telefono FROM ProgramasReferidosCRM
                WHERE ProgramaID = ? ORDER BY CreatedAt DESC
            `).all(program.ProgramaID);
            await EmailService.sendProgramReferralSummary({
                to: ownerInfo.email,
                ownerName: ownerInfo.name,
                programType: program.Tipo,
                referrals
            });
        }

        res.json({ total: toInsert.length });
    } catch (error) {
        console.error('Error al importar referidos:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programas/:id/whatsapp/generar
router.post('/:id/whatsapp/generar', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });
        if (program.Tipo !== '20_Y_GANA') {
            return res.status(400).json({ error: 'WhatsApp solo aplica para 20 y Gana' });
        }

        const ownerName = program.OwnerType === 'contacto'
            ? (await db.prepare('SELECT NombreCompleto as Nombre FROM Contactos WHERE ContactoID = ?').get(program.OwnerID))?.Nombre
            : (await db.prepare('SELECT Nombre FROM Clientes WHERE ClienteID = ?').get(program.OwnerID))?.Nombre;

        const asesor = program.AsesorID
            ? await db.prepare('SELECT Nombre, Telefono FROM Usuarios WHERE UsuarioID = ?').get(program.AsesorID)
            : null;

        const asesorNombre = asesor?.Nombre || 'tu asesor';
        const asesorTelefono = req.body.asesor_telefono || asesor?.Telefono || '';
        const mensaje = `Hola ${ownerName || 'cliente'}, gracias por recibirnos. Para continuar con el programa, escribe a ${asesorNombre} al ${asesorTelefono}.`;
        const encoded = encodeURIComponent(mensaje);
        const waLink = asesorTelefono ? `https://wa.me/${asesorTelefono}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

        res.json({ mensaje_plano: mensaje, mensaje_codificado: encoded, wa_link: waLink });
    } catch (error) {
        console.error('Error al generar WhatsApp:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programas/:id/whatsapp/marcar-enviado
router.post('/:id/whatsapp/marcar-enviado', async (req, res) => {
    try {
        const program = await getProgramById(req.params.id);
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });
        if (program.Tipo !== '20_Y_GANA') {
            return res.status(400).json({ error: 'WhatsApp solo aplica para 20 y Gana' });
        }

        await db.prepare(`
            UPDATE ProgramasCRM
            SET WhatsappEnviado = 1, WhatsappEnviadoAt = ?, UpdatedAt = CURRENT_TIMESTAMP
            WHERE ProgramaID = ?
        `).run(new Date().toISOString(), program.ProgramaID);

        await recordEvent(program.ProgramaID, 'WHATSAPP_SENT', { sent: true });
        const ensured = await ensureProgramStatus(await getProgramById(program.ProgramaID));
        res.json(await enrichProgram(ensured));
    } catch (error) {
        console.error('Error al marcar WhatsApp:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/programas/:id/metricas
router.get('/:id/metricas', async (req, res) => {
    try {
        const program = await ensureProgramStatus(await getProgramById(req.params.id));
        if (!program) return res.status(404).json({ error: 'Programa no encontrado' });

        const metrics = await getProgramMetrics(program);
        res.json({
            referrals_total: metrics.referralsTotal,
            demos_count: metrics.demosCount,
            remaining_days: metrics.remainingDays,
            goal: 4,
            expired: metrics.expired,
        });
    } catch (error) {
        console.error('Error al obtener metricas:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

module.exports = router;

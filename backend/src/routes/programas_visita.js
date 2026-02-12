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

const parseBulkLines = (input) => {
    if (!input) return [];
    return input
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('-').map((part) => part.trim());
            if (parts.length < 2) {
                const alt = line.split(',').map((part) => part.trim());
                return { nombre: alt[0], telefono: alt[1] };
            }
            return { nombre: parts[0], telefono: parts.slice(1).join('-') };
        });
};

const normalizePhone = (value) => {
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9+]/g, '');
    return cleaned || null;
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

const updateProgramCount = async (programId) => {
    const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(programId);
    if (!program) return;
    const total = await db.prepare(`
        SELECT COUNT(*) as Total FROM Referidos
        WHERE OportunidadID = ? AND Tipo = ?
    `).get(program.OportunidadID, program.TipoPrograma);

    await db.prepare(`
        UPDATE ProgramasVisita
        SET ReferidosCount = ?, UpdatedAt = CURRENT_TIMESTAMP
        WHERE ProgramaVisitaID = ?
    `).run(total.Total || 0, programId);
};

// POST /api/programs
router.post('/', async (req, res) => {
    try {
        const opportunityId = normalizeValue(req.body.opportunity_id || req.body.opportunityId);
        const programType = normalizeValue(req.body.program_type || req.body.programType);
        const ownerType = normalizeValue(req.body.owner_person_type || req.body.ownerPersonType);
        const ownerId = req.body.owner_person_id || req.body.ownerPersonId;
        const bulk = normalizeValue(req.body.bulk || req.body.bulkLines);
        const referrals = Array.isArray(req.body.referrals) ? req.body.referrals : [];

        if (!opportunityId) {
            return res.status(400).json({ error: 'Oportunidad requerida' });
        }
        if (!['20_y_gana', '4_en_14'].includes(programType)) {
            return res.status(400).json({ error: 'Tipo de programa invalido' });
        }

        const oportunidad = await db.prepare('SELECT * FROM Oportunidades WHERE OportunidadID = ?').get(opportunityId);
        if (!oportunidad) {
            return res.status(404).json({ error: 'Oportunidad no encontrada' });
        }
        if (oportunidad.Etapa !== 'DEMO_REALIZADA') {
            return res.status(400).json({ error: 'La oportunidad no esta en demostracion realizada' });
        }

        let ownerContactoId = null;
        let ownerClienteId = null;
        if (ownerType && ownerId) {
            if (ownerType.toUpperCase() === 'CONTACTO') ownerContactoId = ownerId;
            if (ownerType.toUpperCase() === 'CLIENTE') ownerClienteId = ownerId;
        } else {
            ownerContactoId = oportunidad.ContactoID || null;
            ownerClienteId = oportunidad.ClienteID || null;
        }

        if (!ownerContactoId && !ownerClienteId) {
            return res.status(400).json({ error: 'Owner requerido' });
        }

        const bulkParsed = parseBulkLines(bulk);
        const referralList = [...referrals, ...bulkParsed];
        if (programType === '4_en_14' && referralList.length < 10) {
            return res.status(400).json({ error: '4 en 14 requiere minimo 10 referidos para activar' });
        }

        const minRequired = programType === '20_y_gana' ? 20 : 10;
        const rewardStatus = programType === '4_en_14' ? 'prometido' : 'pendiente';
        const whatsappStatus = programType === '4_en_14' ? 'no_aplica' : 'pendiente';
        const startDate = new Date();
        const startDateValue = startDate.toISOString().split('T')[0];
        const endDateValue = programType === '4_en_14'
            ? new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            : null;

        const programResult = await db.prepare(`
            INSERT INTO ProgramasVisita (
                OportunidadID,
                TipoPrograma,
                OwnerContactoID,
                OwnerClienteID,
                FechaInicio,
                FechaFin,
                MinimoRequerido,
                ReferidosCount,
                RewardStatus,
                WhatsappStatus,
                Notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ProgramaVisitaID AS "lastInsertRowid"
        `).run(
            opportunityId,
            programType,
            ownerContactoId,
            ownerClienteId,
            startDateValue,
            endDateValue,
            minRequired,
            0,
            rewardStatus,
            whatsappStatus,
            normalizeValue(req.body.notes) || null
        );

        const programId = programResult.lastInsertRowid;
        await db.prepare('UPDATE Oportunidades SET ProgramaVisitaID = ? WHERE OportunidadID = ?')
            .run(programId, opportunityId);

        if (referralList.length > 0) {
            const insertReferral = db.prepare(`
                INSERT INTO Referidos (
                    OwnerContactoID,
                    OwnerClienteID,
                    ContactoReferidoID,
                    Nombre,
                    Telefono,
                    Ciudad,
                    Tipo,
                    OportunidadID,
                    Estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const tx = db.transaction(async (items) => {
                for (const item of items) {
                    const nombre = normalizeValue(item.nombre || item.Nombre);
                    const telefono = normalizePhone(item.telefono || item.Telefono);
                    if (!nombre || !telefono) continue;
                    const contactoReferidoId = await ensureContactoReferido(
                        nombre,
                        telefono,
                        normalizeValue(item.ciudad || item.Ciudad),
                        req.user?.UsuarioID
                    );
                    await insertReferral.run(
                        ownerContactoId || null,
                        ownerClienteId || null,
                        contactoReferidoId || null,
                        nombre,
                        telefono,
                        normalizeValue(item.ciudad || item.Ciudad) || null,
                        programType,
                        opportunityId,
                        'nuevo'
                    );
                }
            });
            await tx(referralList);
            await updateProgramCount(programId);
        }

        const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(programId);
        res.status(201).json(program);
    } catch (error) {
        console.error('Error al crear programa visita:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/programs/:id
router.get('/:id', async (req, res) => {
    try {
        const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(req.params.id);
        if (!program) {
            return res.status(404).json({ error: 'Programa no encontrado' });
        }

        const referrals = await db.prepare(`
            SELECT * FROM Referidos
            WHERE OportunidadID = ? AND Tipo = ?
            ORDER BY CreatedAt DESC
        `).all(program.OportunidadID, program.TipoPrograma);

        res.json({ program, referrals: referrals || [] });
    } catch (error) {
        console.error('Error al obtener programa:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programs/:id/referrals/bulk
router.post('/:id/referrals/bulk', async (req, res) => {
    try {
        const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(req.params.id);
        if (!program) {
            return res.status(404).json({ error: 'Programa no encontrado' });
        }

        const bulk = normalizeValue(req.body.bulk || req.body.lines);
        const parsed = parseBulkLines(bulk);
        if (parsed.length === 0) {
            return res.status(400).json({ error: 'No hay referidos para procesar' });
        }

        const insertReferral = db.prepare(`
            INSERT INTO Referidos (
                OwnerContactoID,
                OwnerClienteID,
                ContactoReferidoID,
                Nombre,
                Telefono,
                Ciudad,
                Tipo,
                OportunidadID,
                Estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(async (items) => {
            for (const item of items) {
                const nombre = normalizeValue(item.nombre || item.Nombre);
                const telefono = normalizePhone(item.telefono || item.Telefono);
                if (!nombre || !telefono) continue;
                const contactoReferidoId = await ensureContactoReferido(nombre, telefono, normalizeValue(item.ciudad || item.Ciudad));
                await insertReferral.run(
                    program.OwnerContactoID || null,
                    program.OwnerClienteID || null,
                    contactoReferidoId || null,
                    nombre,
                    telefono,
                    normalizeValue(item.ciudad || item.Ciudad) || null,
                    program.TipoPrograma,
                    program.OportunidadID,
                    'nuevo'
                );
            }
        });
        await tx(parsed);

        await updateProgramCount(program.ProgramaVisitaID);
        const updated = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(program.ProgramaVisitaID);
        res.json({ program: updated });
    } catch (error) {
        console.error('Error al crear referidos bulk:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/programs/:id/referrals
router.post('/:id/referrals', async (req, res) => {
    try {
        const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(req.params.id);
        if (!program) {
            return res.status(404).json({ error: 'Programa no encontrado' });
        }

        const nombre = normalizeValue(req.body.nombre);
        const telefono = normalizePhone(req.body.telefono);
        const ciudad = normalizeValue(req.body.ciudad);

        if (!nombre || !telefono) {
            return res.status(400).json({ error: 'Nombre y telefono requeridos' });
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
                Estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ReferidoID AS "lastInsertRowid"
        `).run(
            program.OwnerContactoID || null,
            program.OwnerClienteID || null,
            contactoReferidoId || null,
            nombre,
            telefono,
            ciudad || null,
            program.TipoPrograma,
            program.OportunidadID,
            'nuevo'
        );

        await updateProgramCount(program.ProgramaVisitaID);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
        console.error('Error al crear referido:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/programs/:id
router.patch('/:id', async (req, res) => {
    try {
        const program = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(req.params.id);
        if (!program) {
            return res.status(404).json({ error: 'Programa no encontrado' });
        }

        const whatsappStatus = normalizeValue(req.body.whatsapp_status || req.body.whatsappStatus);
        const rewardStatus = normalizeValue(req.body.reward_status || req.body.rewardStatus);
        const notas = normalizeValue(req.body.notes || req.body.notas);

        await updateProgramCount(program.ProgramaVisitaID);
        const refreshed = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(program.ProgramaVisitaID);

        if (rewardStatus === 'entregado') {
            if (refreshed.ReferidosCount < refreshed.MinimoRequerido) {
                return res.status(400).json({ error: 'No cumple el minimo de referidos' });
            }
            if (refreshed.TipoPrograma === '20_y_gana' && refreshed.WhatsappStatus !== 'enviado') {
                return res.status(400).json({ error: 'Debe marcar WhatsApp como enviado antes de entregar regalo' });
            }
        }

        if (whatsappStatus && refreshed.TipoPrograma === '4_en_14') {
            return res.status(400).json({ error: 'WhatsApp no aplica para 4 en 14' });
        }

        const updates = [];
        const values = [];
        if (whatsappStatus) {
            updates.push('WhatsappStatus = ?');
            values.push(whatsappStatus);
        }
        if (rewardStatus) {
            updates.push('RewardStatus = ?');
            values.push(rewardStatus);
        }
        if (notas !== null) {
            updates.push('Notas = ?');
            values.push(notas);
        }

        if (updates.length === 0) {
            return res.json(refreshed);
        }

        values.push(req.params.id);
        await db.prepare(`
            UPDATE ProgramasVisita
            SET ${updates.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP
            WHERE ProgramaVisitaID = ?
        `).run(...values);

        const updated = await db.prepare('SELECT * FROM ProgramasVisita WHERE ProgramaVisitaID = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        console.error('Error al actualizar programa:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

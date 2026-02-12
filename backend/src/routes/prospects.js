const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { buildContactoInsert, buildContactoUpdate } = require('../utils/contactos');

const upload = multer({ storage: multer.memoryStorage() });

router.use(auth);

const normalizeValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

const normalizePhoneDigits = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
};

const buildPhone = (raw) => {
    const digits = normalizePhoneDigits(raw);
    const isValid = digits.length === 10;
    return {
        digits: isValid ? digits : digits,
        e164: isValid ? `+1${digits}` : null,
        isValid
    };
};

const parseRawText = (rawText) => {
    const lines = String(rawText || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const parsed = [];
    let pendingName = '';

    const parseLine = (line) => {
        const nameMatch = line.match(/^nombre\s*:\s*(.+)$/i);
        if (nameMatch) {
            pendingName = nameMatch[1].trim();
            return null;
        }

        const phoneLabelMatch = line.match(/^(tel[eé]fono|telefono)\s*:\s*(.+)$/i);
        if (phoneLabelMatch) {
            const phoneRaw = phoneLabelMatch[2].trim();
            const name = pendingName || '';
            pendingName = '';
            return { name, phone: phoneRaw };
        }

        const phoneMatch = line.match(/(?:\+?1[\s().-]*)?\d[\d\s().-]{6,}\d/);
        if (phoneMatch) {
            const phoneRaw = phoneMatch[0].trim();
            const name = line.replace(phoneRaw, '').replace(/[-,;|\t]+$/g, '').trim();
            return { name, phone: phoneRaw };
        }

        const parts = line.split(/[\t,;|]/).map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
            return { name: parts[0], phone: parts.slice(1).join(' ') };
        }

        const dashParts = line.split('-').map((part) => part.trim()).filter(Boolean);
        if (dashParts.length >= 2) {
            return { name: dashParts[0], phone: dashParts.slice(1).join('-') };
        }

        return { name: line, phone: '' };
    };

    lines.forEach((line) => {
        const item = parseLine(line);
        if (item) parsed.push(item);
    });

    if (pendingName) {
        parsed.push({ name: pendingName, phone: '' });
    }

    return parsed;
};

router.post('/ocr', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Archivo requerido' });
        }

        const mime = req.file.mimetype || '';
        const buffer = req.file.buffer;

        if (mime.includes('pdf')) {
            const parsed = await pdfParse(buffer);
            const text = String(parsed.text || '').trim();
            if (!text) {
                return res.status(400).json({ error: 'PDF sin texto. Convierte a imagen para OCR.' });
            }
            return res.json({ text });
        }

        const { data } = await Tesseract.recognize(buffer, 'eng+spa', {
            logger: () => null
        });
        const text = String(data?.text || '').trim();
        if (!text) {
            return res.status(400).json({ error: 'No se pudo extraer texto de la imagen' });
        }
        return res.json({ text });
    } catch (error) {
        console.error('Error OCR:', error);
        return res.status(500).json({ error: 'Error procesando OCR' });
    }
});

const parseFileRows = (rows = []) => {
    return rows
        .map((row) => ({
            name: normalizeValue(row?.name || row?.nombre || ''),
            phone: normalizeValue(row?.phone || row?.telefono || '')
        }))
        .filter((row) => row.name || row.phone);
};

const getExistingPhones = async () => {
    const rows = await db.prepare(`
        SELECT ContactoID, full_name, NombreCompleto, phone_digits, phone_e164, mobile_phone, Telefono
        FROM Contactos
    `).all();

    const map = new Map();
    rows.forEach((row) => {
        const candidates = [row.phone_digits, row.phone_e164, row.mobile_phone, row.Telefono].filter(Boolean);
        candidates.forEach((value) => {
            const digits = normalizePhoneDigits(value);
            if (!digits) return;
            map.set(digits, row);
        });
    });
    return map;
};

router.post('/import', async (req, res) => {
    try {
        const mode = normalizeValue(req.body.mode) || 'paste';
        const omitDuplicates = req.body.omitDuplicates !== false;
        const defaults = req.body.defaults || {};
        const rawText = normalizeValue(req.body.rawText);
        const fileRows = Array.isArray(req.body.fileRows) ? req.body.fileRows : [];

        const entries = mode === 'file' ? parseFileRows(fileRows) : parseRawText(rawText);
        if (!entries.length) {
            return res.status(400).json({ error: 'Texto requerido' });
        }

        const ownerId = defaults.ownerId || req.user?.UsuarioID || null;
        if (!ownerId) {
            return res.status(400).json({ error: 'Owner requerido' });
        }

        const statusRaw = String(defaults.status || 'NUEVO').trim().toUpperCase();
        const status = ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'CITA_AGENDADA', 'NO_INTERESA', 'NO_MOLESTAR']
            .includes(statusRaw) ? statusRaw : 'NUEVO';
        const source = normalizeValue(defaults.source) || (mode === 'file' ? 'CSV Import' : 'Lista pegada');
        const campaign = normalizeValue(defaults.campaign) || '';

        const existingMap = await getExistingPhones();
        const seen = new Set();

        const items = [];
        let inserted = 0;
        let skipped = 0;
        let invalid = 0;

        const tx = db.transaction(async () => {
            for (const entry of entries) {
                const name = normalizeValue(entry.name) || 'Sin nombre';
                const phone = buildPhone(entry.phone || '');
                const digits = phone.digits || '';
                const isValid = phone.isValid;

                let note = '';
                if (!isValid) {
                    invalid += 1;
                    note = 'Telefono invalido';
                    items.push({ name, phone_digits: digits, phone_e164: phone.e164, isValid, isDuplicate: false, note });
                    return;
                }

                const duplicate = seen.has(digits) || existingMap.has(digits);
                if (duplicate && omitDuplicates) {
                    skipped += 1;
                    seen.add(digits);
                    items.push({ name, phone_digits: digits, phone_e164: phone.e164, isValid, isDuplicate: true, note: 'Duplicado' });
                    return;
                }

                const existing = existingMap.get(digits);
                if (duplicate && existing && !omitDuplicates) {
                    const existingName = existing.full_name || existing.NombreCompleto || '';
                    const shouldUpdateName = !existingName || existingName === 'Sin nombre';
                    const updateValues = {
                        phone_digits: phone.digits,
                        phone_e164: phone.e164,
                        mobile_phone: digits,
                        Telefono: digits,
                        source: source,
                        source_name: source,
                    };
                    if (shouldUpdateName) {
                        updateValues.full_name = name;
                        updateValues.NombreCompleto = name;
                    }
                    const updateStmt = await buildContactoUpdate(db, updateValues);
                    await db.prepare(updateStmt.sql).run(...updateStmt.values, existing.ContactoID);
                    if (!existingMap.has(digits)) {
                        existingMap.set(digits, existing);
                    }
                    items.push({ name, phone_digits: digits, phone_e164: phone.e164, isValid, isDuplicate: true, note: 'Actualizado' });
                    seen.add(digits);
                    return;
                }

                const notesValue = campaign ? `[fs:campaign]${campaign}` : null;
                const insertValues = {
                    full_name: name,
                    mobile_phone: digits,
                    city: 'NO_DICE',
                    state: 'NO_DICE',
                    origin_type: source,
                    referred_by_type: 'NO_DICE',
                    referred_by_id: 0,
                    relationship_to_referrer: 'NO_DICE',
                    assigned_to_user_id: ownerId,
                    contact_status: status,
                    contact_allowed: 1,
                    notes: notesValue,
                    NombreCompleto: name,
                    Telefono: digits,
                    Direccion: null,
                    Ciudad: 'NO_DICE',
                    Estado: 'NO_DICE',
                    Pais: 'USA',
                    OrigenFuente: source,
                    ReferidoPorId: 0,
                    Convertido: 0,
                    source: source,
                    source_name: source,
                    phone_digits: phone.digits,
                    phone_e164: phone.e164
                };
                const insertStmt = await buildContactoInsert(db, insertValues);
                await db.prepare(insertStmt.sql).run(...insertStmt.values);

                inserted += 1;
                seen.add(digits);
                items.push({ name, phone_digits: digits, phone_e164: phone.e164, isValid, isDuplicate: false, note: '' });
            }
        });

        await tx();

        res.json({
            inserted,
            skipped_duplicates: skipped,
            invalid,
            items
        });
    } catch (error) {
        console.error('Error importing prospects:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

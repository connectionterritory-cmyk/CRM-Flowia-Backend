const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../services/SupabaseClient');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

let contactosMetaPromise = null;
let usuariosMetaPromise = null;
let clientesMetaPromise = null;

const resolveColumn = (columns, ...candidates) => {
    if (!columns || columns.size === 0) return candidates[0];
    for (const candidate of candidates) {
        if (columns.has(candidate)) return candidate;
    }
    return candidates[0];
};

const loadTableMeta = async (tableNames, fallbackTable) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('table_name,column_name')
        .eq('table_schema', 'public')
        .in('table_name', tableNames);

    if (error || !data || data.length === 0) {
        return { tableName: fallbackTable, columns: new Set() };
    }

    const counts = data.reduce((acc, row) => {
        acc[row.table_name] = (acc[row.table_name] || 0) + 1;
        return acc;
    }, {});

    const tableName = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])[0];

    const columns = new Set(
        data.filter((row) => row.table_name === tableName).map((row) => row.column_name)
    );

    return { tableName, columns };
};

const getContactosMeta = async () => {
    if (!contactosMetaPromise) {
        contactosMetaPromise = loadTableMeta(['contactos', 'Contactos'], 'contactos');
    }
    return contactosMetaPromise;
};

const getUsuariosMeta = async () => {
    if (!usuariosMetaPromise) {
        usuariosMetaPromise = loadTableMeta(['usuarios', 'Usuarios'], 'usuarios');
    }
    return usuariosMetaPromise;
};

const getClientesMeta = async () => {
    if (!clientesMetaPromise) {
        clientesMetaPromise = loadTableMeta(['clientes', 'Clientes'], 'clientes');
    }
    return clientesMetaPromise;
};

const filterPayload = (columns, values) => {
    if (!columns || columns.size === 0) return values;
    return Object.fromEntries(
        Object.entries(values).filter(([key, value]) => value !== undefined && columns.has(key))
    );
};

const getValue = (row, ...keys) => {
    for (const key of keys) {
        if (row && row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
};

const enrichContactos = async (contactos) => {
    if (!Array.isArray(contactos) || contactos.length === 0) return contactos;

    const supabase = getSupabaseClient();
    const usuariosMeta = await getUsuariosMeta();
    const clientesMeta = await getClientesMeta();
    const contactosMeta = await getContactosMeta();

    const assignedIds = Array.from(new Set(
        contactos
            .map((contacto) => getValue(contacto, 'assigned_to_user_id', 'AssignedToUserId', 'assigned_to_user_id'))
            .filter((id) => id !== null && id !== undefined)
    ));

    const usuariosIdColumn = resolveColumn(usuariosMeta.columns, 'usuarioid', 'UsuarioID');
    const usuariosNameColumn = resolveColumn(usuariosMeta.columns, 'nombre', 'Nombre');
    const usuariosMap = new Map();

    if (assignedIds.length > 0) {
        const { data: usuariosData } = await supabase
            .from(usuariosMeta.tableName)
            .select(`${usuariosIdColumn},${usuariosNameColumn}`)
            .in(usuariosIdColumn, assignedIds);

        (usuariosData || []).forEach((usuario) => {
            const id = usuario[usuariosIdColumn];
            const nombre = usuario[usuariosNameColumn];
            if (id !== undefined) usuariosMap.set(id, nombre);
        });
    }

    const referidosContactoIds = [];
    const referidosClienteIds = [];
    const referidosUsuarioIds = [];

    contactos.forEach((contacto) => {
        const tipo = String(getValue(contacto, 'referred_by_type', 'ReferredByType', 'referred_by_type') || '').toUpperCase();
        const referidoId = getValue(contacto, 'referred_by_id', 'ReferidoPorId', 'referred_by_id');
        if (!referidoId) return;
        if (tipo === 'CONTACTO') referidosContactoIds.push(referidoId);
        if (tipo === 'CLIENTE') referidosClienteIds.push(referidoId);
        if (tipo === 'USUARIO') referidosUsuarioIds.push(referidoId);
    });

    const contactoIdColumn = resolveColumn(contactosMeta.columns, 'contactoid', 'ContactoID');
    const contactoNameColumn = resolveColumn(contactosMeta.columns, 'full_name', 'NombreCompleto');
    const clienteIdColumn = resolveColumn(clientesMeta.columns, 'clienteid', 'ClienteID');
    const clienteNameColumn = resolveColumn(clientesMeta.columns, 'nombre', 'Nombre');

    const contactosMap = new Map();
    const clientesMap = new Map();

    if (referidosContactoIds.length > 0) {
        const { data: referidosContactos } = await supabase
            .from(contactosMeta.tableName)
            .select(`${contactoIdColumn},${contactoNameColumn}`)
            .in(contactoIdColumn, Array.from(new Set(referidosContactoIds)));

        (referidosContactos || []).forEach((row) => {
            const id = row[contactoIdColumn];
            const nombre = row[contactoNameColumn];
            if (id !== undefined) contactosMap.set(id, nombre);
        });
    }

    if (referidosClienteIds.length > 0) {
        const { data: referidosClientes } = await supabase
            .from(clientesMeta.tableName)
            .select(`${clienteIdColumn},${clienteNameColumn}`)
            .in(clienteIdColumn, Array.from(new Set(referidosClienteIds)));

        (referidosClientes || []).forEach((row) => {
            const id = row[clienteIdColumn];
            const nombre = row[clienteNameColumn];
            if (id !== undefined) clientesMap.set(id, nombre);
        });
    }

    if (referidosUsuarioIds.length > 0 && usuariosMap.size === 0) {
        const { data: referidosUsuarios } = await supabase
            .from(usuariosMeta.tableName)
            .select(`${usuariosIdColumn},${usuariosNameColumn}`)
            .in(usuariosIdColumn, Array.from(new Set(referidosUsuarioIds)));

        (referidosUsuarios || []).forEach((row) => {
            const id = row[usuariosIdColumn];
            const nombre = row[usuariosNameColumn];
            if (id !== undefined) usuariosMap.set(id, nombre);
        });
    }

    return contactos.map((contacto) => {
        const assignedId = getValue(contacto, 'assigned_to_user_id', 'AssignedToUserId', 'assigned_to_user_id');
        const tipo = String(getValue(contacto, 'referred_by_type', 'ReferredByType', 'referred_by_type') || '').toUpperCase();
        const referidoId = getValue(contacto, 'referred_by_id', 'ReferidoPorId', 'referred_by_id');
        let referidoNombre = null;

        if (tipo === 'CONTACTO') referidoNombre = contactosMap.get(referidoId) || null;
        if (tipo === 'CLIENTE') referidoNombre = clientesMap.get(referidoId) || null;
        if (tipo === 'USUARIO') referidoNombre = usuariosMap.get(referidoId) || null;

        return {
            ...contacto,
            AssignedToNombre: assignedId ? usuariosMap.get(assignedId) || null : null,
            ReferidoPorNombre: referidoNombre,
        };
    });
};

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
        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const like = `%${term}%`;
        const orderColumn = resolveColumn(meta.columns, 'updatedat', 'UpdatedAt');
        const searchColumns = new Set();

        ['full_name', 'NombreCompleto', 'mobile_phone', 'Telefono', 'Email', 'email']
            .forEach((column) => {
                if (!meta.columns || meta.columns.size === 0) {
                    searchColumns.add(column);
                } else if (meta.columns.has(column)) {
                    searchColumns.add(column);
                }
            });

        let query = supabase
            .from(meta.tableName)
            .select('*')
            .limit(limit);

        if (searchColumns.size > 0) {
            const filters = Array.from(searchColumns).map((column) => `${column}.ilike.${like}`);
            query = query.or(filters.join(','));
        }

        if (orderColumn) {
            query = query.order(orderColumn, { ascending: false });
        }

        const { data, error } = await query;
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const contactos = (data || []).map((row) => ({
            id: getValue(row, 'ContactoID', 'contactoid', 'id'),
            fullName: getValue(row, 'full_name', 'NombreCompleto'),
            mobilePhone: getValue(row, 'mobile_phone', 'Telefono'),
            email: getValue(row, 'email', 'Email'),
            address1: getValue(row, 'address1', 'Direccion'),
            address2: getValue(row, 'address2'),
            city: getValue(row, 'city', 'Ciudad'),
            state: getValue(row, 'state', 'Estado'),
            zip: getValue(row, 'zip_code', 'Zipcode'),
            country: getValue(row, 'country', 'Pais'),
            leadSource: getValue(row, 'origin_type', 'OrigenFuente'),
            referredById: getValue(row, 'referred_by_id', 'ReferidoPorId'),
            ownerUserId: getValue(row, 'assigned_to_user_id', 'AssignedToUserId'),
        }));

        res.json(contactos);
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

        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const orFilters = [];

        if (emailRaw) {
            const emailColumn = resolveColumn(meta.columns, 'email', 'Email');
            orFilters.push(`${emailColumn}.ilike.${emailRaw}`);
        }

        if (phone) {
            const phoneColumns = ['mobile_phone', 'Telefono', 'telefono', 'phone_digits'];
            phoneColumns.forEach((column) => {
                if (!meta.columns || meta.columns.size === 0 || meta.columns.has(column)) {
                    const value = column === 'phone_digits' ? phone : phoneRaw;
                    if (value) orFilters.push(`${column}.eq.${value}`);
                }
            });
        }

        if (orFilters.length === 0) {
            return res.json({ exists: false });
        }

        const { data, error } = await supabase
            .from(meta.tableName)
            .select('*')
            .or(orFilters.join(','))
            .limit(1);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const contacto = data && data.length > 0 ? data[0] : null;

        if (!contacto) {
            return res.json({ exists: false });
        }

        return res.json({
            exists: true,
            contact: {
                id: getValue(contacto, 'ContactoID', 'contactoid', 'id'),
                fullName: getValue(contacto, 'full_name', 'NombreCompleto'),
                mobilePhone: getValue(contacto, 'mobile_phone', 'Telefono'),
                email: getValue(contacto, 'email', 'Email'),
                city: getValue(contacto, 'city', 'Ciudad'),
                state: getValue(contacto, 'state', 'Estado'),
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET contactos
router.get('/', async (req, res) => {
    try {
        const { convertido, q } = req.query;
        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const convertedColumn = resolveColumn(meta.columns, 'convertido', 'Convertido');
        const createdColumn = resolveColumn(meta.columns, 'createdat', 'CreatedAt');

        let query = supabase.from(meta.tableName).select('*');

        if (convertido !== undefined) {
            query = query.eq(convertedColumn, convertido === 'true' ? 1 : 0);
        } else {
            query = query.eq(convertedColumn, 0);
        }

        if (q) {
            const term = `%${q}%`;
            const searchColumns = new Set();
            ['NombreCompleto', 'Telefono', 'Email', 'full_name', 'mobile_phone', 'email']
                .forEach((column) => {
                    if (!meta.columns || meta.columns.size === 0) {
                        searchColumns.add(column);
                    } else if (meta.columns.has(column)) {
                        searchColumns.add(column);
                    }
                });

            const filters = Array.from(searchColumns).map((column) => `${column}.ilike.${term}`);
            if (filters.length > 0) {
                query = query.or(filters.join(','));
            }
        }

        if (createdColumn) {
            query = query.order(createdColumn, { ascending: false });
        }

        const { data, error } = await query;
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const contactos = await enrichContactos(data || []);
        res.json(contactos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET contacto by id
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const idColumn = resolveColumn(meta.columns, 'contactoid', 'ContactoID');

        const { data, error } = await supabase
            .from(meta.tableName)
            .select('*')
            .eq(idColumn, req.params.id)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data) return res.status(404).json({ error: 'Contacto no encontrado' });

        const [contacto] = await enrichContactos([data]);
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

        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();

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
            const orFilters = [];
            if (emailValue) {
                const emailColumn = resolveColumn(meta.columns, 'email', 'Email');
                orFilters.push(`${emailColumn}.ilike.${emailValue.toLowerCase()}`);
            }
            if (phoneNormalized) {
                const phoneColumns = ['mobile_phone', 'Telefono', 'telefono', 'phone_digits'];
                phoneColumns.forEach((column) => {
                    if (!meta.columns || meta.columns.size === 0 || meta.columns.has(column)) {
                        const value = column === 'phone_digits' ? phoneNormalized : phoneValue;
                        if (value) orFilters.push(`${column}.eq.${value}`);
                    }
                });
            }

            if (orFilters.length > 0) {
                const { data: duplicates, error } = await supabase
                    .from(meta.tableName)
                    .select('ContactoID')
                    .or(orFilters.join(','))
                    .limit(1);

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                if (duplicates && duplicates.length > 0) {
                    const duplicateId = getValue(duplicates[0], 'ContactoID', 'contactoid');
                    return res.status(409).json({ error: 'Contacto ya existe', contactId: duplicateId });
                }
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

        const filteredInsertValues = filterPayload(meta.columns, insertValues);
        const idColumn = resolveColumn(meta.columns, 'contactoid', 'ContactoID');
        const { data, error } = await supabase
            .from(meta.tableName)
            .insert(filteredInsertValues)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            const constraintError = buildContactosConstraintError(error);
            if (constraintError) {
                return res.status(400).json({ error: constraintError });
            }
            return res.status(500).json({ error: error.message });
        }

        const createdId = data?.[idColumn] ?? data?.ContactoID ?? data?.contactoid;

        res.status(201).json({ id: createdId, message: 'Contacto creado' });
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
        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const idColumn = resolveColumn(meta.columns, 'contactoid', 'ContactoID');

        const { data: existing, error: existingError } = await supabase
            .from(meta.tableName)
            .select('*')
            .eq(idColumn, req.params.id)
            .maybeSingle();

        if (existingError) {
            return res.status(500).json({ error: existingError.message });
        }

        if (!existing) return res.status(404).json({ error: 'Contacto no encontrado' });

        const payload = {};
        const setField = (column, value) => {
            if (value !== null && value !== undefined) payload[column] = value;
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
            setField('full_name', fullNameValue);
            setField('NombreCompleto', fullNameValue);
        }
        if (phoneValue !== null) {
            setField('mobile_phone', phoneValue);
            setField('Telefono', phoneValue);
        }
        if (emailValue !== null) {
            setField('Email', emailValue);
            setField('email', emailValue);
        }
        if (address1Value !== null) {
            setField('address1', address1Value);
            setField('Direccion', address1Value);
        }
        if (address2Value !== null) {
            setField('address2', address2Value);
        }
        if (cityValue !== null) {
            setField('city', cityValue);
            setField('Ciudad', cityValue);
        }
        if (stateValue !== null) {
            setField('state', stateValue);
            setField('Estado', stateValue);
        }
        if (zipValue !== null) {
            setField('zip_code', zipValue);
            setField('Zipcode', zipValue);
        }
        if (countryValue !== null) {
            setField('country', countryValue);
            setField('Pais', countryValue);
        }
        if (maritalValue !== null) {
            setField('marital_status', maritalValue);
            setField('EstadoCivil', maritalValue);
        }
        if (homeOwnershipValue !== null) {
            setField('home_ownership', homeOwnershipValue);
        }
        if (bothWorkValue !== null) {
            setField('both_work', bothWorkValue);
            setField('TrabajaActualmente', bothWorkValue);
        }
        if (knowsRoyalValue !== null) {
            setField('knows_royal_prestige', knowsRoyalValue);
        }
        if (statusValue !== null) {
            setField('contact_status', statusValue);
        }
        if (allowedValue !== null) {
            setField('contact_allowed', allowedValue);
        }
        if (hasChildrenValue !== null) {
            setField('has_children', hasChildrenValue);
        }
        if (childrenCountValue !== undefined) {
            setField('children_count', childrenCountValue);
        }
        if (notesValue !== null) {
            setField('notes', notesValue);
        }
        if (spouseNameValue !== null) {
            setField('NombrePareja', spouseNameValue);
        }
        if (relationshipValue !== null) {
            setField('relationship_to_referrer', relationshipValue);
        }
        if (originTypeValue !== null) {
            setField('origin_type', originTypeValue);
            setField('OrigenFuente', originTypeValue);
        }
        if (sourceValue !== null) {
            setField('source', sourceValue);
        }
        if (sourceNameValue !== null) {
            setField('source_name', sourceNameValue);
        }
        if (referredByTypeValue !== null) {
            setField('referred_by_type', referredByTypeValue);
        }
        if (referredByIdValue !== null) {
            setField('referred_by_id', referredByIdValue);
            if (referredByTypeValue === 'CONTACTO') {
                setField('ReferidoPorId', referredByIdValue);
            }
        }
        if (assignedUserIdValue !== null) {
            setField('assigned_to_user_id', assignedUserIdValue);
        }

        if (meta.columns && meta.columns.size > 0) {
            const updatedAtColumn = resolveColumn(meta.columns, 'updatedat', 'UpdatedAt');
            if (updatedAtColumn) {
                setField(updatedAtColumn, new Date().toISOString());
            }
        }

        const filteredPayload = filterPayload(meta.columns, payload);
        if (!filteredPayload || Object.keys(filteredPayload).length === 0) {
            return res.json({ message: 'Sin cambios' });
        }

        const { data: updated, error } = await supabase
            .from(meta.tableName)
            .update(filteredPayload)
            .eq(idColumn, req.params.id)
            .select('*')
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

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

        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const idColumn = resolveColumn(meta.columns, 'contactoid', 'ContactoID');

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

        if (meta.columns && meta.columns.size > 0) {
            const updatedAtColumn = resolveColumn(meta.columns, 'updatedat', 'UpdatedAt');
            if (updatedAtColumn) {
                updateValues[updatedAtColumn] = new Date().toISOString();
            }
        }

        const filteredUpdateValues = filterPayload(meta.columns, updateValues);
        const { data, error } = await supabase
            .from(meta.tableName)
            .update(filteredUpdateValues)
            .eq(idColumn, req.params.id)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            const constraintError = buildContactosConstraintError(error);
            if (constraintError) {
                return res.status(400).json({ error: constraintError });
            }
            return res.status(500).json({ error: error.message });
        }

        if (!data) return res.status(404).json({ error: 'Contacto no encontrado' });

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
        const supabase = getSupabaseClient();
        const meta = await getContactosMeta();
        const idColumn = resolveColumn(meta.columns, 'contactoid', 'ContactoID');

        const { data, error } = await supabase
            .from(meta.tableName)
            .delete()
            .eq(idColumn, req.params.id)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data) return res.status(404).json({ error: 'Contacto no encontrado' });

        res.json({ message: 'Contacto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

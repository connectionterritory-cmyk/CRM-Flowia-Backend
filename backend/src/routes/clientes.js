const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../services/SupabaseClient');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);

let clientesMetaPromise = null;
let cuentaMetaPromise = null;

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

const getClientesMeta = async () => {
    if (!clientesMetaPromise) {
        clientesMetaPromise = loadTableMeta(['clientes', 'Clientes'], 'clientes');
    }
    return clientesMetaPromise;
};

const getCuentaMeta = async () => {
    if (!cuentaMetaPromise) {
        cuentaMetaPromise = loadTableMeta(['cuentarp', 'CuentaRP'], 'cuentarp');
    }
    return cuentaMetaPromise;
};

// GET all clients (summary via view)
router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        const supabase = getSupabaseClient();
        const meta = await getClientesMeta();
        const nameColumn = resolveColumn(meta.columns, 'nombre', 'Nombre');
        const phoneColumn = resolveColumn(meta.columns, 'telefono', 'Telefono');
        const emailColumn = resolveColumn(meta.columns, 'email', 'Email');
        const idColumn = resolveColumn(meta.columns, 'clienteid', 'ClienteID');

        let query = supabase.from(meta.tableName).select('*');

        if (q) {
            const term = `%${q}%`;
            const filters = [nameColumn, phoneColumn, emailColumn]
                .filter(Boolean)
                .map((column) => `${column}.ilike.${term}`);
            if (filters.length > 0) {
                query = query.or(filters.join(','));
            }
        }

        if (idColumn) {
            query = query.order(idColumn, { ascending: false });
        }

        const { data, error } = await query;
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single client
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabaseClient();
        const meta = await getClientesMeta();
        const idColumn = resolveColumn(meta.columns, 'clienteid', 'ClienteID');

        const { data: cliente, error } = await supabase
            .from(meta.tableName)
            .select('*')
            .eq(idColumn, req.params.id)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

        const cuentaMeta = await getCuentaMeta();
        const cuentaIdColumn = resolveColumn(cuentaMeta.columns, 'clienteid', 'ClienteID');
        const { data: cuenta, error: cuentaError } = await supabase
            .from(cuentaMeta.tableName)
            .select('*')
            .eq(cuentaIdColumn, req.params.id)
            .maybeSingle();

        if (cuentaError) {
            return res.status(500).json({ error: cuentaError.message });
        }

        res.json({ ...cliente, cuenta: cuenta || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new client
router.post('/', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, TipoCliente } = req.body;

        if (!Ciudad) {
            return res.status(400).json({ error: 'Ciudad es obligatoria' });
        }

        if (!EstadoProvincia) {
            return res.status(400).json({ error: 'Estado/Provincia es obligatorio' });
        }

        const paisValue = Pais || 'USA';
        if (paisValue === 'USA' && !Zipcode) {
            return res.status(400).json({ error: 'ZIP Code es obligatorio para USA' });
        }
        const supabase = getSupabaseClient();
        const meta = await getClientesMeta();
        const idColumn = resolveColumn(meta.columns, 'clienteid', 'ClienteID');

        const payload = {};
        const setIf = (value, ...candidates) => {
            const column = resolveColumn(meta.columns, ...candidates);
            if (value !== undefined) payload[column] = value;
        };

        setIf(Nombre, 'nombre', 'Nombre');
        setIf(Telefono, 'telefono', 'Telefono');
        setIf(Email, 'email', 'Email');
        setIf(Direccion, 'direccion', 'Direccion');
        setIf(Ciudad, 'ciudad', 'Ciudad');
        setIf(EstadoProvincia, 'estadoprovincia', 'EstadoProvincia');
        setIf(Zipcode || null, 'zipcode', 'Zipcode');
        setIf(paisValue, 'pais', 'Pais');
        setIf(TipoCliente || 'Residencial', 'tipocliente', 'TipoCliente');

        const { data, error } = await supabase
            .from(meta.tableName)
            .insert(payload)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const createdId = data?.[idColumn] ?? data?.ClienteID ?? data?.clienteid;

        if (createdId) {
            const cuentaMeta = await getCuentaMeta();
            const cuentaPayload = {};
            const cuentaIdColumn = resolveColumn(cuentaMeta.columns, 'clienteid', 'ClienteID');
            cuentaPayload[cuentaIdColumn] = createdId;

            const { error: cuentaError } = await supabase
                .from(cuentaMeta.tableName)
                .insert(cuentaPayload);
            if (cuentaError) {
                return res.status(500).json({ error: cuentaError.message });
            }
        }

        res.json({ id: createdId, message: 'Cliente creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update client
router.put('/:id', checkRole('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING'), async (req, res) => {
    try {
        const { Nombre, Telefono, Email, Direccion, Ciudad, EstadoProvincia, Zipcode, Pais, Estado, TipoCliente } = req.body;

        if (!Ciudad) {
            return res.status(400).json({ error: 'Ciudad es obligatoria' });
        }

        if (!EstadoProvincia) {
            return res.status(400).json({ error: 'Estado/Provincia es obligatorio' });
        }

        const paisValue = Pais || 'USA';
        if (paisValue === 'USA' && !Zipcode) {
            return res.status(400).json({ error: 'ZIP Code es obligatorio para USA' });
        }
        const supabase = getSupabaseClient();
        const meta = await getClientesMeta();
        const idColumn = resolveColumn(meta.columns, 'clienteid', 'ClienteID');

        const payload = {};
        const setIf = (value, ...candidates) => {
            const column = resolveColumn(meta.columns, ...candidates);
            if (value !== undefined) payload[column] = value;
        };

        setIf(Nombre, 'nombre', 'Nombre');
        setIf(Telefono, 'telefono', 'Telefono');
        setIf(Email, 'email', 'Email');
        setIf(Direccion, 'direccion', 'Direccion');
        setIf(Ciudad, 'ciudad', 'Ciudad');
        setIf(EstadoProvincia, 'estadoprovincia', 'EstadoProvincia');
        setIf(Zipcode || null, 'zipcode', 'Zipcode');
        setIf(paisValue, 'pais', 'Pais');
        setIf(Estado, 'estado', 'Estado');
        setIf(TipoCliente, 'tipocliente', 'TipoCliente');

        const { data, error } = await supabase
            .from(meta.tableName)
            .update(payload)
            .eq(idColumn, req.params.id)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE client (admin only)
router.delete('/:id', checkRole('DISTRIBUIDOR'), async (req, res) => {
    try {
        const supabase = getSupabaseClient();
        const meta = await getClientesMeta();
        const idColumn = resolveColumn(meta.columns, 'clienteid', 'ClienteID');

        const { data, error } = await supabase
            .from(meta.tableName)
            .delete()
            .eq(idColumn, req.params.id)
            .select(idColumn)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!data) return res.status(404).json({ error: 'Cliente no encontrado' });

        res.json({ message: 'Cliente eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

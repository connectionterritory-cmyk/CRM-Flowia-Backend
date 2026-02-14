const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getSupabaseClient } = require('./services/SupabaseClient');
require('dotenv').config();

const app = express();
const getSupabaseEnvStatus = () => ({
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
    supabaseKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    corsOrigin: process.env.CORS_ORIGIN || '',
});
const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const defaultAllowedOrigins = ['https://crm.flowiadigital.com'];
if (process.env.NODE_ENV !== 'production') {
    defaultAllowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
}
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, false);
        if (allowedOrigins.includes(origin)) return callback(null, origin);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self' blob: data:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*;"
        );
        next();
    });
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const requireDiagToken = (req, res, next) => {
    const expected = process.env.ADMIN_DIAG_TOKEN;
    if (!expected) {
        return res.status(503).json({ error: 'Diagnostico no configurado' });
    }
    const authHeader = req.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = req.get('x-admin-token') || req.query.token || bearerToken;
    if (!token || token !== expected) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    return next();
};

// Routes (Placeholder)
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/api/diag/health-db', requireDiagToken, async (req, res) => {
    const startedAt = Date.now();
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('usuarios')
            .select('codigo')
            .limit(1);

        if (error) {
            throw error;
        }

        return res.json({
            ok: true,
            db: 'up',
            latency_ms: Date.now() - startedAt,
        });
    } catch (error) {
        console.error('[DIAG_HEALTH_DB_FAIL]', {
            message: error?.message,
            errorCode: error?.code,
            detail: error?.detail,
            status: error?.status,
            stack: error?.stack,
        });
        return res.json({ ok: true, db: 'down', latency_ms: Date.now() - startedAt });
    }
});
// Import Routes
const clientesRouter = require('./routes/clientes');
const cuentasRouter = require('./routes/cuentas');
const ordenesRouter = require('./routes/ordenes');
const transaccionesRouter = require('./routes/transacciones');
const notasRouter = require('./routes/notas');
const mensajesRouter = require('./routes/mensajes');
const dashboardRouter = require('./routes/dashboard');
const importRouter = require('./routes/import');
const authRouter = require('./routes/auth');
const usuariosRouter = require('./routes/usuarios');
const programasRouter = require('./routes/programas');
const contactosRouter = require('./routes/contactos');
const catalogosRouter = require('./routes/catalogos');
const referralsRouter = require('./routes/referrals');
const programasVisitaRouter = require('./routes/programas_visita');
const asesoresRouter = require('./routes/asesores');
const prospectsRouter = require('./routes/prospects');

app.use('/api/clientes', clientesRouter);
app.use('/api/cuentas', cuentasRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/transacciones', transaccionesRouter);
app.use('/api/notas', notasRouter);
app.use('/api/mensajes', mensajesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importRouter);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/users', usuariosRouter);
app.use('/api/programas', programasRouter);
app.use('/api/contactos', contactosRouter);
app.use('/api/contacts', contactosRouter);
app.use('/api/catalogos', catalogosRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/programs', programasVisitaRouter);
app.use('/api/asesores', asesoresRouter);
app.use('/api/prospects', prospectsRouter);

const oportunidadesRoutes = require('./routes/oportunidades');
const pipelineRoutes = require('./routes/pipeline');
const origenesRoutes = require('./routes/origenes');

app.use('/api/oportunidades', oportunidadesRoutes);
app.use('/api/opportunities', oportunidadesRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/origenes', origenesRoutes);

// Serve static files from data (for images if needed)
app.use('/data', express.static(path.join(__dirname, '../data')));

const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    const envStatus = getSupabaseEnvStatus();
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(
        `[ENV] supabaseUrlPresent=${envStatus.supabaseUrlPresent} ` +
        `supabaseKeyPresent=${envStatus.supabaseKeyPresent} ` +
        `corsOrigin=${envStatus.corsOrigin || '(not set)'}`
    );
    console.log('Database: Supabase HTTPS (PostgREST)');
    console.log('Legacy database.js disabled (no TCP connection).');
});

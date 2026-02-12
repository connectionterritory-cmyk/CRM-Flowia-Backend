const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

router.use(auth);

const TELEMARKETING_ETAPAS = [
    'NUEVO_LEAD',
    'INTENTO_CONTACTO',
    'CONTACTADO',
    'CALIFICACION'
];

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

// GET /api/pipeline/stats
router.get('/stats', async (req, res) => {
    try {
        const estadoCierre = req.query.estadoCierre || 'Activo';
        const teleOwners = isTelemarketing(req) ? await getTelemarketingOwnerIds(req) : [];
        const ownerFilter = !isDistribuidor(req)
            ? (isTelemarketing(req)
                ? (teleOwners.length > 0
                    ? ` AND OwnerUserID IN (${teleOwners.map(() => '?').join(',')})`
                    : ' AND 1=0')
                : ' AND OwnerUserID = ?')
            : '';
        const ownerParams = !isDistribuidor(req)
            ? (isTelemarketing(req)
                ? teleOwners
                : [req.user.UsuarioID])
            : [];
        const teleFilter = isTelemarketing(req)
            ? ` AND Etapa IN (${TELEMARKETING_ETAPAS.map(() => '?').join(',')})`
            : '';
        const teleParams = isTelemarketing(req) ? TELEMARKETING_ETAPAS : [];
        const estadoFilter = estadoCierre
            ? ' AND (EstadoCierre = ? OR EstadoCierre IS NULL)'
            : '';
        const estadoParams = estadoCierre ? [estadoCierre] : [];

        const baseFilter = `WHERE 1=1${ownerFilter}${teleFilter}${estadoFilter}`;
        const baseParams = [...ownerParams, ...teleParams, ...estadoParams];

        // Stats por etapa
        const statsPorEtapa = await db.prepare(`
      SELECT
        Etapa,
        COUNT(*) AS Total,
        0 AS ValorTotal,
        0 AS ValorPromedio,
        COUNT(CASE WHEN FechaProximaAccion <= current_date THEN 1 END) AS AccionesVencidas
      FROM Oportunidades
      ${baseFilter}
      GROUP BY Etapa
      ORDER BY 
        CASE Etapa
          WHEN 'NUEVO_LEAD' THEN 1
          WHEN 'INTENTO_CONTACTO' THEN 2
          WHEN 'CONTACTADO' THEN 3
          WHEN 'CALIFICACION' THEN 4
          WHEN 'CITA_AGENDADA' THEN 5
          WHEN 'DEMO_REALIZADA' THEN 6
          WHEN 'PROPUESTA' THEN 7
          WHEN 'SEGUIMIENTO' THEN 8
          ELSE 9
        END
    `).all(...baseParams);

        // Conversiones
        const conversiones = await db.prepare(`
      SELECT
        COUNT(CASE WHEN Etapa IN ('CONTACTADO', 'CALIFICACION', 'CITA_AGENDADA', 'DEMO_REALIZADA', 'PROPUESTA', 'SEGUIMIENTO', 'CIERRE_GANADO') THEN 1 END) as Contactados,
        COUNT(CASE WHEN Etapa IN ('CALIFICACION', 'CITA_AGENDADA', 'DEMO_REALIZADA', 'PROPUESTA', 'SEGUIMIENTO', 'CIERRE_GANADO') THEN 1 END) as Calificados,
        COUNT(CASE WHEN Etapa IN ('CITA_AGENDADA', 'DEMO_REALIZADA', 'PROPUESTA', 'SEGUIMIENTO', 'CIERRE_GANADO') THEN 1 END) as Citas,
        COUNT(CASE WHEN Etapa = 'CIERRE_GANADO' THEN 1 END) as Ganados,
        COUNT(CASE WHEN Etapa = 'CIERRE_PERDIDO' THEN 1 END) as Perdidos,
        0 as ValorGanado
      FROM Oportunidades
      ${baseFilter}
    `).get(...baseParams);

        // Tasa de conversión
        const totalOportunidades = await db.prepare(`
      SELECT COUNT(*) as Total FROM Oportunidades
      ${baseFilter}
    `).get(...baseParams);

        const totalValor = await db.prepare(`
        SELECT 0 as TotalValor FROM Oportunidades
      ${baseFilter}
    `).get(...baseParams);

        const tasaConversion = totalOportunidades.Total > 0
            ? ((conversiones.Ganados / totalOportunidades.Total) * 100).toFixed(2)
            : 0;

        res.json({
            total_oportunidades: totalOportunidades.Total || 0,
            total_valor_estimado: totalValor.TotalValor || 0,
            por_etapa: (statsPorEtapa || []).map((row) => ({
                etapa: row.Etapa,
                count: row.Total || 0,
                value: row.ValorTotal || 0,
            })),
            statsPorEtapa: statsPorEtapa || [],
            conversiones: {
                ...(conversiones || {
                    Contactados: 0,
                    Calificados: 0,
                    Citas: 0,
                    Ganados: 0,
                    Perdidos: 0,
                    ValorGanado: 0,
                }),
                tasaConversion: parseFloat(tasaConversion)
            },
            totalOportunidades: totalOportunidades.Total || 0
        });
    } catch (error) {
        console.error('❌ [PIPELINE/STATS] Error:', error.message, error.stack);
        res.status(500).json({
            error: 'Error al obtener stats de pipeline',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            total_oportunidades: 0,
            total_valor_estimado: 0,
            por_etapa: [],
            statsPorEtapa: [],
            conversiones: {
                Contactados: 0,
                Calificados: 0,
                Citas: 0,
                Ganados: 0,
                Perdidos: 0,
                ValorGanado: 0,
                tasaConversion: 0,
            },
            totalOportunidades: 0,
        });
    }
});

// GET /api/pipeline/kanban
router.get('/kanban', async (req, res) => {
    try {
        const estadoCierre = req.query.estadoCierre || 'Activo';
        const etapasActivas = isTelemarketing(req) ? TELEMARKETING_ETAPAS : [
            'NUEVO_LEAD',
            'INTENTO_CONTACTO',
            'CONTACTADO',
            'CALIFICACION',
            'CITA_AGENDADA',
            'DEMO_REALIZADA',
            'PROPUESTA',
            'SEGUIMIENTO'
        ];

        const kanbanData = {};
        const requestedOwner = req.query.ownerId;
        const requestedOrigen = req.query.origenId;
        const teleOwners = isTelemarketing(req) ? await getTelemarketingOwnerIds(req) : [];
        const teleOwnerAllowed = !isTelemarketing(req)
            || (!requestedOwner && teleOwners.length > 0)
            || (requestedOwner && teleOwners.includes(Number(requestedOwner)));

        for (const etapa of etapasActivas) {
            if (isTelemarketing(req) && !teleOwnerAllowed) {
                kanbanData[etapa] = [];
                continue;
            }

            const oportunidadesRaw = await db.prepare(`
        SELECT
          o.*,
          COALESCE(ct.NombreCompleto, ct.full_name, cl.Nombre) as ContactoNombre,
          COALESCE(ct.Telefono, ct.mobile_phone, cl.Telefono) as ContactoTelefono,
          COALESCE(ct.Email, cl.Email) as ContactoEmail,
          COALESCE(ct.Ciudad, ct.city, cl.Ciudad) as ContactoCiudad,
          COALESCE(ct.Direccion, ct.address1, cl.Direccion) as ContactoDireccion,
          ct.source_name as contact_source_name,
          ct.source as contact_source,
          u.Nombre as OwnerNombre
        FROM Oportunidades o
        LEFT JOIN Contactos ct ON o.ContactoID = ct.ContactoID
        LEFT JOIN Clientes cl ON o.ClienteID = cl.ClienteID
        LEFT JOIN Usuarios u ON o.OwnerUserID = u.UsuarioID
        WHERE o.Etapa = ?
        ${!isDistribuidor(req) && !isTelemarketing(req) ? 'AND o.OwnerUserID = ?' : ''}
        ${isTelemarketing(req) && teleOwners.length > 0 ? `AND o.OwnerUserID IN (${teleOwners.map(() => '?').join(',')})` : ''}
        ${isDistribuidor(req) && requestedOwner ? 'AND o.OwnerUserID = ?' : ''}
        ${isTelemarketing(req) && requestedOwner ? 'AND o.OwnerUserID = ?' : ''}
        ${requestedOrigen ? 'AND o.OrigenID = ?' : ''}
        ${estadoCierre ? 'AND (o.EstadoCierre = ? OR o.EstadoCierre IS NULL)' : ''}
        ORDER BY o.FechaProximaAccion ASC NULLS LAST, o.UpdatedAt DESC
      `).all(...(!isDistribuidor(req)
                ? [
                    etapa,
                    ...(isTelemarketing(req)
                        ? [...teleOwners, ...(requestedOwner ? [requestedOwner] : [])]
                        : [req.user.UsuarioID]),
                    ...(requestedOrigen ? [requestedOrigen] : []),
                    ...(estadoCierre ? [estadoCierre] : [])
                ]
                : [
                    etapa,
                    ...(requestedOwner ? [requestedOwner] : []),
                    ...(requestedOrigen ? [requestedOrigen] : []),
                    ...(estadoCierre ? [estadoCierre] : [])
                ]
            ));

            const oportunidades = (oportunidadesRaw || []).map((oportunidad) => ({
                ...oportunidad,
                source_display: oportunidad.source_name
                    || oportunidad.source
                    || oportunidad.contact_source_name
                    || 'Sin origen',
            }));

            kanbanData[etapa] = oportunidades;
        }

        res.json(kanbanData);
    } catch (error) {
        console.error('❌ [PIPELINE/KANBAN] Error:', error.message, error.stack);
        res.status(500).json({
            error: 'Error al obtener datos de kanban',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

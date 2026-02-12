const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const ETAPAS_VALIDAS = [
    'NUEVO_LEAD',
    'INTENTO_CONTACTO',
    'CONTACTADO',
    'CALIFICACION',
    'CITA_AGENDADA',
    'DEMO_REALIZADA',
    'PROPUESTA',
    'SEGUIMIENTO',
    'CIERRE_GANADO',
    'CIERRE_PERDIDO'
];

class Oportunidad {
    static async getAll(filters = {}) {
        let query = `
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
      WHERE 1=1
    `;
        const params = [];

        if (filters.etapa) {
            query += ' AND o.Etapa = ?';
            params.push(filters.etapa);
        }

        if (Array.isArray(filters.ownerUserIds)) {
            if (filters.ownerUserIds.length === 0) {
                query += ' AND 1=0';
            } else {
                const placeholders = filters.ownerUserIds.map(() => '?').join(',');
                query += ` AND o.OwnerUserID IN (${placeholders})`;
                params.push(...filters.ownerUserIds);
            }
        } else if (filters.ownerUserId) {
            query += ' AND o.OwnerUserID = ?';
            params.push(filters.ownerUserId);
        }

        if (filters.origenId) {
            query += ' AND o.OrigenID = ?';
            params.push(filters.origenId);
        }

        if (filters.productoInteres) {
            query += ' AND o.ProductoInteres LIKE ?';
            params.push(`%${filters.productoInteres}%`);
        }

        if (filters.excludeEtapas) {
            const placeholders = filters.excludeEtapas.map(() => '?').join(',');
            query += ` AND o.Etapa NOT IN (${placeholders})`;
            params.push(...filters.excludeEtapas);
        }

        if (filters.estadoCierre) {
            query += ' AND o.EstadoCierre = ?';
            params.push(filters.estadoCierre);
        }

        query += ' ORDER BY o.FechaProximaAccion ASC NULLS LAST, o.UpdatedAt DESC';

        const stmt = db.prepare(query);
        return await stmt.all(...params);
    }

    static async getById(id) {
        const stmt = db.prepare(`
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
    `);
        return await stmt.get(id);
    }

    static async create(data) {
        const id = uuidv4();
        const stmt = db.prepare(`
      INSERT INTO Oportunidades (
        OportunidadID,
        ContactoID,
        ClienteID,
        OrigenID,
        source,
        source_name,
        Etapa,
        ProductoInteres,
        FechaCita,
        ProximaAccion,
        FechaProximaAccion,
        OwnerUserID,
        assigned_to_user_id,
        EstadoCierre,
        ProximoContactoFecha,
        MotivoNoInteresado,
        ReferidoPor,
        ReferidoPorTipo,
        ReferidoPorId,
        ProgramaID,
        ProgramaTipo,
        EstadoCivil,
        NombrePareja,
        TrabajaActualmente,
        MejorHoraContacto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        await stmt.run(
            id,
            data.contactoId || null,
            data.clienteId || null,
            data.origenId || null,
            data.source || null,
            data.source_name || null,
            data.etapa || 'NUEVO_LEAD',
            data.productoInteres || null,
            data.fechaCita || null,
            data.proximaAccion || null,
            data.fechaProximaAccion || null,
            data.ownerUserId || null,
            data.assigned_to_user_id || data.ownerUserId || null,
            data.estadoCierre || 'Activo',
            data.proximoContactoFecha || null,
            data.motivoNoInteresado || null,
            data.referidoPor || null,
            data.referidoPorTipo || null,
            data.referidoPorId || null,
            data.programaId || null,
            data.programaTipo || null,
            data.estadoCivil || null,
            data.nombrePareja || null,
            data.trabajaActualmente || null,
            data.mejorHoraContacto || null
        );

        return await this.getById(id);
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            'ContactoID',
            'ClienteID',
            'OrigenID',
            'source',
            'source_name',
            'ProductoInteres',
            'FechaCita',
            'ProximaAccion',
            'FechaProximaAccion',
            'OwnerUserID',
            'assigned_to_user_id',
            'EstadoCierre',
            'ProximoContactoFecha',
            'MotivoNoInteresado',
            'ReferidoPor',
            'ReferidoPorTipo',
            'ReferidoPorId',
            'ProgramaID',
            'ProgramaTipo',
            'EstadoCivil',
            'NombrePareja',
            'TrabajaActualmente',
            'MejorHoraContacto',
            'RomperHielo',
            'RegaloVisitaEntregado',
            'DemoCompletada',
            'ProgramaVisitaID'
        ];

        allowedFields.forEach(field => {
            const camelField = field.charAt(0).toLowerCase() + field.slice(1);
            if (data[camelField] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[camelField]);
            }
        });

        if (fields.length === 0) {
            return await this.getById(id);
        }

        values.push(id);
        const query = `UPDATE Oportunidades SET ${fields.join(', ')} WHERE OportunidadID = ?`;
        const stmt = db.prepare(query);
        await stmt.run(...values);

        return await this.getById(id);
    }

    static async updateEtapa(id, etapa, additionalData = {}) {
        if (!ETAPAS_VALIDAS.includes(etapa)) {
            throw new Error(`Etapa inválida: ${etapa}`);
        }

        const updates = ['Etapa = ?'];
        const values = [etapa];

        // Validaciones por etapa
        if (etapa === 'CITA_AGENDADA') {
            if (!additionalData.fechaCita) {
                throw new Error('CITA_AGENDADA requiere fechaCita');
            }
            updates.push('FechaCita = ?');
            values.push(additionalData.fechaCita);
        }

        if (etapa === 'SEGUIMIENTO') {
            if (!additionalData.fechaProximaAccion) {
                throw new Error('SEGUIMIENTO requiere fechaProximaAccion');
            }
            updates.push('ProximaAccion = ?', 'FechaProximaAccion = ?');
            values.push(additionalData.proximaAccion || 'Seguimiento pendiente', additionalData.fechaProximaAccion);
        }

        if (etapa === 'CIERRE_PERDIDO') {
            if (!additionalData.razonPerdida) {
                throw new Error('CIERRE_PERDIDO requiere razonPerdida');
            }
            updates.push('RazonPerdida = ?');
            values.push(additionalData.razonPerdida);
        }

        values.push(id);
        const query = `UPDATE Oportunidades SET ${updates.join(', ')} WHERE OportunidadID = ?`;
        const stmt = db.prepare(query);
        await stmt.run(...values);

        return await this.getById(id);
    }

    static async delete(id) {
        const stmt = db.prepare('DELETE FROM Oportunidades WHERE OportunidadID = ?');
        return await stmt.run(id);
    }

    static async getByContacto(contactoId) {
        const stmt = db.prepare('SELECT * FROM Oportunidades WHERE ContactoID = ? ORDER BY CreatedAt DESC');
        return await stmt.all(contactoId);
    }

    static async getByCliente(clienteId) {
        const stmt = db.prepare('SELECT * FROM Oportunidades WHERE ClienteID = ? ORDER BY CreatedAt DESC');
        return await stmt.all(clienteId);
    }
}

module.exports = Oportunidad;

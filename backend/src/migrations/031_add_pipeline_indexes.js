const db = require('../config/database');

module.exports = {
    up: async () => {
        console.log('📊 Adding indexes for pipeline performance...');

        // Composite index for main kanban query
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa_owner 
            ON Oportunidades(Etapa, OwnerUserID);
        `);

        // Index for EstadoCierre filter
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_oportunidades_estado_cierre 
            ON Oportunidades(EstadoCierre);
        `);

        // Index for sorting by FechaProximaAccion
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_oportunidades_fecha_proxima 
            ON Oportunidades(FechaProximaAccion);
        `);

        // Index for JOIN with Contactos
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_oportunidades_contacto 
            ON Oportunidades(ContactoID);
        `);

        console.log('✅ Pipeline indexes created successfully');
    },

    down: async () => {
        console.log('🗑️ Removing pipeline indexes...');
        await db.execAsync('DROP INDEX IF EXISTS idx_oportunidades_etapa_owner');
        await db.execAsync('DROP INDEX IF EXISTS idx_oportunidades_estado_cierre');
        await db.execAsync('DROP INDEX IF EXISTS idx_oportunidades_fecha_proxima');
        await db.execAsync('DROP INDEX IF EXISTS idx_oportunidades_contacto');
        console.log('✅ Pipeline indexes removed');
    }
};

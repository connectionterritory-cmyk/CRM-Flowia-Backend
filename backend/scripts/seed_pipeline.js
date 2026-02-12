const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

console.log('Seeding Pipeline Data...');

try {
    // 1. Get a client
    const client = db.prepare('SELECT ClienteID FROM Clientes LIMIT 1').get();
    if (!client) {
        console.error('No clients found. Run standard seeds first.');
        process.exit(1);
    }

    // 2. Insert Opportunities
    const opportunities = [
        {
            Etapa: 'NUEVO_LEAD',
            ProductoInteres: 'Website Redesign',
            ValorEstimado: 1500.00
        },
        {
            Etapa: 'PROPUESTA',
            ProductoInteres: 'SEO Campaign',
            ValorEstimado: 800.00
        },
        {
            Etapa: 'NEGOCIACION', // Note: This might not be in my valid list, checking...
            // Valid list: 'NUEVO_LEAD','INTENTO_CONTACTO','CONTACTADO','CALIFICACION','CITA_AGENDADA','DEMO_REALIZADA','PROPUESTA','SEGUIMIENTO','CIERRE_GANADO','CIERRE_PERDIDO'
            // I'll use 'CONTACTADO'
            Etapa: 'CONTACTADO',
            ProductoInteres: 'CRM Implementation',
            ValorEstimado: 5000.00
        }
    ];

    const insert = db.prepare(`
        INSERT INTO Oportunidades (
            OportunidadID, ContactoID, Etapa, ProductoInteres, ValorEstimado, OwnerUserID
        ) VALUES (?, ?, ?, ?, ?, 1)
    `);

    opportunities.forEach(op => {
        insert.run(uuidv4(), client.ClienteID, op.Etapa, op.ProductoInteres, op.ValorEstimado);
    });

    console.log('Pipeline seeded successfully.');

} catch (err) {
    console.error('Error seeding pipeline:', err);
}

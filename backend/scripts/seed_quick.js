const db = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

console.log('🌱 Seeding minimal data for Pipeline...\n');

try {
    // 1. Create admin user if not exists
    const existingUser = db.prepare('SELECT UsuarioID FROM Usuarios WHERE UsuarioID = 1').get();
    if (!existingUser) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO Usuarios (UsuarioID, Codigo, Nombre, Email, Password, Rol)
            VALUES (1, 'ADMIN', 'Administrador', 'admin@crm.com', ?, 'DISTRIBUIDOR')
        `).run(hashedPassword);
        console.log('✅ Admin user created (email: admin@crm.com, password: admin123)');
    } else {
        console.log('✓ Admin user already exists');
    }

    // 2. Create sample contacts
    const contacts = [
        { nombre: 'María González', telefono: '555-1234', ciudad: 'Miami', email: 'maria@example.com' },
        { nombre: 'Juan Pérez', telefono: '555-5678', ciudad: 'Orlando', email: 'juan@example.com' },
        { nombre: 'Ana Rodríguez', telefono: '555-9012', ciudad: 'Tampa', email: 'ana@example.com' }
    ];

    const insertContact = db.prepare(`
        INSERT INTO Contactos (NombreCompleto, Telefono, Ciudad, Email, Pais, Status)
        VALUES (?, ?, ?, ?, 'Estados Unidos', 'NUEVO')
    `);

    const contactIds = [];
    for (const contact of contacts) {
        const result = insertContact.run(contact.nombre, contact.telefono, contact.ciudad, contact.email);
        contactIds.push(result.lastInsertRowid);
    }
    console.log(`✅ ${contactIds.length} sample contacts created`);

    // 3. Get origen id
    let origenId = db.prepare("SELECT OrigenID FROM Origenes WHERE Nombre = 'Referido'").get()?.OrigenID;
    if (!origenId) {
        origenId = db.prepare("INSERT INTO Origenes (Nombre, Tipo) VALUES ('Referido', 'Referido')").run().lastInsertRowid;
    }

    // 4. Create opportunities in different stages
    const opportunities = [
        {
            contactoId: contactIds[0],
            etapa: 'NUEVO_LEAD',
            producto: 'Plan Básico',
            valor: 500.00
        },
        {
            contactoId: contactIds[0],
            etapa: 'INTENTO_CONTACTO',
            producto: 'Plan Premium',
            valor: 1200.00
        },
        {
            contactoId: contactIds[1],
            etapa: 'CONTACTADO',
            producto: 'Plan Empresarial',
            valor: 2500.00
        },
        {
            contactoId: contactIds[1],
            etapa: 'CALIFICACION',
            producto: 'Plan VIP',
            valor: 3500.00
        },
        {
            contactoId: contactIds[2],
            etapa: 'CITA_AGENDADA',
            producto: 'Plan Familiar',
            valor: 800.00
        },
        {
            contactoId: contactIds[2],
            etapa: 'DEMO_REALIZADA',
            producto: 'Plan Standard',
            valor: 1000.00
        },
        {
            contactoId: contactIds[2],
            etapa: 'PROPUESTA',
            producto: 'Plan Avanzado',
            valor: 1800.00
        }
    ];

    const insertOpp = db.prepare(`
        INSERT INTO Oportunidades (
            OportunidadID, ContactoID, Etapa, ProductoInteres, 
            ValorEstimado, OwnerUserID, OrigenID, EstadoCierre
        ) VALUES (?, ?, ?, ?, ?, 1, ?, 'Activo')
    `);

    for (const opp of opportunities) {
        insertOpp.run(
            uuidv4(),
            opp.contactoId,
            opp.etapa,
            opp.producto,
            opp.valor,
            origenId
        );
    }
    console.log(`✅ ${opportunities.length} sample opportunities created across all stages`);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: 1 admin`);
    console.log(`   - Contacts: ${contactIds.length}`);
    console.log(`   - Opportunities: ${opportunities.length}`);
    console.log('\n🔐 Login credentials:');
    console.log('   Email: admin@crm.com');
    console.log('   Password: admin123\n');

} catch (err) {
    console.error('❌ Error seeding:', err.message);
    process.exit(1);
}

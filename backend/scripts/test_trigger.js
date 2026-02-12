const db = require('../src/config/database');

console.log('Testing WON Trigger...');

try {
    // 1. Find the 'CRM Implementation' opportunity (which is 'CONTACTADO')
    const op = db.prepare("SELECT * FROM Oportunidades WHERE ProductoInteres = 'CRM Implementation'").get();

    if (!op) {
        console.error('Opportunity not found. Run seed first.');
        process.exit(1);
    }

    console.log(`Found Opportunity: ${op.OportunidadID} (Stage: ${op.Etapa})`);

    // 2. Update to CIERRE_GANADO
    console.log('Updating to CIERRE_GANADO...');
    db.prepare("UPDATE Oportunidades SET Etapa = 'CIERRE_GANADO' WHERE OportunidadID = ?").run(op.OportunidadID);

    // 3. Check if Client was updated to 'CLIENTE'
    const client = db.prepare("SELECT LifecycleStage FROM Clientes WHERE ClienteID = ?").get(op.ContactoID);
    console.log(`Client Lifecycle Stage: ${client.LifecycleStage} (Expected: CLIENTE)`);

    // 4. Check if Order was created
    const order = db.prepare("SELECT * FROM OrdenesRP WHERE Notas LIKE ?").get(`%${op.OportunidadID}%`);

    if (order) {
        console.log(`SUCCESS: Order created! ID: ${order.NumeroOrden}, Total: ${order.Total}`);
    } else {
        console.error('FAILURE: No order created.');
    }

} catch (err) {
    console.error('Error testing trigger:', err);
}

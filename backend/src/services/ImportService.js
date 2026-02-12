const fs = require('fs');
const db = require('../config/database');
const CalculationService = require('./CalculationService');

const ImportService = {
    parseCSV: (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        return data;
    },

    importClientes: async (filePath) => {
        const data = ImportService.parseCSV(filePath);
        let count = 0;
        let errors = [];

        const stmt = db.prepare(`
            INSERT INTO Clientes (Nombre, Telefono, Email, Direccion, Ciudad, Pais, TipoCliente, Estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING ClienteID AS "lastInsertRowid"
        `);

        const accountStmt = db.prepare(`
            INSERT INTO CuentaRP (ClienteID) VALUES (?)
        `);

        const tx = db.transaction(async () => {
            for (const [index, row] of data.entries()) {
                try {
                    const info = await stmt.run(
                        row.Nombre,
                        row.Telefono,
                        row.Email,
                        row.Direccion,
                        row.Ciudad,
                        row.Pais,
                        row.TipoCliente,
                        row.Estado
                    );
                    await accountStmt.run(info.lastInsertRowid);
                    count++;
                } catch (err) {
                    errors.push(`Row ${index + 2}: ${err.message}`);
                }
            }
        });
        await tx();

        return { count, errors };
    },

    importOrdenes: async (filePath) => {
        const data = ImportService.parseCSV(filePath);
        let count = 0;
        let errors = [];

        const stmt = db.prepare(`
            INSERT INTO OrdenesRP (ClienteID, NumeroOrden, Fecha, FechaVencimiento, TipoOrden, Subtotal, Impuestos, Total, Estado, Balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING OrdenID AS "lastInsertRowid"
        `);
        // Note: Balance initialized to Total. Should be adjusted if Paid? Assuming import is for history too?
        // If State is 'Completada', is it paid? Not necessarily. 
        // For import simplified: Balance = Total unless specified. CSV doesn't have Balance.

        const itemStmt = db.prepare(`
            INSERT INTO OrdenItemsRP (OrdenID, Descripcion, Cantidad, PrecioUnitario, Subtotal)
            VALUES (?, 'Imported Item', 1, ?, ?)
        `);

        const tx = db.transaction(async () => {
            for (const [index, row] of data.entries()) {
                try {
                    // Check if Cliente exists
                    const client = await db.prepare('SELECT ClienteID FROM Clientes WHERE ClienteID = ?').get(row.ClienteID);
                    if (!client) throw new Error(`ClienteID ${row.ClienteID} not found`);

                    // Get Account ID
                    const account = await db.prepare('SELECT CuentaID FROM CuentaRP WHERE ClienteID = ?').get(row.ClienteID);

                    const info = await stmt.run(
                        row.ClienteID,
                        row.NumeroOrden,
                        row.Fecha,
                        row.FechaVencimiento,
                        row.TipoOrden,
                        row.Subtotal,
                        row.Impuestos,
                        row.Total,
                        row.Estado,
                        row.Total
                    );
                    const ordenId = info.lastInsertRowid;

                    // Update Order with AccountID
                    if (account) {
                        await db.prepare('UPDATE OrdenesRP SET CuentaID = ? WHERE OrdenID = ?').run(account.CuentaID, ordenId);
                    }

                    // Create Dummy Item for Total (since CSV is Order Header only potentially? Or has items?)
                    // Prompt CSV example: "Ordenes.csv" has Subtotal, Impuestos, Total.
                    // It does NOT have items. So we create a dummy item to balance the OrderItems table? 
                    // Or we assume items are imported separately? 
                    // Prompt says "Ordenes.csv". Doesn't mention "OrdenItems.csv".
                    // So we effectively create a single item representing the order content.
                    await itemStmt.run(ordenId, row.Subtotal, row.Subtotal);

                    count++;
                } catch (err) {
                    errors.push(`Row ${index + 2}: ${err.message}`);
                }
            }
        });
        await tx();

        return { count, errors };
    },

    importTransacciones: async (filePath) => {
        const data = ImportService.parseCSV(filePath);
        let count = 0;
        let errors = [];

        const stmt = db.prepare(`
            INSERT INTO TransaccionesRP (ClienteID, CuentaID, OrdenID, Tipo, Monto, Fecha, MetodoPago, Referencia, Descripcion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(async () => {
            for (const [index, row] of data.entries()) {
                try {
                    // Check IDs
                    const client = await db.prepare('SELECT ClienteID FROM Clientes WHERE ClienteID = ?').get(row.ClienteID);
                    if (!client) throw new Error(`ClienteID ${row.ClienteID} not found`);

                    await stmt.run(
                        row.ClienteID,
                        row.CuentaID,
                        row.OrdenID,
                        row.Tipo,
                        row.Monto,
                        row.Fecha,
                        row.MetodoPago,
                        row.Referencia,
                        row.Descripcion
                    );

                    // Recalculate Account
                    if (row.CuentaID) {
                        await CalculationService.recalculateAccount(row.CuentaID);
                    }

                    // Recalculate Order Balance if related
                    if (row.OrdenID && row.OrdenID !== '') {
                        await CalculationService.recalculateOrderBalance(row.OrdenID);
                    }

                    count++;
                } catch (err) {
                    errors.push(`Row ${index + 2}: ${err.message}`);
                }
            }
        });
        await tx();

        return { count, errors };
    }
};

module.exports = ImportService;

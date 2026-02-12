const getContactoColumns = async (db) => {
    const columns = await db.prepare(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'contactos'
    `).all();
    return new Set(columns.map((column) => column.column_name));
};

const buildContactoInsert = async (db, valuesByColumn) => {
    const availableColumns = await getContactoColumns(db);
    const requiredColumns = [
        'full_name',
        'mobile_phone',
        'city',
        'state',
        'origin_type',
        'referred_by_type',
        'referred_by_id',
        'relationship_to_referrer',
        'assigned_to_user_id'
    ];
    const missingRequired = requiredColumns.filter((column) => !availableColumns.has(column));

    if (missingRequired.length > 0) {
        throw new Error(`Esquema de Contactos incompleto: falta ${missingRequired.join(', ')}`);
    }

    const columns = Object.keys(valuesByColumn).filter((column) => availableColumns.has(column));
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO Contactos (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ContactoID AS "lastInsertRowid"`;
    const values = columns.map((column) => valuesByColumn[column]);

    return { sql, values };
};

const buildContactoUpdate = async (db, valuesByColumn) => {
    const availableColumns = await getContactoColumns(db);
    const requiredColumns = [
        'full_name',
        'mobile_phone',
        'city',
        'state',
        'origin_type',
        'referred_by_type',
        'referred_by_id',
        'relationship_to_referrer',
        'assigned_to_user_id'
    ];
    const missingRequired = requiredColumns.filter((column) => !availableColumns.has(column));

    if (missingRequired.length > 0) {
        throw new Error(`Esquema de Contactos incompleto: falta ${missingRequired.join(', ')}`);
    }

    const columns = Object.keys(valuesByColumn).filter((column) => availableColumns.has(column));
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const sql = `UPDATE Contactos SET ${assignments}, UpdatedAt = CURRENT_TIMESTAMP WHERE ContactoID = ?`;
    const values = columns.map((column) => valuesByColumn[column]);

    return { sql, values };
};

module.exports = {
    buildContactoInsert,
    buildContactoUpdate,
};

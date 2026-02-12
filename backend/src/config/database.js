const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
    console.error('Missing SUPABASE_DB_URL or DATABASE_URL for Postgres connection.');
}

const sslEnabled = process.env.DB_SSL === 'false'
    ? false
    : { rejectUnauthorized: false };

const client = new Client({
    connectionString,
    ssl: sslEnabled,
});

client.connect().catch((err) => {
    console.error('Failed to connect to postgres:', err.message);
});

const normalizeParams = (params) => {
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
};

const toPostgresQuery = (sql, params) => {
    let index = 0;
    const text = sql.replace(/\?/g, () => `$${++index}`);
    return { text, values: params };
};

const extractInsertId = (rows) => {
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    if (row.lastInsertRowid !== undefined) return row.lastInsertRowid;
    const keys = Object.keys(row);
    if (keys.length === 1) return row[keys[0]];
    return null;
};

let activeTransaction = null;

const trackPromise = (promise) => {
    if (activeTransaction) {
        activeTransaction.pending.push(promise);
    }
    return promise;
};

const runQuery = (sql, params = []) => {
    const prepared = toPostgresQuery(sql, params);
    return client.query(prepared.text, prepared.values);
};

const db = {
    prepare: (sql) => ({
        run: (...params) => trackPromise(
            runQuery(sql, normalizeParams(params)).then((result) => ({
                lastInsertRowid: extractInsertId(result.rows),
                changes: result.rowCount,
            }))
        ),
        get: (...params) => trackPromise(
            runQuery(sql, normalizeParams(params)).then((result) => result.rows[0])
        ),
        all: (...params) => trackPromise(
            runQuery(sql, normalizeParams(params)).then((result) => result.rows)
        ),
    }),
    execAsync: (sql) => trackPromise(runQuery(sql)),
    exec: (sql, callback) => {
        const promise = trackPromise(runQuery(sql));
        if (typeof callback === 'function') {
            promise.then(() => callback(null)).catch((err) => callback(err));
        }
        return promise;
    },
    transaction: (fn) => async (...args) => {
        if (activeTransaction) {
            return fn(...args);
        }
        activeTransaction = { pending: [] };
        await client.query('BEGIN');
        try {
            const result = await fn(...args);
            await Promise.all(activeTransaction.pending);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            activeTransaction = null;
        }
    },
    client,
};

module.exports = db;

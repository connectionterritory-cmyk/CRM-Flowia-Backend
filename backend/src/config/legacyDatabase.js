const LEGACY_DB_ERROR_MESSAGE =
    'CRITICAL: Attempted to use legacy TCP connection. Migrate this module to Supabase HTTPS.';

const throwLegacyDbError = () => {
    throw new Error(LEGACY_DB_ERROR_MESSAGE);
};

const createStatementStub = () => ({
    run: throwLegacyDbError,
    get: throwLegacyDbError,
    all: throwLegacyDbError,
    execute: throwLegacyDbError,
    exec: throwLegacyDbError,
});

const dummyDb = {
    query: throwLegacyDbError,
    get: throwLegacyDbError,
    run: throwLegacyDbError,
    all: throwLegacyDbError,
    execute: throwLegacyDbError,
    prepare: () => createStatementStub(),
    execAsync: async () => {
        throwLegacyDbError();
    },
    exec: (...args) => {
        const maybeCallback = args[args.length - 1];
        if (typeof maybeCallback === 'function') {
            maybeCallback(new Error(LEGACY_DB_ERROR_MESSAGE));
        }
        throwLegacyDbError();
    },
    transaction: () => async () => {
        throwLegacyDbError();
    },
    client: new Proxy(
        {},
        {
            get: () => throwLegacyDbError,
        }
    ),
};

console.warn('WARNING: Legacy database adapter loaded. Direct TCP connections are DISABLED.');

module.exports = dummyDb;

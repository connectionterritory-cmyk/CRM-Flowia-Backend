const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const IGNORABLE_PATTERNS = [
    /duplicate column name/i,
    /already exists/i,
    /duplicate index name/i,
    /table .* already exists/i,
    /index .* already exists/i,
    /no such table: .*_old/i
];

const shouldIgnoreError = (message) => {
    if (!message) return false;
    return IGNORABLE_PATTERNS.some((pattern) => pattern.test(message));
};

const runMigrations = async () => {
    console.log('Starting migrations...');

    const migrationFiles = fs.readdirSync(__dirname)
        .filter((file) => file.endsWith('.sql'))
        .sort();

    for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const filePath = path.join(__dirname, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        if (!sql.trim()) {
            console.log(`↷ Skipped empty migration: ${file}`);
            continue;
        }

        try {
            await db.execAsync(sql);
            console.log(`✓ Success: ${file}`);
        } catch (err) {
            if (shouldIgnoreError(err.message)) {
                console.log(`↷ Skipped: ${file} (${err.message})`);
                continue;
            }
            console.error(`✗ Error in ${file}:`, err.message);
            process.exit(1);
        }
    }

    console.log('All migrations completed successfully.');
};

runMigrations().catch((err) => {
    console.error('Migration runner failed:', err.message);
    process.exit(1);
});

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const runSeeds = async () => {
    console.log('Starting seeds...');

    const seedFile = 'data.sql';
    const filePath = path.join(__dirname, seedFile);

    if (!fs.existsSync(filePath)) {
        console.error('Seed file not found:', filePath);
        process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    try {
        // Wrap in transaction
        const insertTransaction = db.transaction(async () => {
            await db.execAsync(sql);
        });
        await insertTransaction();
        console.log(`✓ Seed data inserted successfully.`);
    } catch (err) {
        console.error(`✗ Error executing seeds:`, err.message);
        process.exit(1);
    }
};

runSeeds().catch((err) => {
    console.error(`✗ Error executing seeds:`, err.message);
    process.exit(1);
});

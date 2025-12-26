const db = require('./models').default; // Adjust import based on your setup (require vs import)
// Actually, looking at other files, it seems to be `import db` or `const db = require...`
// Let's use standard JS for a quick script

const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize (simpler to just use the one from models if possible, but let's try raw query via model)
const sequelize = db.sequelize;

async function migrate() {
    try {
        console.log('Checking for scanStatus column...');
        const tableInfo = await sequelize.getQueryInterface().describeTable('expenses');

        if (tableInfo.scanStatus) {
            console.log('Column scanStatus already exists.');
        } else {
            console.log('Adding scanStatus column...');
            await sequelize.getQueryInterface().addColumn('expenses', 'scanStatus', {
                type: Sequelize.STRING, // Enum often mapped to string in SQLite or specific TEXT
                allowNull: true,
            });
            console.log('Column added successfully.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();

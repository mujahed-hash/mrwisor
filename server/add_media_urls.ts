import sequelize from './src/config/database';

async function addMediaUrls() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        await sequelize.query("ALTER TABLE ads ADD COLUMN mediaUrls TEXT DEFAULT '[]'");

        console.log('Added mediaUrls column successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addMediaUrls();

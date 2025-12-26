const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database is in the server directory itself (relative path ./database.sqlite)
const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Opening database at', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE expenses ADD COLUMN scanStatus TEXT", (err) => {
        if (err) {
            // Ignore if column exists
            if (err.message && err.message.includes('duplicate column name')) {
                console.log('Column scanStatus already exists.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Column scanStatus added successfully.');
        }
        db.close();
    });
});

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT id, name, email, customId FROM users", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Users found:', rows.length);
    console.table(rows);

    const ids = rows.map(u => u.customId);

    // Check for nulls
    const nulls = rows.filter(r => r.customId === null);
    if (nulls.length > 0) {
        console.log('NULL customIds found:', nulls.length);
    }

    const uniqueIds = new Set(ids);

    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users_backup'", [], (err, tables) => {
        if (tables && tables.length > 0) {
            console.log('users_backup table FOUND. This might be the cause.');
            db.all("SELECT * FROM users_backup", [], (err, backups) => {
                console.log('Backup rows:', backups.length);
            });
        } else {
            console.log('users_backup table NOT found.');
        }
    });

});

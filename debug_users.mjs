import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
    const db = await open({
        filename: './server/database.sqlite',
        driver: sqlite3.Database
    });

    try {
        const users = await db.all('SELECT id, name, email, customId FROM users');
        console.log('Users found:', users.length);
        console.table(users);

        // check for duplicates
        const ids = users.map(u => u.customId);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            console.log('DUPLICATES FOUND!');
            const seen = new Set();
            const start = new Set();
            for (const id of ids) {
                if (seen.has(id)) {
                    console.log('Duplicate:', id);
                }
                seen.add(id);
            }
        }

    } catch (e) {
        console.error(e);
    }
})();

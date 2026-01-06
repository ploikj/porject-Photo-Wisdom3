const mysql = require('mysql2/promise');

async function migrate() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'photo_community'
        });

        console.log('Connected. Adding is_banned column...');

        await connection.query('ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE');

        console.log('Migration successful: Added is_banned column.');
        await connection.end();
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists. Skipping.');
        } else {
            console.error('Migration failed:', e);
        }
    }
}

migrate();

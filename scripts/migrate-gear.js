const mysql = require('mysql2/promise');

async function migrate() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'photo_community'
        });

        console.log('Connected. Adding columns...');

        await connection.query('ALTER TABLE photos ADD COLUMN camera VARCHAR(255)');
        await connection.query('ALTER TABLE photos ADD COLUMN lens VARCHAR(255)');

        console.log('Migration successful: Added camera and lens columns.');
        await connection.end();
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist. Skipping.');
        } else {
            console.error('Migration failed:', e);
        }
    }
}

migrate();

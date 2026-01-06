const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community'
    });

    try {
        console.log('Migrating database...');
        await connection.query("ALTER TABLE users ADD COLUMN facebook VARCHAR(255)");
        await connection.query("ALTER TABLE users ADD COLUMN instagram VARCHAR(255)");
        await connection.query("ALTER TABLE users ADD COLUMN camera_gear VARCHAR(255)");
        await connection.query("ALTER TABLE users ADD COLUMN lens_gear VARCHAR(255)");
        await connection.query("ALTER TABLE users ADD COLUMN is_open_for_work BOOLEAN DEFAULT FALSE");
        console.log('Migration successful');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist, skipping.');
        } else {
            console.error('Migration failed:', e.message);
        }
    } finally {
        await connection.end();
    }
}

migrate();

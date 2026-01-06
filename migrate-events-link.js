/**
 * Migration: Add link_url to events table
 */
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'photo_community'
};

async function migrate() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if column exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'events' AND COLUMN_NAME = 'link_url'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            console.log('Column link_url already exists.');
        } else {
            await connection.query(`
                ALTER TABLE events
                ADD COLUMN link_url VARCHAR(255) DEFAULT NULL
            `);
            console.log('Added column link_url to events table.');
        }

        await connection.end();
        console.log('Migration complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();

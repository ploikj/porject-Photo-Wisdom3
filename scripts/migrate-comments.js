const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'photo_community'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add parent_id to comments table
        console.log('Adding parent_id to comments table...');
        try {
            await connection.query(`
                ALTER TABLE comments 
                ADD COLUMN parent_id INT NULL,
                ADD CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
            `);
            console.log('Column parent_id added successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column parent_id already exists.');
            } else {
                console.error('Error adding column:', e.message);
            }
        }

        console.log('Migration completed.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

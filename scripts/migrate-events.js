const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community',
        waitForConnections: true,
        connectionLimit: 1
    });

    try {
        console.log('Running migration: Create Events Table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_date DATETIME,
                location VARCHAR(255),
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();

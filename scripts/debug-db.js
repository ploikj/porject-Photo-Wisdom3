const mysql = require('mysql2/promise');

async function debugSetup() {
    console.log('Starting debug setup...');
    try {
        console.log('Connecting to MySQL (root, no password)...');
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: ''
        });
        console.log('Connected!');

        console.log('Creating Database...');
        await connection.query('CREATE DATABASE IF NOT EXISTS photo_community');
        console.log('Database created (or exists).');

        console.log('Using Database...');
        await connection.query('USE photo_community');

        console.log('Creating Users Table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                avatar VARCHAR(255),
                bio TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users Table Created.');

        // Skip other tables for moment to test connection
        console.log('DONE.');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

debugSetup();

const mysql = require('mysql2/promise');

async function clear() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community'
    });

    try {
        console.log('Clearing database...');
        // Disable foreign key checks to allow truncating in any order
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        await connection.query('TRUNCATE TABLE topic_comments');
        await connection.query('TRUNCATE TABLE comments');
        await connection.query('TRUNCATE TABLE photo_likes');
        await connection.query('TRUNCATE TABLE photos');
        await connection.query('TRUNCATE TABLE topics');
        await connection.query('TRUNCATE TABLE users');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database cleared successfully.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await connection.end();
    }
}

clear();

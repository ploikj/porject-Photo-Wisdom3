const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community'
    });

    try {
        const [rows] = await connection.query('SELECT * FROM users');
        console.log('Users found:', rows.length);
        rows.forEach(u => console.log(`- ${u.username} (Password: ${u.password})`));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await connection.end();
    }
}

check();

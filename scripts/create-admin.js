const mysql = require('mysql2/promise');

async function createAdmin() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community'
    });

    try {
        const username = 'narathip.kh.66@ubu.ac.th';
        const password = 'ploikj334';
        const name = 'Superb Admin';
        const role = 'admin';
        const avatar = 'https://ui-avatars.com/api/?name=Super+Admin&background=dc2626&color=fff';

        console.log(`Creating admin user: ${username}...`);

        // Using INSERT IGNORE to avoid error if run twice, although DB was just cleared.
        // Also checking length: username length is 24, limit is 50. OK.
        await connection.query(
            `INSERT INTO users (username, password, name, role, avatar, bio) VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE role='admin', password=?`,
            [username, password, name, role, avatar, 'Superb Admin User', password]
        );

        console.log('Admin user created successfully.');
    } catch (e) {
        console.error('Error creating admin:', e.message);
    } finally {
        await connection.end();
    }
}

createAdmin();

const mysql = require('mysql2/promise');

async function seed() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'photo_community'
    });

    try {
        console.log('Seeding users...');
        const users = [
            ['admin', 'password', 'System Admin', 'admin', 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff', 'I manage this community.', null, null, null, null, 1],
            ['alice', 'password', 'Alice Photographer', 'user', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', 'Lover of landscapes.', null, null, null, null, 0],
            ['bob', 'password', 'Bob Shooter', 'user', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', 'Street photography enthusiast.', null, null, null, null, 0]
        ];

        for (const u of users) {
            await connection.query(
                `INSERT IGNORE INTO users (username, password, name, role, avatar, bio, facebook, instagram, camera_gear, lens_gear, is_open_for_work) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                u
            );
        }
        console.log('Seeding complete.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await connection.end();
    }
}

seed();

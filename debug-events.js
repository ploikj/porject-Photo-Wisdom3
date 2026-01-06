const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'photo_community'
};

async function check() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const [events] = await connection.query('SELECT id, title, user_id FROM events');
        console.log('Events:', events);

        if (events.length > 0) {
            console.log('Attempting to find event with ID:', events[0].id);
            const [check] = await connection.query('SELECT user_id FROM events WHERE id = ?', [events[0].id]);
            console.log('Check result:', check);
        }

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

check();

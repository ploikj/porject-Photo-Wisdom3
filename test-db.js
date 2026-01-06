const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing MySQL Connection...');
    console.log('Host: localhost');
    console.log('User: root');
    console.log('Password: (empty)');

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        console.log('SUCCESS: Connected to MySQL!');
        await connection.end();
    } catch (err) {
        console.error('FAILED: Could not connect to MySQL.');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);

        if (err.code === 'ECONNREFUSED') {
            console.log('TIP: Is MySQL Server running?');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('TIP: Wrong username or password. Do you have a password set for root?');
        }
    }
}

testConnection();

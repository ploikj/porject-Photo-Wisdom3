const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        // Connect to MySQL server (no database selected yet)
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Default empty password
            multipleStatements: true
        });

        console.log('Connected to MySQL.');

        const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');

        console.log('Running SQL script...');
        await connection.query(sql);

        console.log('Database setup completed successfully.');
        await connection.end();
    } catch (err) {
        console.error('Error setting up database:', err);
        console.error('Ensure MySQL is running and password is empty (or update setup-db.js).');
    }
}

setupDatabase();

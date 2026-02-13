const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'db', // Default to 'db' for internal docker network, or localhost if running locally
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'photo_community'
};

// Adjust host if running locally vs inside docker
// If running via 'docker exec', 'db' is correct.
// If running locally, might need localhost.
// Getting config from common pattern or just strict env vars.

async function cleanup() {
    console.log('Starting cleanup...');
    console.log('DB Config:', { ...DB_CONFIG, password: '***' });

    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected to database.');

        // 1. Get all valid file paths from DB
        const [photos] = await connection.query('SELECT url FROM photos');
        const [events] = await connection.query('SELECT image_url FROM events');

        const validFiles = new Set();

        photos.forEach(row => {
            if (row.url && row.url.startsWith('/uploads/')) {
                validFiles.add(path.basename(row.url));
            }
        });

        events.forEach(row => {
            if (row.image_url && row.image_url.startsWith('/uploads/')) {
                validFiles.add(path.basename(row.image_url));
            }
        });

        console.log(`Found ${validFiles.size} valid files in database.`);

        // 2. Scan uploads directory
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log('Uploads directory not found.');
            return;
        }

        const files = fs.readdirSync(uploadsDir);
        console.log(`Scanning ${files.length} files in uploads directory...`);

        let deletedCount = 0;
        files.forEach(file => {
            // Skip .gitignore or other system files if any
            if (file === '.gitignore') return;

            if (!validFiles.has(file)) {
                const filePath = path.join(uploadsDir, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[DELETED] Orphaned file: ${file}`);
                    deletedCount++;
                } catch (err) {
                    console.error(`[ERROR] Failed to delete ${file}:`, err.message);
                }
            }
        });

        console.log(`Cleanup complete. Deleted ${deletedCount} orphaned files.`);

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        if (connection) await connection.end();
    }
}

cleanup();

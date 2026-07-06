const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MySQL Connection Pool (Lazy Init) ---
let pool;

const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'photo_community',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
};

async function initDB() {
    let retries = 5;
    while (retries > 0) {
        try {
            console.log(`Initializing Database (Host: ${DB_CONFIG.host})... Attempt ${6 - retries}/5`);

            // 1. Connect without Database to Create it (if needed)
            // Note: In Docker Main MySQL container usually creates DB via env vars, but this safety check doesn't hurt.
            // However, connecting to '127.0.0.1' vs 'db' container needs care.

            const connection = await mysql.createConnection({
                host: DB_CONFIG.host,
                user: DB_CONFIG.user,
                password: DB_CONFIG.password
            });

            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
            await connection.end();

            // 2. Main Pool with Database
            pool = mysql.createPool(DB_CONFIG);

            // 3. Create Tables
            const sql = fs.readFileSync(path.join(__dirname, 'scripts', 'database.sql'), 'utf8');
            const setupConn = await pool.getConnection();
            await setupConn.query(sql);

            // Migration: Add camera and lens columns if missing
            try {
                const [cols] = await setupConn.query("SHOW COLUMNS FROM photos LIKE 'camera'");
                if (cols.length === 0) {
                    console.log('Migrating: Adding camera/lens columns to photos...');
                    await setupConn.query("ALTER TABLE photos ADD COLUMN camera VARCHAR(255), ADD COLUMN lens VARCHAR(255)");
                }

                const [eventCols] = await setupConn.query("SHOW COLUMNS FROM events LIKE 'link_url'");
                if (eventCols.length === 0) {
                    console.log('Migrating: Adding link_url column to events...');
                    await setupConn.query("ALTER TABLE events ADD COLUMN link_url VARCHAR(255)");
                }

                const [userCols] = await setupConn.query("SHOW COLUMNS FROM users LIKE 'email'");
                if (userCols.length === 0) {
                    console.log('Migrating: Adding email/google_id columns to users...');
                    await setupConn.query("ALTER TABLE users ADD COLUMN email VARCHAR(255), ADD COLUMN google_id VARCHAR(255)");
                }
            } catch (e) {
                console.log('Migration check skipped:', e.message);
            }

            setupConn.release();

            console.log('Database initialized successfully.');
            return; // Success
        } catch (err) {
            console.error('Database Initialization Failed:', err.message);
            retries--;
            if (retries === 0) {
                console.error('Max retries reached. Exiting.');
                process.exit(1);
            }
            console.log('Retrying in 5 seconds...');
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

// Initialize immediately
initDB();

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Routes ---

// Page Routes (Clean URLs)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'views', 'upload.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'profile.html')));
app.get('/board', (req, res) => res.sendFile(path.join(__dirname, 'views', 'board.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html')));
app.get('/search', (req, res) => res.sendFile(path.join(__dirname, 'views', 'search.html')));
app.get('/photo', (req, res) => res.sendFile(path.join(__dirname, 'views', 'photo.html')));
app.get('/events', (req, res) => res.sendFile(path.join(__dirname, 'views', 'events.html')));
app.get('/event', (req, res) => res.sendFile(path.join(__dirname, 'views', 'event.html')));
app.get('/create-event.html', (req, res) => res.sendFile(path.join(__dirname, 'views', 'create-event.html')));

// API Routes

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            if (rows[0].is_banned) {
                return res.status(403).json({ success: false, message: 'Your account has been banned.' });
            }
            const { password, ...user } = rows[0];
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Google Login (Prototype)
app.post('/api/auth/google', async (req, res) => {
    const { username, email, name, avatar, google_id } = req.body;

    try {
        // Check if user exists (by google_id if we had it, or username/email)
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        let user;
        if (rows.length > 0) {
            // User exists, login them
            if (rows[0].is_banned) return res.status(403).json({ success: false, message: 'Banned' });
            user = rows[0];

            // Optional: Update avatar if it's the UI avatar default? 
            // Let's keep existing user data to avoid overwriting changes.
        } else {
            // Register new user automatically
            const [result] = await pool.query(
                'INSERT INTO users (username, password, name, role, avatar) VALUES (?, ?, ?, ?, ?)',
                [username, 'google_auth', name, 'user', avatar]
            );
            user = { id: result.insertId, username, name, role: 'user', avatar };
        }

        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, password, name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
        // Check if exists
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        // Insert
        // Default avatar: ui-avatars with name
        const displayName = name || username;
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

        await pool.query(
            'INSERT INTO users (username, password, name, role, avatar) VALUES (?, ?, ?, ?, ?)',
            [username, password, displayName, 'user', avatarUrl]
        );

        res.json({ success: true, message: 'Registration successful' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get all photos
app.get('/api/photos', async (req, res) => {
    try {
        const { username } = req.query;
        let query = `
            SELECT p.*, u.username as authorUsername, u.name as authorName, u.avatar as authorAvatar,
            (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) as commentCount
            FROM photos p
            JOIN users u ON p.user_id = u.id
        `;

        const params = [];
        if (username) {
            query += ' WHERE u.username = ?';
            params.push(username);
        }

        query += ' ORDER BY p.created_at DESC';

        const [rows] = await pool.query(query, params);

        // Transform for frontend compatibility (map snake_case DB to camelCase if needed, or adjust frontend)
        // Frontend expects: id, url, caption, likes, comments (array or count?), timestamp (date)
        // Adjusting rows to match frontend expectations strictly:
        const photos = await Promise.all(rows.map(async (row) => {
            // Fetch comments for each photo? Ideally join or separate query. 
            // For feed, we just showed count or last comment?
            // Original mock had comments array. Let's fetch comments to be safe or empty array.
            const [comments] = await pool.query('SELECT * FROM comments WHERE photo_id = ?', [row.id]);
            return {
                id: row.id,
                userId: row.user_id,
                url: row.url,
                caption: row.caption,
                likes: row.likes,
                camera: row.camera,
                lens: row.lens,
                timestamp: row.created_at,
                authorName: row.authorName,
                authorUsername: row.authorUsername,
                authorAvatar: row.authorAvatar,
                comments: comments.map(c => ({ id: c.id, user: c.username, text: c.text, parentId: c.parent_id }))
            };
        }));
        res.json(photos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create Photo (Upload)
app.post('/api/photos', upload.single('photo'), async (req, res) => {
    const { caption, username, camera, lens } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

    try {
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const userId = users[0].id;
        const url = '/uploads/' + req.file.filename;

        const [result] = await pool.query(
            'INSERT INTO photos (user_id, url, caption, camera, lens) VALUES (?, ?, ?, ?, ?)',
            [userId, url, caption, camera || null, lens || null]
        );

        res.json({ success: true, message: 'Uploaded' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Single Photo
app.get('/api/photos/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, u.username as authorUsername, u.name as authorName, u.avatar as authorAvatar
            FROM photos p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

        const photo = rows[0];
        const [comments] = await pool.query('SELECT * FROM comments WHERE photo_id = ? ORDER BY created_at ASC', [photo.id]);

        res.json({
            id: photo.id,
            url: photo.url,
            caption: photo.caption,
            likes: photo.likes,
            camera: photo.camera,
            lens: photo.lens,
            timestamp: photo.created_at,
            authorName: photo.authorName,
            authorUsername: photo.authorUsername,
            authorAvatar: photo.authorAvatar,
            comments: comments.map(c => ({ id: c.id, user: c.username, text: c.text, parentId: c.parent_id }))
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Add Comment
app.post('/api/photos/:id/comments', async (req, res) => {
    const { text, user, parentId } = req.body;
    try {
        await pool.query(
            'INSERT INTO comments (photo_id, username, text, parent_id) VALUES (?, ?, ?, ?)',
            [req.params.id, user, text, parentId || null]
        );
        // Return updated comments?
        // Simple success
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Like Photo (Toggle)
app.post('/api/photos/:id/like', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(401).json({ success: false, message: 'Login required' });

    try {
        // Check if already liked
        const [likes] = await pool.query('SELECT id FROM photo_likes WHERE photo_id = ? AND username = ?', [req.params.id, username]);
        let isLiked = false;

        if (likes.length > 0) {
            // Unlike
            await pool.query('DELETE FROM photo_likes WHERE photo_id = ? AND username = ?', [req.params.id, username]);
            await pool.query('UPDATE photos SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [req.params.id]);
        } else {
            // Like
            await pool.query('INSERT INTO photo_likes (photo_id, username) VALUES (?, ?)', [req.params.id, username]);
            await pool.query('UPDATE photos SET likes = likes + 1 WHERE id = ?', [req.params.id]);
            isLiked = true;
        }

        const [rows] = await pool.query('SELECT likes FROM photos WHERE id = ?', [req.params.id]);
        res.json({ success: true, likes: rows[0].likes, liked: isLiked });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Photo
app.delete('/api/photos/:id', async (req, res) => {
    const { username } = req.body; // Authenticated user
    try {
        // Check ownership
        const [photos] = await pool.query('SELECT user_id, url FROM photos WHERE id = ?', [req.params.id]);
        if (photos.length === 0) return res.status(404).json({ success: false, message: 'Photo not found' });

        const [users] = await pool.query('SELECT id, role, username FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const photo = photos[0];
        const user = users[0];

        if (user.role !== 'admin' && user.id !== photo.user_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Delete (Cascade handles comments if set, but let's be safe or rely on FK ON DELETE CASCADE)
        // Our schema definition had ON DELETE CASCADE for comments.
        await pool.query('DELETE FROM photos WHERE id = ?', [req.params.id]);

        // Delete file
        if (photo.url && photo.url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, photo.url);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete photo file:', filePath, err.message);
            });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update Photo (Edit Caption)
app.put('/api/photos/:id', async (req, res) => {
    const { username, caption } = req.body;
    try {
        const [photos] = await pool.query('SELECT user_id FROM photos WHERE id = ?', [req.params.id]);
        if (photos.length === 0) return res.status(404).json({ success: false, message: 'Photo not found' });

        const [users] = await pool.query('SELECT id, role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const photo = photos[0];
        const user = users[0];

        if (user.role !== 'admin' && user.id !== photo.user_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('UPDATE photos SET caption = ? WHERE id = ?', [caption, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Topics
// Get Topics (Now Returns Photos as Topics)
// Get Topics
app.get('/api/topics', async (req, res) => {
    try {
        const { username } = req.query;
        let sql = 'SELECT * FROM topics';
        let params = [];

        if (username) {
            sql += ' WHERE author_username = ?';
            params.push(username);
        }

        const [rows] = await pool.query(sql, params);

        // Enrich with author info
        const [enriched] = await pool.query(`
            SELECT t.*, u.avatar as authorAvatar, u.name as authorName 
            FROM topics t 
            LEFT JOIN users u ON t.author_username = u.username
            ${username ? 'WHERE t.author_username = ?' : ''}
            ORDER BY t.created_at DESC
        `, params);
        res.json(enriched);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create Topic
app.post('/api/topics', async (req, res) => {
    const { title, category, username } = req.body;
    try {
        await pool.query('INSERT INTO topics (title, author_username, category) VALUES (?, ?, ?)', [title, username, category || 'General']);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Topic
app.delete('/api/topics/:id', async (req, res) => {
    const { username } = req.body;
    try {
        const [topics] = await pool.query('SELECT author_username FROM topics WHERE id = ?', [req.params.id]);
        if (topics.length === 0) return res.status(404).json({ success: false, message: 'Topic not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const topic = topics[0];
        const user = users[0];

        if (user.role !== 'admin' && topic.author_username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('DELETE FROM topics WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update Topic
app.put('/api/topics/:id', async (req, res) => {
    const { username, title } = req.body;
    try {
        const [topics] = await pool.query('SELECT author_username FROM topics WHERE id = ?', [req.params.id]);
        if (topics.length === 0) return res.status(404).json({ success: false, message: 'Topic not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const topic = topics[0];
        const user = users[0];

        if (user.role !== 'admin' && topic.author_username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('UPDATE topics SET title = ? WHERE id = ?', [title, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Google Auth
app.post('/api/auth/google', async (req, res) => {
    const { username, email, name, avatar, google_id } = req.body;

    try {
        // 1. Check if user exists by email or google_id
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR google_id = ?',
            [email, google_id]
        );

        if (existingUsers.length > 0) {
            // User exists - Login
            const user = existingUsers[0];

            // Optional: Update avatar/name from Google if they changed
            // await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user.id]);

            return res.json({ success: true, user });
        } else {
            // User does not exist - Register
            // Handle username collision: if 'alice' exists, try 'alice_1', 'alice_2'...
            let finalUsername = username;
            let counter = 1;
            while (true) {
                const [check] = await pool.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
                if (check.length === 0) break;
                finalUsername = `${username}_${counter}`;
                counter++;
            }

            // Create new user (Password is random/placeholder since they use Google)
            const placeholderPassword = Math.random().toString(36).slice(-8);

            await pool.query(
                'INSERT INTO users (username, password, name, avatar, email, google_id, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [finalUsername, placeholderPassword, name, avatar, email, google_id, 'user']
            );

            // Fetch the new user to return
            const [newUser] = await pool.query('SELECT * FROM users WHERE username = ?', [finalUsername]);

            return res.json({ success: true, user: newUser[0] });
        }
    } catch (e) {
        console.error("Google Auth Error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Topic Details
app.get('/api/topics/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, u.avatar as authorAvatar, u.name as authorName 
            FROM topics t 
            LEFT JOIN users u ON t.author_username = u.username
            WHERE t.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Topic not found' });

        // Update views
        await pool.query('UPDATE topics SET views = views + 1 WHERE id = ?', [req.params.id]);

        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Topic Comments
app.get('/api/topics/:id/comments', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, u.avatar as userAvatar, u.name as userName 
            FROM topic_comments c
            LEFT JOIN users u ON c.username = u.username
            WHERE c.topic_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add Topic Comment
app.post('/api/topics/:id/comments', async (req, res) => {
    const { username, text } = req.body;
    try {
        await pool.query('INSERT INTO topic_comments (topic_id, username, text) VALUES (?, ?, ?)', [req.params.id, username, text]);

        // Update replies count
        await pool.query('UPDATE topics SET replies = replies + 1 WHERE id = ?', [req.params.id]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- Events API ---

// Get Events
app.get('/api/events', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.username as authorUsername, u.name as authorName, u.avatar as authorAvatar
            FROM events e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create Event
app.post('/api/events', upload.single('image'), async (req, res) => {
    const { title, description, event_date, location, username, link_url } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Event poster required' });

    try {
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const userId = users[0].id;
        const imageUrl = '/uploads/' + req.file.filename;

        await pool.query(
            'INSERT INTO events (user_id, title, description, event_date, location, image_url, link_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, title, description, event_date, location, imageUrl, link_url || null]
        );

        res.json({ success: true, message: 'Event created' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Single Event
app.get('/api/events/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.username as authorUsername, COALESCE(u.name, u.username) as authorName, u.avatar as authorAvatar
            FROM events e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update Event
app.put('/api/events/:id', upload.single('image'), async (req, res) => {
    const { title, description, event_date, location, username, link_url } = req.body;
    try {
        // Check ownership
        const [events] = await pool.query('SELECT user_id, image_url FROM events WHERE id = ?', [req.params.id]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        const event = events[0];
        const [users] = await pool.query('SELECT id, role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const user = users[0];
        if (user.role !== 'admin' && user.id !== event.user_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        let imageUrl = event.image_url;
        if (req.file) {
            imageUrl = '/uploads/' + req.file.filename;
        }

        await pool.query(
            'UPDATE events SET title=?, description=?, event_date=?, location=?, link_url=?, image_url=? WHERE id=?',
            [title, description, event_date, location, link_url || null, imageUrl, req.params.id]
        );

        res.json({ success: true, message: 'Event updated' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Event
app.delete('/api/events/:id', async (req, res) => {
    const { username } = req.body;
    console.log(`[DELETE] Request to delete event ID: ${req.params.id} by user: ${username}`);
    try {
        const [events] = await pool.query('SELECT user_id, image_url FROM events WHERE id = ?', [req.params.id]);
        console.log(`[DELETE] Found events:`, events);

        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        const [users] = await pool.query('SELECT id, role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        const user = users[0];
        const event = events[0];

        if (user.role !== 'admin' && user.id !== event.user_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);

        // Delete file
        if (event.image_url && event.image_url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, event.image_url);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete event file:', filePath, err.message);
            });
        }
        res.json({ success: true, message: 'Event deleted' });
    } catch (e) {
        console.error('[DELETE] Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [u] = await pool.query('SELECT COUNT(*) as c FROM users');
        const [p] = await pool.query('SELECT COUNT(*) as c FROM photos');
        const [t] = await pool.query('SELECT COUNT(*) as c FROM topics');
        res.json({
            userCount: u[0].c,
            photoCount: p[0].c,
            topicCount: t[0].c
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows.map(({ password, ...u }) => u));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Update User Profile (Supports Avatar)
app.put('/api/users/:username', upload.single('avatar'), async (req, res) => {
    const { username: requester, bio, facebook, instagram, camera_gear, lens_gear, is_open_for_work } = req.body;

    // Check auth
    console.log('[DEBUG] Update Profile Request. Body:', req.body, 'File:', req.file);
    if (!requester) {
        console.error('[DEBUG] Login required check failed. Requester:', requester);
        return res.status(401).json({ success: false, message: 'Login required' });
    }

    try {
        const [users] = await pool.query('SELECT role, avatar FROM users WHERE username = ?', [requester]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        // Allow if admin or same user
        if (users[0].role !== 'admin' && requester !== req.params.username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        let avatarUrl = undefined;
        if (req.file) {
            avatarUrl = '/uploads/' + req.file.filename;
        }

        // Dynamic Update Query
        let sql = `UPDATE users SET 
                bio = ?, 
                facebook = ?, 
                instagram = ?, 
                camera_gear = ?, 
                lens_gear = ?, 
                is_open_for_work = ?`;

        const params = [bio, facebook, instagram, camera_gear, lens_gear, is_open_for_work];

        if (avatarUrl) {
            sql += `, avatar = ?`;
            params.push(avatarUrl);
        }

        sql += ` WHERE username = ?`;
        params.push(req.params.username);

        await pool.query(sql, params);

        res.json({ success: true, avatar: avatarUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update User Role (Admin only)
app.put('/api/users/:username/role', async (req, res) => {
    const { role, requesterUsername } = req.body;

    if (!requesterUsername || !role) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    try {
        // Verify requester is SUPERB ADMIN
        // specific username check for 'narathip.kh.66@ubu.ac.th'
        const SUPERB_ADMIN = 'narathip.kh.66@ubu.ac.th';

        if (requesterUsername !== SUPERB_ADMIN) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Only Superb Admin can change roles.' });
        }

        // Verify requester is admin (double check in DB)
        const [admins] = await pool.query('SELECT role FROM users WHERE username = ?', [requesterUsername]);
        if (admins.length === 0 || admins[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized: Admins only' });
        }

        // Update target user
        await pool.query('UPDATE users SET role = ? WHERE username = ?', [role, req.params.username]);

        res.json({ success: true, message: `User promoted to ${role}` });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});


// Delete User (Superb Admin only)
app.delete('/api/users/:username', async (req, res) => {
    const { requesterUsername } = req.body;
    const SUPERB_ADMIN = 'narathip.kh.66@ubu.ac.th';

    if (!requesterUsername) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    try {
        // 1. Verify Requestor is Superb Admin
        if (requesterUsername !== SUPERB_ADMIN) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Only Superb Admin can delete users.' });
        }

        // 2. Prevent Self-Deletion
        if (req.params.username === SUPERB_ADMIN) {
            return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });
        }

        // 3. Delete User
        const [result] = await pool.query('DELETE FROM users WHERE username = ?', [req.params.username]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Ban/Unban User
app.put('/api/users/:username/ban', async (req, res) => {
    const { requesterUsername } = req.body;
    const SUPERB_ADMIN = 'narathip.kh.66@ubu.ac.th';

    if (!requesterUsername) return res.status(400).json({ success: false, message: 'Missing parameters' });

    try {
        const [admins] = await pool.query('SELECT role FROM users WHERE username = ?', [requesterUsername]);
        if (admins.length === 0 || admins[0].role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (req.params.username === SUPERB_ADMIN) {
            return res.status(403).json({ success: false, message: 'Cannot ban Superb Admin.' });
        }

        const [users] = await pool.query('SELECT is_banned FROM users WHERE username = ?', [req.params.username]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const newStatus = !users[0].is_banned;
        await pool.query('UPDATE users SET is_banned = ? WHERE username = ?', [newStatus, req.params.username]);

        res.json({ success: true, message: newStatus ? 'User banned' : 'User unbanned', is_banned: newStatus });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
// Update Topic Comment
app.put('/api/topic-comments/:id', async (req, res) => {
    const { username, text } = req.body;
    try {
        const [comments] = await pool.query('SELECT username FROM topic_comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) return res.status(404).json({ success: false, message: 'Comment not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        if (users[0].role !== 'admin' && comments[0].username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('UPDATE topic_comments SET text = ? WHERE id = ?', [text, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update Photo Comment
app.put('/api/comments/:id', async (req, res) => {
    const { username, text } = req.body;
    try {
        const [comments] = await pool.query('SELECT username FROM comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) return res.status(404).json({ success: false, message: 'Comment not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        if (users[0].role !== 'admin' && comments[0].username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('UPDATE comments SET text = ? WHERE id = ?', [text, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Topic Comment
app.delete('/api/topic-comments/:id', async (req, res) => {
    const { username } = req.body;
    try {
        const [comments] = await pool.query('SELECT username, topic_id FROM topic_comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) return res.status(404).json({ success: false, message: 'Comment not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        if (users[0].role !== 'admin' && comments[0].username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('DELETE FROM topic_comments WHERE id = ?', [req.params.id]);

        // Decrease reply count
        await pool.query('UPDATE topics SET replies = GREATEST(replies - 1, 0) WHERE id = ?', [comments[0].topic_id]);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Photo Comment
app.delete('/api/comments/:id', async (req, res) => {
    const { username } = req.body;
    try {
        const [comments] = await pool.query('SELECT username FROM comments WHERE id = ?', [req.params.id]);
        if (comments.length === 0) return res.status(404).json({ success: false, message: 'Comment not found' });

        const [users] = await pool.query('SELECT role FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'User not found' });

        if (users[0].role !== 'admin' && comments[0].username !== username) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

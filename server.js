const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const SALT_ROUNDS = 10;

// Register route — hash password before storing
app.post('/register', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const stmt = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        stmt.run([email, hashedPassword, role], function (err) {
            if (err) {
                console.error('❌ DB Insert Error:', err.message);
                return res.status(400).json({ error: 'Email already exists.' });
            }
            res.json({ success: true, userId: this.lastID });
        });
    } catch (err) {
        console.error('❌ Hashing Error:', err.message);
        res.status(500).json({ error: 'Internal error during registration.' });
    }
});
// Login route — compare password with hashed password
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('❌ DB Query Error:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        res.json({ success: true, user });
    });
});

app.listen(PORT, () => {
    console.log(`🔐 Server running at http://localhost:${PORT}`);
});
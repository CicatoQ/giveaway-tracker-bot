const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment');
const notifier = require('node-notifier');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('giveaways.db');

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        platform TEXT DEFAULT 'Facebook',
        post_url TEXT,
        requirements TEXT,
        deadline DATETIME,
        prize TEXT,
        status TEXT DEFAULT 'active',
        entry_completed BOOLEAN DEFAULT FALSE,
        follow_required BOOLEAN DEFAULT FALSE,
        like_required BOOLEAN DEFAULT FALSE,
        comment_required BOOLEAN DEFAULT FALSE,
        share_required BOOLEAN DEFAULT FALSE,
        tag_required BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giveaway_id INTEGER,
        action_type TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (giveaway_id) REFERENCES giveaways (id)
    )`);
});

// API Routes

// Get all giveaways
app.get('/api/giveaways', (req, res) => {
    const query = `
        SELECT g.*, 
               COUNT(e.id) as completed_actions
        FROM giveaways g 
        LEFT JOIN entries e ON g.id = e.giveaway_id 
        GROUP BY g.id 
        ORDER BY g.deadline ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add new giveaway
app.post('/api/giveaways', (req, res) => {
    const {
        title, author, platform, post_url, requirements, deadline, prize,
        follow_required, like_required, comment_required, share_required, tag_required
    } = req.body;

    const query = `
        INSERT INTO giveaways 
        (title, author, platform, post_url, requirements, deadline, prize,
         follow_required, like_required, comment_required, share_required, tag_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        title, author, platform, post_url, requirements, deadline, prize,
        follow_required, like_required, comment_required, share_required, tag_required
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Giveaway added successfully' });
    });
});

// Mark entry action as completed
app.post('/api/giveaways/:id/complete-action', (req, res) => {
    const { action_type, notes } = req.body;
    const giveaway_id = req.params.id;

    // Add entry record
    db.run(
        'INSERT INTO entries (giveaway_id, action_type, notes) VALUES (?, ?, ?)',
        [giveaway_id, action_type, notes],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Check if all required actions are completed
            checkAndUpdateGiveawayStatus(giveaway_id);
            res.json({ message: 'Action marked as completed' });
        }
    );
});

// Update giveaway status
app.put('/api/giveaways/:id/status', (req, res) => {
    const { status } = req.body;
    const id = req.params.id;

    db.run(
        'UPDATE giveaways SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Status updated successfully' });
        }
    );
});

// Delete giveaway
app.delete('/api/giveaways/:id', (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM entries WHERE giveaway_id = ?', [id]);
    db.run('DELETE FROM giveaways WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Giveaway deleted successfully' });
    });
});

// Helper function to check if all required actions are completed
function checkAndUpdateGiveawayStatus(giveaway_id) {
    db.get(
        'SELECT * FROM giveaways WHERE id = ?',
        [giveaway_id],
        (err, giveaway) => {
            if (err || !giveaway) return;

            db.all(
                'SELECT DISTINCT action_type FROM entries WHERE giveaway_id = ?',
                [giveaway_id],
                (err, entries) => {
                    if (err) return;

                    const completedActions = entries.map(e => e.action_type);
                    const requiredActions = [];

                    if (giveaway.follow_required) requiredActions.push('follow');
                    if (giveaway.like_required) requiredActions.push('like');
                    if (giveaway.comment_required) requiredActions.push('comment');
                    if (giveaway.share_required) requiredActions.push('share');
                    if (giveaway.tag_required) requiredActions.push('tag');

                    const allCompleted = requiredActions.every(action => 
                        completedActions.includes(action)
                    );

                    if (allCompleted && !giveaway.entry_completed) {
                        db.run(
                            'UPDATE giveaways SET entry_completed = TRUE WHERE id = ?',
                            [giveaway_id]
                        );
                    }
                }
            );
        }
    );
}

// Scheduled tasks for reminders
cron.schedule('0 9 * * *', () => {
    // Daily reminder at 9 AM
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
    
    db.all(
        'SELECT * FROM giveaways WHERE DATE(deadline) = ? AND status = "active"',
        [tomorrow],
        (err, rows) => {
            if (!err && rows.length > 0) {
                rows.forEach(giveaway => {
                    notifier.notify({
                        title: 'Giveaway Reminder',
                        message: `${giveaway.title} ends tomorrow!`,
                        sound: true
                    });
                });
            }
        }
    );
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Giveaway Tracker Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to access the application`);
});

module.exports = app;




const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const moment = require('moment');

// Replace with your bot token from BotFather
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Database setup
const db = new sqlite3.Database('telegram_giveaways.db');

// Initialize database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        organizer TEXT,
        platform TEXT DEFAULT 'Facebook',
        deadline DATETIME,
        prize TEXT,
        post_url TEXT,
        requirements TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giveaway_id INTEGER,
        user_id INTEGER,
        reminder_time DATETIME,
        sent BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (giveaway_id) REFERENCES giveaways (id)
    )`);
});

// Bot commands
const commands = {
    start: `
🎁 *Giveaway Tracker Bot*

Welcome! I'll help you track giveaway deadlines and information.

*Available Commands:*
/add - Add a new giveaway
/list - View all your giveaways
/today - Giveaways ending today
/week - Giveaways ending this week
/remove - Remove a giveaway
/help - Show this help message

Let's start tracking your giveaways! 🚀
    `,

    help: `
🔧 *How to Use Giveaway Tracker*

*Adding Giveaways:*
/add - Follow the prompts to add giveaway details

*Viewing Giveaways:*
/list - All giveaways
/today - Ending today
/week - Ending this week

*Managing:*
/remove - Delete a giveaway
/edit - Modify giveaway details

*Format for /add command:*
Just type /add and I'll guide you through each step!

*Example:*
Title: iPhone 15 Giveaway
Organizer: TechReviewer
Platform: Instagram
Deadline: 2024-01-15 23:59
Prize: iPhone 15 Pro
URL: https://instagram.com/p/xyz123

Need help? Just ask! 😊
    `
};

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, commands.start, { parse_mode: 'Markdown' });
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, commands.help, { parse_mode: 'Markdown' });
});

// Add giveaway command
bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Start the add giveaway process
    bot.sendMessage(chatId, "🎁 *Adding New Giveaway*\n\nLet's add a new giveaway! I'll ask you a few questions.\n\n📝 *Step 1:* What's the giveaway title?", { parse_mode: 'Markdown' });
    
    // Set user state for adding giveaway
    userStates.set(userId, { 
        action: 'adding_giveaway', 
        step: 'title',
        data: {}
    });
});

// User states for conversation flow
const userStates = new Map();

// Handle text messages for conversation flow
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // Skip if it's a command
    if (text && text.startsWith('/')) return;
    
    const userState = userStates.get(userId);
    if (!userState) return;
    
    handleConversationFlow(chatId, userId, text, userState);
});

// Handle conversation flow for adding giveaways
function handleConversationFlow(chatId, userId, text, userState) {
    if (userState.action === 'adding_giveaway') {
        const { step, data } = userState;
        
        switch (step) {
            case 'title':
                data.title = text;
                userState.step = 'organizer';
                bot.sendMessage(chatId, "👤 *Step 2:* Who's organizing this giveaway?", { parse_mode: 'Markdown' });
                break;
                
            case 'organizer':
                data.organizer = text;
                userState.step = 'platform';
                bot.sendMessage(chatId, "📱 *Step 3:* Which platform is it on? (Facebook, Instagram, Twitter, TikTok, etc.)", { parse_mode: 'Markdown' });
                break;
                
            case 'platform':
                data.platform = text;
                userState.step = 'deadline';
                bot.sendMessage(chatId, "⏰ *Step 4:* When does it end?\n\nFormat: YYYY-MM-DD HH:MM\nExample: 2024-01-15 23:59", { parse_mode: 'Markdown' });
                break;
                
            case 'deadline':
                if (!isValidDate(text)) {
                    bot.sendMessage(chatId, "❌ Invalid date format. Please use: YYYY-MM-DD HH:MM\nExample: 2024-01-15 23:59");
                    return;
                }
                data.deadline = text;
                userState.step = 'prize';
                bot.sendMessage(chatId, "🏆 *Step 5:* What's the prize?", { parse_mode: 'Markdown' });
                break;
                
            case 'prize':
                data.prize = text;
                userState.step = 'url';
                bot.sendMessage(chatId, "🔗 *Step 6:* Post URL (optional, send 'skip' to skip)", { parse_mode: 'Markdown' });
                break;
                
            case 'url':
                data.post_url = text === 'skip' ? '' : text;
                userState.step = 'requirements';
                bot.sendMessage(chatId, "📋 *Step 7:* What are the requirements? (like, follow, comment, etc.)", { parse_mode: 'Markdown' });
                break;
                
            case 'requirements':
                data.requirements = text;
                userState.step = 'notes';
                bot.sendMessage(chatId, "📝 *Step 8:* Any additional notes? (send 'skip' to skip)", { parse_mode: 'Markdown' });
                break;
                
            case 'notes':
                data.notes = text === 'skip' ? '' : text;
                
                // Save to database
                saveGiveaway(userId, data, (err, giveawayId) => {
                    if (err) {
                        bot.sendMessage(chatId, "❌ Error saving giveaway. Please try again.");
                        return;
                    }
                    
                    // Create reminder
                    createReminder(giveawayId, userId, data.deadline);
                    
                    // Success message
                    const summary = formatGiveawaySummary(data);
                    bot.sendMessage(chatId, `✅ *Giveaway Added Successfully!*\n\n${summary}\n\n🔔 I'll remind you before the deadline!`, { parse_mode: 'Markdown' });
                    
                    // Clear user state
                    userStates.delete(userId);
                });
                break;
        }
        
        userStates.set(userId, userState);
    }
}

// Validate date format
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = moment(dateString, 'YYYY-MM-DD HH:mm');
    return date.isValid() && date.isAfter(moment());
}

// Save giveaway to database
function saveGiveaway(userId, data, callback) {
    const query = `
        INSERT INTO giveaways 
        (user_id, title, organizer, platform, deadline, prize, post_url, requirements, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        userId, data.title, data.organizer, data.platform, 
        data.deadline, data.prize, data.post_url, data.requirements, data.notes
    ], function(err) {
        callback(err, this.lastID);
    });
}

// Create reminder
function createReminder(giveawayId, userId, deadline) {
    const deadlineDate = moment(deadline, 'YYYY-MM-DD HH:mm');
    
    // Create reminders: 24 hours, 6 hours, and 1 hour before
    const reminderTimes = [
        deadlineDate.clone().subtract(24, 'hours'),
        deadlineDate.clone().subtract(6, 'hours'),
        deadlineDate.clone().subtract(1, 'hour')
    ];
    
    reminderTimes.forEach(reminderTime => {
        if (reminderTime.isAfter(moment())) {
            db.run(
                'INSERT INTO reminders (giveaway_id, user_id, reminder_time) VALUES (?, ?, ?)',
                [giveawayId, userId, reminderTime.format('YYYY-MM-DD HH:mm:ss')]
            );
        }
    });
}

// Format giveaway summary
function formatGiveawaySummary(data) {
    const deadline = moment(data.deadline, 'YYYY-MM-DD HH:mm');
    const timeUntil = deadline.fromNow();
    
    return `🎁 *${data.title}*
👤 Organizer: ${data.organizer}
📱 Platform: ${data.platform}
⏰ Deadline: ${deadline.format('MMM DD, YYYY [at] HH:mm')} (${timeUntil})
🏆 Prize: ${data.prize}
📋 Requirements: ${data.requirements}
${data.post_url ? `🔗 [View Post](${data.post_url})` : ''}
${data.notes ? `📝 Notes: ${data.notes}` : ''}`;
}

// List giveaways command
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    db.all(
        'SELECT * FROM giveaways WHERE user_id = ? AND status = "active" ORDER BY deadline ASC',
        [userId],
        (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, "❌ Error retrieving giveaways.");
                return;
            }
            
            if (rows.length === 0) {
                bot.sendMessage(chatId, "📭 You don't have any active giveaways yet.\n\nUse /add to add your first giveaway!");
                return;
            }
            
            let message = `📋 *Your Active Giveaways (${rows.length})*\n\n`;
            
            rows.forEach((giveaway, index) => {
                const deadline = moment(giveaway.deadline);
                const timeUntil = deadline.fromNow();
                const isUrgent = deadline.diff(moment(), 'hours') < 24;
                
                message += `${index + 1}. ${isUrgent ? '🚨' : '🎁'} *${giveaway.title}*\n`;
                message += `   👤 ${giveaway.organizer} | 📱 ${giveaway.platform}\n`;
                message += `   ⏰ ${deadline.format('MMM DD, HH:mm')} (${timeUntil})\n`;
                message += `   🏆 ${giveaway.prize}\n\n`;
            });
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }
    );
});

// Today's giveaways
bot.onText(/\/today/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const today = moment().format('YYYY-MM-DD');
    
    db.all(
        'SELECT * FROM giveaways WHERE user_id = ? AND DATE(deadline) = ? AND status = "active" ORDER BY deadline ASC',
        [userId, today],
        (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, "❌ Error retrieving giveaways.");
                return;
            }
            
            if (rows.length === 0) {
                bot.sendMessage(chatId, "🎉 No giveaways ending today! You're all caught up.");
                return;
            }
            
            let message = `🚨 *Giveaways Ending Today (${rows.length})*\n\n`;
            
            rows.forEach((giveaway, index) => {
                const deadline = moment(giveaway.deadline);
                message += `${index + 1}. 🎁 *${giveaway.title}*\n`;
                message += `   👤 ${giveaway.organizer}\n`;
                message += `   ⏰ Ends at ${deadline.format('HH:mm')} (${deadline.fromNow()})\n`;
                message += `   🏆 ${giveaway.prize}\n`;
                if (giveaway.post_url) {
                    message += `   🔗 [View Post](${giveaway.post_url})\n`;
                }
                message += `\n`;
            });
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }
    );
});

// Week's giveaways
bot.onText(/\/week/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const nextWeek = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    
    db.all(
        'SELECT * FROM giveaways WHERE user_id = ? AND deadline <= ? AND status = "active" ORDER BY deadline ASC',
        [userId, nextWeek],
        (err, rows) => {
            if (err) {
                bot.sendMessage(chatId, "❌ Error retrieving giveaways.");
                return;
            }
            
            if (rows.length === 0) {
                bot.sendMessage(chatId, "📅 No giveaways ending this week!");
                return;
            }
            
            let message = `📅 *Giveaways Ending This Week (${rows.length})*\n\n`;
            
            rows.forEach((giveaway, index) => {
                const deadline = moment(giveaway.deadline);
                const isToday = deadline.isSame(moment(), 'day');
                const isTomorrow = deadline.isSame(moment().add(1, 'day'), 'day');
                
                let timeLabel = deadline.format('MMM DD');
                if (isToday) timeLabel = 'Today';
                else if (isTomorrow) timeLabel = 'Tomorrow';
                
                message += `${index + 1}. ${isToday ? '🚨' : '🎁'} *${giveaway.title}*\n`;
                message += `   👤 ${giveaway.organizer} | 📱 ${giveaway.platform}\n`;
                message += `   ⏰ ${timeLabel} at ${deadline.format('HH:mm')} (${deadline.fromNow()})\n\n`;
            });
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }
    );
});

// Remove giveaway command
bot.onText(/\/remove/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Get user's giveaways
    db.all(
        'SELECT id, title, organizer FROM giveaways WHERE user_id = ? AND status = "active" ORDER BY deadline ASC',
        [userId],
        (err, rows) => {
            if (err || rows.length === 0) {
                bot.sendMessage(chatId, "📭 No active giveaways to remove.");
                return;
            }
            
            let message = "🗑️ *Remove Giveaway*\n\nWhich giveaway would you like to remove?\n\n";
            
            const keyboard = rows.map((giveaway, index) => [{
                text: `${index + 1}. ${giveaway.title} (${giveaway.organizer})`,
                callback_data: `remove_${giveaway.id}`
            }]);
            
            keyboard.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
            
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        }
    );
});

// Handle callback queries (inline keyboard buttons)
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    if (data.startsWith('remove_')) {
        const giveawayId = data.split('_')[1];
        
        db.run(
            'UPDATE giveaways SET status = "removed" WHERE id = ? AND user_id = ?',
            [giveawayId, userId],
            function(err) {
                if (err) {
                    bot.answerCallbackQuery(callbackQuery.id, "❌ Error removing giveaway");
                    return;
                }
                
                bot.editMessageText("✅ Giveaway removed successfully!", {
                    chat_id: chatId,
                    message_id: msg.message_id
                });
                
                bot.answerCallbackQuery(callbackQuery.id, "Giveaway removed");
            }
        );
    } else if (data === 'cancel') {
        bot.editMessageText("❌ Cancelled", {
            chat_id: chatId,
            message_id: msg.message_id
        });
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

// Reminder system - Check every minute
cron.schedule('* * * * *', () => {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    
    db.all(
        `SELECT r.*, g.title, g.organizer, g.deadline, g.prize 
         FROM reminders r 
         JOIN giveaways g ON r.giveaway_id = g.id 
         WHERE r.reminder_time <= ? AND r.sent = FALSE AND g.status = 'active'`,
        [now],
        (err, reminders) => {
            if (err || !reminders.length) return;
            
            reminders.forEach(reminder => {
                const deadline = moment(reminder.deadline);
                const timeUntil = deadline.fromNow();
                
                const message = `🔔 *Giveaway Reminder*\n\n🎁 *${reminder.title}*\n👤 ${reminder.organizer}\n⏰ Ends ${timeUntil}\n🏆 ${reminder.prize}\n\n⚡ Time to complete your entry!`;
                
                bot.sendMessage(reminder.user_id, message, { parse_mode: 'Markdown' });
                
                // Mark reminder as sent
                db.run('UPDATE reminders SET sent = TRUE WHERE id = ?', [reminder.id]);
            });
        }
    );
});

// Error handling
bot.on('polling_error', (error) => {
    console.log('Polling error:', error);
});

console.log('🤖 Giveaway Tracker Bot is running...');
console.log('📝 To set up:');
console.log('1. Create a bot with @BotFather on Telegram');
console.log('2. Get your bot token');
console.log('3. Replace YOUR_BOT_TOKEN_HERE in this file');
console.log('4. Run: npm install node-telegram-bot-api sqlite3 node-cron moment');
console.log('5. Start the bot: node telegram_bot.js');

module.exports = bot;




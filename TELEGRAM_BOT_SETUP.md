# 🤖 Telegram Giveaway Tracker Bot Setup Guide

A personal Telegram bot to help you track giveaway deadlines, organizers, and requirements. Perfect for staying organized with your giveaway entries!

## 🚀 Quick Setup

### Step 1: Create Your Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Send** `/newbot`
4. **Choose a name** for your bot (e.g., "My Giveaway Tracker")
5. **Choose a username** (must end with 'bot', e.g., "mygiveaway_tracker_bot")
6. **Copy the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Install Dependencies

```bash
# Copy the package.json to package.json (rename it)
cp package_telegram.json package.json

# Install dependencies
npm install
```

### Step 3: Configure Your Bot

1. **Open** `telegram_bot.js`
2. **Replace** `YOUR_BOT_TOKEN_HERE` with your actual bot token from Step 1
3. **Save** the file

### Step 4: Run Your Bot

```bash
# Start the bot
npm start

# For development with auto-restart
npm run dev
```

## 📱 How to Use

### Basic Commands

- `/start` - Welcome message and bot introduction
- `/help` - Show all available commands
- `/add` - Add a new giveaway (guided process)
- `/list` - View all your active giveaways
- `/today` - See giveaways ending today
- `/week` - See giveaways ending this week
- `/remove` - Remove a giveaway from tracking

### Adding a Giveaway

1. **Send** `/add` to your bot
2. **Follow the prompts** to enter:
   - Giveaway title
   - Organizer name
   - Platform (Facebook, Instagram, etc.)
   - Deadline (YYYY-MM-DD HH:MM format)
   - Prize description
   - Post URL (optional)
   - Requirements (like, follow, comment, etc.)
   - Additional notes (optional)

**Example interaction:**
```
You: /add
Bot: 🎁 Adding New Giveaway
     Step 1: What's the giveaway title?

You: iPhone 15 Giveaway
Bot: Step 2: Who's organizing this giveaway?

You: TechReviewer
Bot: Step 3: Which platform is it on?

You: Instagram
Bot: Step 4: When does it end?
     Format: YYYY-MM-DD HH:MM

You: 2024-01-15 23:59
Bot: Step 5: What's the prize?

You: iPhone 15 Pro
Bot: Step 6: Post URL (optional, send 'skip' to skip)

You: https://instagram.com/p/xyz123
Bot: Step 7: What are the requirements?

You: Follow account, like post, comment with 3 friends tagged
Bot: Step 8: Any additional notes?

You: Must be 18+, US only
Bot: ✅ Giveaway Added Successfully!
     🔔 I'll remind you before the deadline!
```

## 🔔 Automatic Reminders

The bot automatically sends you reminders:
- **24 hours** before deadline
- **6 hours** before deadline  
- **1 hour** before deadline

Reminders include:
- Giveaway title and organizer
- Time remaining
- Prize information
- Quick access to requirements

## 📊 Viewing Your Giveaways

### `/list` - All Active Giveaways
Shows all your tracked giveaways with:
- Title and organizer
- Platform and deadline
- Time remaining
- Prize information
- Urgency indicators (🚨 for <24 hours)

### `/today` - Today's Deadlines
Shows only giveaways ending today with:
- Exact ending times
- Quick links to posts
- Priority sorting

### `/week` - This Week's Deadlines
Shows giveaways ending in the next 7 days:
- Organized by date
- Clear time labels (Today, Tomorrow, etc.)
- Easy overview of upcoming deadlines

## 🗑️ Managing Giveaways

### Remove Giveaways
1. **Send** `/remove`
2. **Choose** from the list of active giveaways
3. **Confirm** removal

Removed giveaways are marked as inactive but kept in the database for your records.

## 🛡️ Privacy & Security

- **Local Database**: All data stored locally in SQLite
- **Personal Use**: Bot only responds to your messages
- **No Data Sharing**: Information stays on your device
- **Secure**: No sensitive information required

## 📁 File Structure

```
giveaway-telegram-bot/
├── telegram_bot.js          # Main bot code
├── package.json             # Dependencies
├── telegram_giveaways.db    # SQLite database (created automatically)
├── TELEGRAM_BOT_SETUP.md    # This setup guide
└── README.md                # Project documentation
```

## 🔧 Advanced Features

### Custom Reminders
The bot creates multiple reminder times automatically, but you can modify the code to add more:

```javascript
// In createReminder function, add more reminder times:
const reminderTimes = [
    deadlineDate.clone().subtract(3, 'days'),   // 3 days before
    deadlineDate.clone().subtract(24, 'hours'), // 24 hours before
    deadlineDate.clone().subtract(6, 'hours'),  // 6 hours before
    deadlineDate.clone().subtract(1, 'hour')    // 1 hour before
];
```

### Database Access
You can view your data directly:

```bash
# Install SQLite3 CLI
npm install -g sqlite3

# Open database
sqlite3 telegram_giveaways.db

# View all giveaways
.tables
SELECT * FROM giveaways;
.exit
```

### Export Data
Add this to get a backup of your giveaways:

```javascript
// Add this command to telegram_bot.js
bot.onText(/\/export/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    db.all('SELECT * FROM giveaways WHERE user_id = ?', [userId], (err, rows) => {
        if (!err) {
            const data = JSON.stringify(rows, null, 2);
            bot.sendDocument(chatId, Buffer.from(data), {}, {
                filename: 'giveaways_backup.json',
                contentType: 'application/json'
            });
        }
    });
});
```

## 🐛 Troubleshooting

### Bot Not Responding
1. **Check token**: Make sure you replaced `YOUR_BOT_TOKEN_HERE`
2. **Check network**: Ensure internet connection
3. **Check logs**: Look for error messages in console
4. **Restart bot**: Stop and start the bot again

### Invalid Date Format
- Use format: `YYYY-MM-DD HH:MM`
- Example: `2024-01-15 23:59`
- Must be a future date

### Database Issues
- Delete `telegram_giveaways.db` to reset
- Bot will recreate tables automatically
- You'll lose existing data

### Permission Errors
- Make sure you have write permissions in the directory
- Run with `sudo` if necessary (not recommended)

## 🚀 Deployment Options

### Run on VPS/Server
```bash
# Install PM2 for process management
npm install -g pm2

# Start bot with PM2
pm2 start telegram_bot.js --name giveaway-bot

# Save PM2 configuration
pm2 save
pm2 startup
```

### Run on Heroku
1. Create `Procfile`:
```
worker: node telegram_bot.js
```

2. Set environment variable:
```bash
heroku config:set BOT_TOKEN=your_bot_token_here
```

3. Modify code to use environment variable:
```javascript
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
```

### Run on Railway/Render
Similar to Heroku, set environment variables and deploy.

## 📈 Usage Examples

### Scenario 1: Facebook Giveaway
```
Title: Corvan Vacuum Giveaway
Organizer: Khairul Abdullah
Platform: Facebook
Deadline: 2024-01-28 12:00
Prize: Corvan Wet & Dry Vacuum
URL: https://facebook.com/post/123
Requirements: Follow Corvan & Khairul Abdullah, Like & comment with 3 friends tagged, Share post
Notes: Giveaway ends 28/8 at 12pm, winner announced same day
```

### Scenario 2: Instagram Contest
```
Title: iPhone 15 Pro Giveaway
Organizer: TechReviewer
Platform: Instagram
Deadline: 2024-02-01 20:00
Prize: iPhone 15 Pro Max 256GB
URL: https://instagram.com/p/abc123
Requirements: Follow @techreviewer, Like this post, Tag 2 friends, Share to story
Notes: Must be following for 48 hours before winner selection
```

## 💡 Tips for Success

1. **Be Consistent**: Add giveaways as soon as you find them
2. **Check Daily**: Use `/today` command every morning
3. **Set Buffer Time**: Add deadlines 30 minutes before actual time
4. **Organize**: Use clear, descriptive titles
5. **Track Results**: Note which types of giveaways you win

## 🤝 Support

If you need help:
1. **Check this guide** for common solutions
2. **Review the code** - it's well-commented
3. **Test with simple examples** first
4. **Check Telegram Bot API docs** for advanced features

## 📝 License

MIT License - Free to use and modify for personal use.

---

**Happy giveaway tracking! 🎁🚀**

*Remember: This bot helps you organize information only. You still need to complete all giveaway requirements manually and legitimately.*




# Giveaway Tracker Bot

A Telegram bot for tracking giveaways with image recognition and OCR capabilities.

## Features

- 📸 **Image Recognition**: Send screenshots to automatically extract giveaway details
- 📊 **Analytics**: Track your giveaway participation and win/loss statistics
- 🔔 **Reminders**: Get notified before giveaway deadlines
- 📱 **Easy Management**: Add, edit, and remove giveaways easily

## Railway Deployment

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Connect GitHub Repository
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway will automatically detect it's a Node.js app

### Step 3: Set Environment Variables
In Railway dashboard, add these environment variables:
- `BOT_TOKEN`: Your Telegram bot token
- `OPENAI_API_KEY`: (Optional) For enhanced AI parsing
- `GOOGLE_VISION_API_KEY`: (Optional) For Google Vision OCR

### Step 4: Deploy
Railway will automatically deploy your bot and provide a URL.

## Local Development

```bash
npm install
node enhanced_telegram_bot.js
```

## Commands

- `/start` - Welcome message
- `/quick_add` - Send screenshot for automatic extraction
- `/add` - Manual giveaway entry
- `/list` - View all giveaways
- `/stats` - View your statistics
- `/help` - Show help

## Free Tier

This bot uses minimal resources and fits perfectly in Railway's free tier (500 hours/month).




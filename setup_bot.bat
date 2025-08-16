@echo off
echo 🤖 Setting up your Giveaway Tracker Bot...
echo.

echo 📂 Navigating to Bot folder...
cd /d "C:\Users\QotaciC\Desktop\Game Dev\Bot"

echo 📋 Checking current directory...
echo Current folder: %CD%
echo.

echo 📁 Files in this folder:
dir /b
echo.

echo 📦 Copying package file...
copy package_enhanced.json package.json
if %errorlevel% equ 0 (
    echo ✅ Package file copied successfully!
) else (
    echo ❌ Error copying package file
    pause
    exit /b 1
)
echo.

echo 📥 Installing dependencies (this may take 2-3 minutes)...
npm install
if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully!
) else (
    echo ❌ Error installing dependencies
    echo Make sure Node.js is installed from https://nodejs.org
    pause
    exit /b 1
)
echo.

echo 🎉 Setup complete! Next steps:
echo 1. Edit enhanced_telegram_bot.js
echo 2. Replace YOUR_BOT_TOKEN_HERE with your real bot token
echo 3. Run: npm start
echo.
pause



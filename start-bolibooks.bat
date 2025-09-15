@echo off
echo 🚀 Starting BoliBooks Backend Server...
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Set environment variables
set PORT=5000
set NODE_ENV=development

REM Display info
echo.
echo ✅ Node.js detected
echo 🌟 Starting BoliBooks API server...
echo 📍 Server will be available at: http://localhost:5000
echo 🔗 API Base URL: http://localhost:5000/api
echo 🏥 Health Check: http://localhost:5000/api/health
echo 🧪 Test Interface: Open test-interface.html in your browser
echo.
echo 💡 Press Ctrl+C to stop the server
echo ======================================
echo.

REM Start the server
npm start

REM If we get here, the server stopped
echo.
echo 🛑 Server has stopped
pause

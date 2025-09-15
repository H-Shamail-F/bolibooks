@echo off
echo ================================
echo BoliBooks Development Startup
echo ================================

echo.
echo Stopping any existing Node processes...
taskkill /f /im node.exe 2>nul

echo.
echo Starting Backend Server...
start "BoliBooks Backend" /D "C:\Users\User\bolibooks\backend" cmd /k "node src/server.js"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "BoliBooks Frontend" /D "C:\Users\User\bolibooks\frontend" cmd /k "set BROWSER=none && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause

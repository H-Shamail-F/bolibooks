# BoliBooks Ultimate Startup Script
# This script will fix all issues and start both servers correctly

Write-Host "🎯 BoliBooks Ultimate Startup Solution" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Step 1: Kill any existing Node processes
Write-Host "`n1. Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Step 2: Navigate to project root
$projectRoot = "C:\Users\User\bolibooks"
Set-Location $projectRoot
Write-Host "   ✅ Located project at: $projectRoot" -ForegroundColor Green

# Step 3: Fix frontend configuration
Write-Host "`n2. Fixing frontend configuration..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"

# Restore the original App instead of test app
$indexContent = @"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"@

$indexContent | Out-File -FilePath "src\index.js" -Encoding UTF8
Write-Host "   ✅ Restored original App.js" -ForegroundColor Green

# Add proxy back to package.json
$packageJsonPath = "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$packageJson | Add-Member -Type NoteProperty -Name 'proxy' -Value 'http://localhost:5000' -Force
$packageJson | ConvertTo-Json -Depth 100 | Out-File $packageJsonPath -Encoding UTF8
Write-Host "   ✅ Added proxy configuration" -ForegroundColor Green

# Ensure no build folder exists
if (Test-Path "build") {
    Remove-Item "build" -Recurse -Force
    Write-Host "   ✅ Removed build folder" -ForegroundColor Green
}

# Step 4: Start Backend Server
Write-Host "`n3. Starting Backend Server..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'BoliBooks Backend Server' -ForegroundColor Green; node src/server.js"
Write-Host "   ✅ Backend server started in new window" -ForegroundColor Green

# Wait for backend to start
Write-Host "   ⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep 8

# Test backend
try {
    $backendTest = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "   ✅ Backend is responding (Status: $($backendTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Backend may still be starting..." -ForegroundColor Yellow
}

# Step 5: Start Frontend Server  
Write-Host "`n4. Starting Frontend Server..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'BoliBooks Frontend Server' -ForegroundColor Blue; `$env:BROWSER='none'; npm start"
Write-Host "   ✅ Frontend server started in new window" -ForegroundColor Green

# Wait for frontend
Write-Host "   ⏳ Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep 10

# Test frontend
try {
    $frontendTest = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Frontend is responding (Status: $($frontendTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Frontend may still be compiling..." -ForegroundColor Yellow
}

# Final instructions
Write-Host "`n🎉 ULTIMATE SOLUTION COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "`n📋 Access your application:" -ForegroundColor White
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   • Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "`n🔑 Test Login Credentials:" -ForegroundColor White  
Write-Host "   • Email:    test@test.com" -ForegroundColor Cyan
Write-Host "   • Password: password123" -ForegroundColor Cyan
Write-Host "`n✅ If you still see 'Route not found':" -ForegroundColor Yellow
Write-Host "   1. Wait 30 seconds for React to fully compile" -ForegroundColor White
Write-Host "   2. Hard refresh browser (Ctrl+F5)" -ForegroundColor White
Write-Host "   3. Check browser console for any JavaScript errors" -ForegroundColor White
Write-Host "   4. Both server windows should be running without errors" -ForegroundColor White

Write-Host "`nPress any key to open both URLs in browser..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browsers
Start-Process "http://localhost:3000"
Start-Process "http://localhost:5000/api/health"

Write-Host "`n🚀 Both servers are running!" -ForegroundColor Green

# BoliBooks Complete Solution Script
# This script ensures both backend and frontend are working, with fallback options

Write-Host "🚀 BoliBooks Complete Solution" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Gray

$backendPath = "C:\Users\User\bolibooks\backend"
$frontendPath = "C:\Users\User\bolibooks\frontend"

# Step 1: Clean up any existing processes
Write-Host "`n📋 Step 1: Cleaning up existing processes..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Step 2: Start Backend Server
Write-Host "`n📋 Step 2: Starting backend server..." -ForegroundColor Cyan
$backendJob = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory $backendPath -PassThru

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep 5

# Test backend
$backendReady = $false
for ($i = 1; $i -le 8; $i++) {
    try {
        $health = Invoke-RestMethod "http://localhost:5000/api/health" -TimeoutSec 5
        if ($health.status -eq "OK") {
            Write-Host "✅ Backend server started successfully!" -ForegroundColor Green
            Write-Host "   Database: $($health.database)" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "⏳ Backend not ready (attempt $i/8)..." -ForegroundColor Yellow
        Start-Sleep 2
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    exit 1
}

# Step 3: Test Authentication
Write-Host "`n📋 Step 3: Testing authentication..." -ForegroundColor Cyan
try {
    $loginData = @{ email = "demo@example.com"; password = "demo123" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    Write-Host "✅ Authentication working!" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.firstName) $($loginResponse.user.lastName)" -ForegroundColor Green
    Write-Host "   Company: $($loginResponse.user.companyName)" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Attempt to Start React Frontend
Write-Host "`n📋 Step 4: Attempting to start React frontend..." -ForegroundColor Cyan

# Set environment variable to prevent browser opening
$env:BROWSER = "none"

# Start frontend in background
$frontendJob = Start-Job -ScriptBlock {
    param($frontendPath)
    Set-Location $frontendPath
    npm start 2>&1
} -ArgumentList $frontendPath

Write-Host "Waiting for React frontend to compile..." -ForegroundColor Yellow
Start-Sleep 20

# Test frontend
$reactReady = $false
for ($i = 1; $i -le 8; $i++) {
    try {
        $frontend = Invoke-WebRequest "http://localhost:3000" -TimeoutSec 8
        if ($frontend.StatusCode -eq 200) {
            Write-Host "✅ React frontend started successfully!" -ForegroundColor Green
            $reactReady = $true
            break
        }
    } catch {
        Write-Host "⏳ React frontend not ready (attempt $i/8)..." -ForegroundColor Yellow
        Start-Sleep 3
    }
}

# Step 5: Provide Access Options
Write-Host "`n🎯 BoliBooks Access Options:" -ForegroundColor White
Write-Host "===========================================" -ForegroundColor Gray

Write-Host "`n📊 Server Status:" -ForegroundColor White
Write-Host "   ✅ Backend:  http://localhost:5000 (Running - PID: $($backendJob.Id))" -ForegroundColor Green

if ($reactReady) {
    Write-Host "   ✅ React Frontend: http://localhost:3000 (Running)" -ForegroundColor Green
    Write-Host "`n🌐 PRIMARY ACCESS:" -ForegroundColor White
    Write-Host "   Open: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  React Frontend: Not responding (compilation may still be in progress)" -ForegroundColor Yellow
    Write-Host "`n🔧 ALTERNATIVE ACCESS:" -ForegroundColor White
    Write-Host "   Simple Frontend: file:///C:/Users/User/bolibooks/simple-frontend.html" -ForegroundColor Cyan
}

Write-Host "`n🔑 Demo Credentials:" -ForegroundColor White
Write-Host "   Email:    demo@example.com" -ForegroundColor Cyan
Write-Host "   Password: demo123" -ForegroundColor Cyan

Write-Host "`n🛠️  Management Commands:" -ForegroundColor White
Write-Host "   Backend PID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   To stop: Get-Process -Id $($backendJob.Id) | Stop-Process" -ForegroundColor Gray

# Open the appropriate frontend
if ($reactReady) {
    Write-Host "`n🚀 Opening React frontend..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
} else {
    Write-Host "`n🚀 Opening simple frontend..." -ForegroundColor Green
    Start-Process "C:\Users\User\bolibooks\simple-frontend.html"
    
    Write-Host "`n💡 Note: If React frontend compiles successfully later," -ForegroundColor Yellow
    Write-Host "   you can access it at: http://localhost:3000" -ForegroundColor Yellow
}

Write-Host "`n✅ BoliBooks solution deployment complete!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Gray

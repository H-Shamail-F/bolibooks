#!/usr/bin/env pwsh
# BoliBooks Ultimate Startup Script - Fixed Version
# This script starts both backend and frontend servers and verifies they're running

param(
    [switch]$SkipKillProcesses = $false,
    [switch]$SkipDependencies = $false
)

Write-Host "🚀 BoliBooks Ultimate Startup Script - Fixed Version" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

# Function to kill processes on specific ports
function Kill-ProcessOnPort {
    param([int]$Port)
    
    Write-Host "🔍 Checking for processes on port $Port..." -ForegroundColor Yellow
    $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($process in $processes) {
            $pid = $process.OwningProcess
            Write-Host "   ⚡ Killing process $pid on port $Port" -ForegroundColor Red
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Start-Sleep 1
            } catch {
                Write-Host "      ⚠️ Could not kill process $pid" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ✅ Port $Port is free" -ForegroundColor Green
    }
}

# Step 1: Clean up existing processes
if (-not $SkipKillProcesses) {
    Write-Host "`n📋 Step 1: Cleaning up existing processes..." -ForegroundColor Cyan
    Kill-ProcessOnPort -Port 3000
    Kill-ProcessOnPort -Port 5000
    
    # Kill any remaining node processes
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "   ⚡ Killing node process $($_.Id)" -ForegroundColor Red
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep 2
}

# Step 2: Verify project structure
Write-Host "`n📋 Step 2: Verifying project structure..." -ForegroundColor Cyan
$projectRoot = "C:\Users\User\bolibooks"
$backendPath = "$projectRoot\backend"
$frontendPath = "$projectRoot\frontend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Project structure verified" -ForegroundColor Green

# Step 3: Install dependencies if needed
if (-not $SkipDependencies) {
    Write-Host "`n📋 Step 3: Checking dependencies..." -ForegroundColor Cyan
    
    if (-not (Test-Path "$backendPath\node_modules")) {
        Write-Host "   📦 Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location $backendPath
        & npm install --silent
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
            exit 1
        }
    }
    
    if (-not (Test-Path "$frontendPath\node_modules")) {
        Write-Host "   📦 Installing frontend dependencies..." -ForegroundColor Yellow
        Set-Location $frontendPath
        & npm install --silent
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "   ✅ Dependencies verified" -ForegroundColor Green
}

# Step 4: Start backend server
Write-Host "`n📋 Step 4: Starting backend server..." -ForegroundColor Cyan
Set-Location $backendPath

# Start backend in new window
$backendJob = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory $backendPath -PassThru -WindowStyle Normal

Write-Host "   🔄 Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep 5

# Test backend health
$backendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5
        if ($healthResponse.status -eq "OK") {
            Write-Host "   ✅ Backend server started successfully on port 5000" -ForegroundColor Green
            Write-Host "      Database: $($healthResponse.database)" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "   ⏳ Backend not ready yet (attempt $i/10)..." -ForegroundColor Yellow
        Start-Sleep 3
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend failed to start properly" -ForegroundColor Red
    exit 1
}

# Step 5: Start frontend server
Write-Host "`n📋 Step 5: Starting frontend server..." -ForegroundColor Cyan
Set-Location $frontendPath

# Start frontend in new window
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendPath -PassThru -WindowStyle Normal

Write-Host "   🔄 Waiting for frontend to compile and start..." -ForegroundColor Yellow
Start-Sleep 15

# Test frontend accessibility
$frontendReady = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Host "   ✅ Frontend server started successfully on port 3000" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        Write-Host "   ⏳ Frontend not ready yet (attempt $i/15)..." -ForegroundColor Yellow
        Start-Sleep 5
    }
}

if (-not $frontendReady) {
    Write-Host "⚠️ Frontend may still be compiling, but continuing..." -ForegroundColor Yellow
}

# Step 6: Test integration
Write-Host "`n📋 Step 6: Testing API integration..." -ForegroundColor Cyan
try {
    # Test login
    $loginData = @{
        email = "demo@example.com"
        password = "demo123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    Write-Host "   ✅ Authentication test passed" -ForegroundColor Green
    Write-Host "      Demo user: $($loginResponse.user.firstName) $($loginResponse.user.lastName)" -ForegroundColor Green
    Write-Host "      Company: $($loginResponse.user.companyName)" -ForegroundColor Green
    
} catch {
    Write-Host "   ⚠️ Authentication test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 7: Summary and next steps
Write-Host "`n🎉 BoliBooks Startup Complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`n📊 Server Status:" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000 ✅ Running" -ForegroundColor Green
if ($frontendReady) {
    Write-Host "   Frontend: http://localhost:3000 ✅ Running" -ForegroundColor Green
} else {
    Write-Host "   Frontend: http://localhost:3000 ⏳ Starting..." -ForegroundColor Yellow
}

Write-Host "`n🔑 Demo Credentials:" -ForegroundColor White
Write-Host "   Email:    demo@example.com" -ForegroundColor Cyan
Write-Host "   Password: demo123" -ForegroundColor Cyan

Write-Host "`n🌐 Next Steps:" -ForegroundColor White
Write-Host "   1. Open your browser and go to: http://localhost:3000" -ForegroundColor Gray
Write-Host "   2. Login with the demo credentials above" -ForegroundColor Gray
Write-Host "   3. Explore the BoliBooks dashboard and features" -ForegroundColor Gray

Write-Host "`n🛠️ Management:" -ForegroundColor White
Write-Host "   - Both servers are running in separate windows" -ForegroundColor Gray
Write-Host "   - Close the terminal windows to stop servers" -ForegroundColor Gray
Write-Host "   - Backend PID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   - Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray

# Open browser automatically
Write-Host "`n🚀 Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`n✅ Startup script completed successfully!" -ForegroundColor Green

# BoliBooks Server Startup Script
param(
    [switch]$SkipKill = $false
)

Write-Host "Starting BoliBooks Application..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Gray

# Kill existing processes if needed
if (-not $SkipKill) {
    Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
}

# Verify paths
$backendPath = "C:\Users\User\bolibooks\backend"
$frontendPath = "C:\Users\User\bolibooks\frontend"

Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendJob = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory $backendPath -PassThru

Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep 5

# Test backend
$backendReady = $false
for ($i = 1; $i -le 8; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5
        if ($health.status -eq "OK") {
            Write-Host "Backend started successfully!" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "Backend not ready (attempt $i/8)..." -ForegroundColor Yellow
        Start-Sleep 2
    }
}

if (-not $backendReady) {
    Write-Host "Backend failed to start!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting frontend server..." -ForegroundColor Cyan
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendPath -PassThru

Write-Host "Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep 20

# Test frontend
$frontendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 8
        if ($response.StatusCode -eq 200) {
            Write-Host "Frontend started successfully!" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        Write-Host "Frontend not ready (attempt $i/10)..." -ForegroundColor Yellow
        Start-Sleep 5
    }
}

# Summary
Write-Host "`nBoliBooks Application Status:" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000 - Running" -ForegroundColor Green
if ($frontendReady) {
    Write-Host "Frontend: http://localhost:3000 - Running" -ForegroundColor Green
} else {
    Write-Host "Frontend: http://localhost:3000 - Starting..." -ForegroundColor Yellow
}

Write-Host "`nDemo Credentials:" -ForegroundColor White
Write-Host "Email: demo@example.com" -ForegroundColor Cyan
Write-Host "Password: demo123" -ForegroundColor Cyan

Write-Host "`nServer Process IDs:" -ForegroundColor White
Write-Host "Backend PID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host "Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray

Write-Host "`nOpening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`nServers are starting up. Check the browser in a moment!" -ForegroundColor Green

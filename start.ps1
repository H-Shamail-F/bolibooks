Write-Host "BoliBooks Quick Start" -ForegroundColor Green

# Kill any existing node processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "C:\Users\User\bolibooks\backend"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd 'C:\Users\User\bolibooks\backend'; npm start")

# Wait for backend to start
Start-Sleep -Seconds 8

# Test backend health
Write-Host "Testing backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    Write-Host "Backend is healthy: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "Backend health check failed, but continuing..." -ForegroundColor Yellow
}

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Set-Location "C:\Users\User\bolibooks\frontend"
$env:BROWSER = "none"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd 'C:\Users\User\bolibooks\frontend'; `$env:BROWSER='none'; npm start")

Write-Host "Both servers are starting in separate windows" -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan  
Write-Host "Backend API available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Quick start completed!" -ForegroundColor Green

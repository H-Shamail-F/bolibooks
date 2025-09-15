# BoliBooks Fix and Start Script
Write-Host "BoliBooks Fix and Start" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Gray

# Kill existing processes
Write-Host "Cleaning up processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Start backend
Write-Host "Starting backend..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory "C:\Users\User\bolibooks\backend" -PassThru
Start-Sleep 5

# Test backend
try {
    $health = Invoke-RestMethod "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Host "Backend: OK ($($health.database))" -ForegroundColor Green
} catch {
    Write-Host "Backend: Failed" -ForegroundColor Red
    exit 1
}

# Test authentication
try {
    $loginData = @{ email = "demo@example.com"; password = "demo123" } | ConvertTo-Json
    $login = Invoke-RestMethod "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "Auth: $($login.user.firstName) $($login.user.lastName)" -ForegroundColor Green
} catch {
    Write-Host "Auth: Failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Server Status:" -ForegroundColor White
Write-Host "- Backend: http://localhost:5000 (PID: $($backend.Id))" -ForegroundColor Green
Write-Host "- Simple Frontend: Opening in browser..." -ForegroundColor Yellow

Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor White
Write-Host "Email: demo@example.com" -ForegroundColor Cyan
Write-Host "Password: demo123" -ForegroundColor Cyan

# Open simple frontend
Start-Process "C:\Users\User\bolibooks\simple-frontend.html"

Write-Host ""
Write-Host "BoliBooks is ready!" -ForegroundColor Green

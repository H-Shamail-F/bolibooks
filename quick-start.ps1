# BoliBooks Quick Start Script
Write-Host "🚀 BoliBooks Quick Start" -ForegroundColor Green

# Change to backend directory and start server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "C:\Users\User\bolibooks\backend"

# Kill any existing node processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Start backend server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\User\bolibooks\backend'; npm start" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Test backend health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    Write-Host "✅ Backend is healthy: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend health check failed, but continuing..." -ForegroundColor Yellow
}

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Set-Location "C:\Users\User\bolibooks\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\User\bolibooks\frontend'; $env:BROWSER='none'; npm start" -WindowStyle Normal

Write-Host "✅ Both servers should be starting in separate windows" -ForegroundColor Green
Write-Host "🌐 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📡 Backend API available at: http://localhost:5000" -ForegroundColor Cyan

# Run a comprehensive test
Write-Host "🧪 Running system test in 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$testScript = @"
# BoliBooks System Test
Write-Host "🧪 Testing BoliBooks System..." -ForegroundColor Green

try {
    # Test backend health
    `$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health"
    Write-Host "✅ Backend Health: `$(`$health.message)" -ForegroundColor Green
    
    # Test frontend connection
    `$frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    if (`$frontend.StatusCode -eq 200) {
        Write-Host "✅ Frontend is responding" -ForegroundColor Green
    }
    
    Write-Host "🎉 System test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  Test failed: `$(`$_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $testScript -WindowStyle Normal

Write-Host "✅ Quick start completed!" -ForegroundColor Green

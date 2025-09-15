# BoliBooks Quick Fix and Debug Script
Write-Host "🚀 BoliBooks Quick Fix & Debug" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Gray

# Kill all existing processes
Write-Host "`n📋 Cleaning up processes..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# Start backend
Write-Host "`n📋 Starting backend server..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory "C:\Users\User\bolibooks\backend" -PassThru
Write-Host "Backend PID: $($backend.Id)" -ForegroundColor Gray
Start-Sleep 5

# Test backend
Write-Host "`n📋 Testing backend..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Host "✅ Backend: $($health.status) - Database: $($health.database)" -ForegroundColor Green
    
    # Test authentication
    $loginData = @{ email = "demo@example.com"; password = "demo123" } | ConvertTo-Json
    $login = Invoke-RestMethod "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Auth: Demo user login works" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Issue: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Start frontend
Write-Host "`n📋 Starting frontend server..." -ForegroundColor Cyan
$frontend = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "C:\Users\User\bolibooks\frontend" -PassThru -WindowStyle Normal
Write-Host "Frontend PID: $($frontend.Id)" -ForegroundColor Gray

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to compile (30 seconds)..." -ForegroundColor Yellow
Start-Sleep 30

# Test frontend
Write-Host "`n📋 Testing frontend..." -ForegroundColor Cyan
$frontendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest "http://localhost:3000" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend: React app responding" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        Write-Host "⏳ Frontend not ready (attempt $i/5)..." -ForegroundColor Yellow
        Start-Sleep 5
    }
}

Write-Host "`n🎯 System Status:" -ForegroundColor White
Write-Host "=================================" -ForegroundColor Gray
Write-Host "✅ Backend:  http://localhost:5000 (PID: $($backend.Id))" -ForegroundColor Green

if ($frontendReady) {
    Write-Host "✅ Frontend: http://localhost:3000 (PID: $($frontend.Id))" -ForegroundColor Green
    Write-Host "`n🌐 Access Options:" -ForegroundColor White
    Write-Host "- React App: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "- Simple UI: file:///C:/Users/User/bolibooks/simple-frontend.html" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Frontend: Still starting (PID: $($frontend.Id))" -ForegroundColor Yellow
    Write-Host "`n🌐 Access Options:" -ForegroundColor White
    Write-Host "- Wait for React: http://localhost:3000 (may take more time)" -ForegroundColor Yellow
    Write-Host "- Use Simple UI: file:///C:/Users/User/bolibooks/simple-frontend.html" -ForegroundColor Cyan
}

Write-Host "`n🔑 Demo Credentials:" -ForegroundColor White
Write-Host "Email: demo@example.com" -ForegroundColor Cyan  
Write-Host "Password: demo123" -ForegroundColor Cyan

Write-Host "`n🐛 Debug Info:" -ForegroundColor White
Write-Host "- Added debug logging to authentication" -ForegroundColor Gray
Write-Host "- Fixed API proxy configuration" -ForegroundColor Gray
Write-Host "- Check browser console for detailed logs" -ForegroundColor Gray

Write-Host "`n🚀 Opening applications..." -ForegroundColor Green
Start-Process "http://localhost:3000"

if (-not $frontendReady) {
    Start-Sleep 2
    Start-Process "C:\Users\User\bolibooks\simple-frontend.html"
}

Write-Host "`n✅ Quick fix deployment complete!" -ForegroundColor Green
Write-Host "If React frontend has issues, check browser console for debug messages." -ForegroundColor Yellow
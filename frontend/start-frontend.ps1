# Frontend Startup Script with Error Handling
param([string]$LogFile = "frontend-startup.log")

Write-Host "Starting BoliBooks Frontend..." -ForegroundColor Green

# Set environment variables to prevent browser auto-opening
$env:BROWSER = "none"
$env:REACT_APP_API_URL = "http://localhost:5000"

# Change to frontend directory
Set-Location "C:\Users\User\bolibooks\frontend"

Write-Host "Environment:" -ForegroundColor Cyan
Write-Host "- Working Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "- Node Version: $(& node --version)" -ForegroundColor Gray
Write-Host "- NPM Version: $(& npm --version)" -ForegroundColor Gray

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & npm install
}

Write-Host "Starting React development server..." -ForegroundColor Cyan

# Start the server and capture output
try {
    & npm start 2>&1 | Tee-Object -FilePath $LogFile -Append
} catch {
    Write-Host "Error starting frontend: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Frontend process ended. Check $LogFile for details." -ForegroundColor Yellow

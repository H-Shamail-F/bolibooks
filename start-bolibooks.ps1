# BoliBooks Startup Script
# Run this script to start the BoliBooks backend server

param(
    [int]$Port = 5000,
    [switch]$Dev,
    [switch]$Force
)

function Write-ColorText($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

function Test-Port($Port) {
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

Write-ColorText "🚀 BoliBooks Startup Manager" "Green"
Write-ColorText "============================" "Magenta"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-ColorText "✅ Node.js version: $nodeVersion" "Green"
} catch {
    Write-ColorText "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" "Red"
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "backend"
if (!(Test-Path $backendPath)) {
    Write-ColorText "❌ Backend directory not found: $backendPath" "Red"
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location -Path $backendPath

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-ColorText "📦 Installing dependencies..." "Yellow"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "❌ Failed to install dependencies" "Red"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if port is available
if (Test-Port -Port $Port) {
    Write-ColorText "⚠️  Port $Port is already in use" "Yellow"
    
    if ($Force) {
        Write-ColorText "🔧 Force flag detected, killing process on port $Port..." "Yellow"
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($process) {
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    } else {
        Write-ColorText "💡 You can:" "Cyan"
        Write-ColorText "   1. Use a different port: .\start-bolibooks.ps1 -Port 3001" "White"
        Write-ColorText "   2. Force kill existing process: .\start-bolibooks.ps1 -Force" "White"
        Write-ColorText "   3. Stop the existing server manually" "White"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Set environment variables
$env:PORT = $Port
if ($Dev) {
    $env:NODE_ENV = "development"
    $scriptCommand = "npm run dev"
    Write-ColorText "🔧 Development mode enabled (auto-restart on changes)" "Cyan"
} else {
    $scriptCommand = "npm start"
}

# Display startup info
Write-ColorText "" 
Write-ColorText "🌟 Starting BoliBooks API server..." "Cyan"
Write-ColorText "📍 Server will be available at: http://localhost:$Port" "Cyan"
Write-ColorText "🔗 API Base URL: http://localhost:$Port/api" "Cyan"
Write-ColorText "🏥 Health Check: http://localhost:$Port/api/health" "Cyan"
Write-ColorText "🧪 Test Interface: file://$PSScriptRoot\test-interface.html" "Cyan"
Write-ColorText "" 
Write-ColorText "💡 Tips:" "Yellow"
Write-ColorText "   • Press Ctrl+C to stop the server" "White"
Write-ColorText "   • Open test-interface.html in your browser to test the API" "White"
Write-ColorText "   • Use -Dev flag for development mode with auto-restart" "White"
Write-ColorText "" 
Write-ColorText "======================================" "Magenta"
Write-ColorText "" 

# Start the server
try {
    Invoke-Expression $scriptCommand
} catch {
    Write-ColorText "" 
    Write-ColorText "❌ Server failed to start: $($_.Exception.Message)" "Red"
    Write-ColorText "" 
    Write-ColorText "🔧 Troubleshooting:" "Yellow"
    Write-ColorText "   • Check if another process is using port $Port" "White"
    Write-ColorText "   • Try running with -Force flag to kill existing processes" "White"
    Write-ColorText "   • Check the error message above for specific issues" "White"
    Write-ColorText "" 
    Read-Host "Press Enter to exit"
    exit 1
}

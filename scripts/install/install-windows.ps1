# BoliBooks Windows Installer (PowerShell)
# Run as Administrator in PowerShell:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   iwr -useb https://raw.githubusercontent.com/your-org/bolibooks/main/scripts/install/install-windows.ps1 | iex
# Or download and run:
#   .\install-windows.ps1 -ProjectPath "C:\\bolibooks" -PrimaryDomain "bolibooks.local"

param(
  [string]$ProjectPath = "C:\\bolibooks",
  [string]$PrimaryDomain = "bolibooks.local",
  [string]$ApiPath = "/api"
)

$ErrorActionPreference = 'Stop'

function Ensure-Admin {
  if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Please run PowerShell as Administrator."
    exit 1
  }
}

function Install-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js LTS via winget..."
    winget install -e --id OpenJS.NodeJS.LTS -h --accept-package-agreements --accept-source-agreements
  } else {
    Write-Host "Node.js already installed"
  }
}

function Install-PM2 {
  if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "Installing PM2 globally..."
    npm install -g pm2
  }
}

function Prepare-Project {
  New-Item -ItemType Directory -Force -Path $ProjectPath | Out-Null
  Set-Location $ProjectPath

  if (-not (Test-Path "$ProjectPath\\backend")) {
    Write-Error "Expected project structure not found. Copy the bolibooks folder here first."
    exit 1
  }

  if (Test-Path "$ProjectPath\\backend\\.env.production") {
    Copy-Item "$ProjectPath\\backend\\.env.production" "$ProjectPath\\backend\\.env" -Force
  }
  if (Test-Path "$ProjectPath\\frontend\\.env.production") {
    Copy-Item "$ProjectPath\\frontend\\.env.production" "$ProjectPath\\frontend\\.env" -Force
  }

  # Update env values
  (Get-Content "$ProjectPath\\backend\\.env") -replace "^CLIENT_URL=.*", "CLIENT_URL=http://$PrimaryDomain" | Set-Content "$ProjectPath\\backend\\.env"
  (Get-Content "$ProjectPath\\backend\\.env") -replace "^DATABASE_URL=.*", "DATABASE_URL=$ProjectPath\\database.sqlite" | Set-Content "$ProjectPath\\backend\\.env"

  $apiUrl = "http://$PrimaryDomain$ApiPath"
  (Get-Content "$ProjectPath\\frontend\\.env") -replace "^REACT_APP_API_URL=.*", "REACT_APP_API_URL=$apiUrl" | Set-Content "$ProjectPath\\frontend\\.env"
  (Get-Content "$ProjectPath\\frontend\\.env") -replace "^REACT_APP_BASE_URL=.*", "REACT_APP_BASE_URL=http://$PrimaryDomain" | Set-Content "$ProjectPath\\frontend\\.env"
}

function Install-Dependencies {
  Write-Host "Installing backend dependencies..."
  pushd "$ProjectPath\\backend"; npm install --production; popd

  Write-Host "Installing frontend dependencies and building..."
  pushd "$ProjectPath\\frontend"; npm install --production; npm run build; popd
}

function Configure-PM2 {
  Write-Host "Configuring PM2 processes..."
  $ecosystem = @"
module.exports = {
  apps: [
    {
      name: 'bolibooks-backend',
      script: '.\\backend\\src\\server.js',
      env: { NODE_ENV: 'production', PORT: 5000 }
    }
  ]
}
"@
  $ecosystemPath = Join-Path $ProjectPath "pm2.ecosystem.js"
  $ecosystem | Set-Content $ecosystemPath -Encoding UTF8

  pm2 start $ecosystemPath | Out-Null
  pm2 save | Out-Null
}

function Show-NextSteps {
  Write-Host "`nInstallation complete!" -ForegroundColor Green
  Write-Host "Backend: http://localhost:5000/api/health"
  Write-Host "Frontend build output: $ProjectPath\frontend\build"
  Write-Host "You can serve the frontend build with IIS, Nginx for Windows, or a static server (e.g., 'npx serve -s build')."
  Write-Host "`nFor development, you can run:"
  Write-Host "  cd $ProjectPath\frontend; npx react-scripts start" -ForegroundColor Yellow
  Write-Host "`nPM2 commands:"
  Write-Host "  pm2 ls"; Write-Host "  pm2 logs"; Write-Host "  pm2 restart all"
}

Ensure-Admin
Install-Node
Install-PM2
Prepare-Project
Install-Dependencies
Configure-PM2
Show-NextSteps


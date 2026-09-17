# Builds GitDesk for Windows: detects your Windows version and CPU
# architecture, makes sure Node.js/npm and git are available, installs
# project dependencies, and packages the app with electron-builder into an
# NSIS installer and a portable .exe. Run it from PowerShell after cloning
# the repo:
#
#   .\scripts\build-windows.ps1
#
# If script execution is disabled, run once:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "!! $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "error: $msg" -ForegroundColor Red; exit 1 }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# --- Detect Windows version and architecture --------------------------------
$os = Get-CimInstance Win32_OperatingSystem
$arch = $env:PROCESSOR_ARCHITECTURE
Write-Step "Detected: $($os.Caption) (build $($os.BuildNumber)), arch=$arch"

$targetArch = switch ($arch) {
  'ARM64' { 'arm64' }
  default { 'x64' }
}

# --- Ensure git is available -------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Warn "git not found."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step "Installing Git via winget..."
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
  } else {
    Die "Please install git manually from https://git-scm.com/download/win, then re-run this script."
  }
}

# --- Ensure Node.js/npm are available and recent enough ---------------------
$minNodeMajor = 18
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
  $nodeVersion = (node -p "process.versions.node.split('.')[0]")
  if ([int]$nodeVersion -ge $minNodeMajor) {
    $nodeOk = $true
  } else {
    Write-Warn "Found Node.js $(node -v), but $minNodeMajor+ is required."
  }
} else {
  Write-Warn "Node.js not found."
}

if (-not $nodeOk) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step "Installing Node.js LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
    Write-Warn "Node.js was just installed. Close this window and re-run the script from a new PowerShell session so PATH updates take effect."
    exit 0
  } else {
    Die "Install Node.js 18+ manually from https://nodejs.org and re-run this script."
  }
}

Write-Step "Using Node.js $(node -v) / npm $(npm -v)"

# --- Install deps and build --------------------------------------------------
Set-Location $ProjectDir

Write-Step "Installing project dependencies (npm ci)..."
if (Test-Path package-lock.json) {
  npm ci
} else {
  npm install
}
if ($LASTEXITCODE -ne 0) { Die "npm install failed." }

Write-Step "Compiling GitDesk (electron-vite build)..."
npm run build
if ($LASTEXITCODE -ne 0) { Die "Build failed." }

Write-Step "Packaging Windows installer (nsis + portable, $targetArch)..."
npx electron-builder --win nsis portable --$targetArch
if ($LASTEXITCODE -ne 0) { Die "electron-builder failed." }

Write-Host ""
Write-Step "Done. Build artifacts are in: $ProjectDir\release"
Get-ChildItem "$ProjectDir\release" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  - $($_.Name)" }

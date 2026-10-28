# Sync Script for DentaBook Repository
param(
    [string]$Message = ""
)

$Host.UI.RawUI.WindowTitle = "DentaBook - Git Sync"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   DentaBook Cloud Sync & Backup Tool    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure git and gh are in PATH if installed in user local AppData
$gitCmd = "$env:LOCALAPPDATA\Programs\Git\cmd"
$ghCmd = "$env:LOCALAPPDATA\Programs\gh"
if (Test-Path $gitCmd) {
    $env:PATH = "$gitCmd;$ghCmd;$env:PATH"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is not found in PATH." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/4] Pulling latest changes from remote..." -ForegroundColor Yellow
git pull --rebase origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: git pull encountered an issue. Check for conflicts if any." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[2/4] Checking local changes..." -ForegroundColor Yellow
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes detected. Your local copy is completely up to date!" -ForegroundColor Green
    Write-Host ""
    pause
    exit 0
}

Write-Host "[3/4] Staging changes..." -ForegroundColor Yellow
git add -A

if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $defaultMessage = "Backup & sync: $timestamp"
    $userMsg = Read-Host "Enter commit message (Press Enter for '$defaultMessage')"
    if ([string]::IsNullOrWhiteSpace($userMsg)) {
        $Message = $defaultMessage
    } else {
        $Message = $userMsg
    }
}

git commit -m "$Message"

Write-Host "[4/4] Pushing to GitHub (origin/main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   Backup and Sync Completed Successfully! " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to push to GitHub. Verify internet access and GitHub login." -ForegroundColor Red
}

Write-Host ""
pause


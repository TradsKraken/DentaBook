$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $workspace '.local'
$pgControl = Join-Path $runtime 'postgresql/pgsql/bin/pg_ctl.exe'
$pgData = Join-Path $runtime 'postgres-data'
$logs = Join-Path $runtime 'logs'
if (-not (Test-Path -LiteralPath $pgControl) -or -not (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    throw 'The native PostgreSQL installation is not initialized. See docs/10_LOCAL_TESTING.md.'
}
if (-not (Test-Path -LiteralPath (Join-Path $workspace 'server/.env'))) { throw 'The local server environment is missing.' }
New-Item -ItemType Directory -Force -Path $logs | Out-Null
& $pgControl -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
    $postgresLog = Join-Path $logs 'postgresql.log'
    $pgArguments = @('-D', ('"{0}"' -f $pgData), '-l', ('"{0}"' -f $postgresLog), '-o', '"-h 127.0.0.1 -p 55432"', '-w', 'start')
    $pgStarter = Start-Process -FilePath $pgControl -ArgumentList $pgArguments -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'pg-start.stdout.log') -RedirectStandardError (Join-Path $logs 'pg-start.stderr.log') -PassThru
    if (-not $pgStarter.WaitForExit(30000) -or $pgStarter.ExitCode -ne 0) { throw 'PostgreSQL could not start. Check .local/logs/postgresql.log.' }
}
function Get-ApiHealth {
    try { return Invoke-RestMethod -TimeoutSec 5 -Uri 'http://127.0.0.1:5000/api/health' }
    catch { return $null }
}
$health = Get-ApiHealth
if (-not $health) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue
    if ($listener) { throw 'Port 5000 is occupied by a service that is not responding as the DentaBook API.' }
    $node = (Get-Command node.exe).Source
    $apiProcess = Start-Process -FilePath $node -ArgumentList 'index.js' -WorkingDirectory (Join-Path $workspace 'server') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'api.stdout.log') -RedirectStandardError (Join-Path $logs 'api.stderr.log') -PassThru
    $apiProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'api.pid')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        $health = Get-ApiHealth
        if ($health) { break }
        if ($apiProcess.HasExited) { throw 'The API stopped during startup. Check .local/logs/api.stderr.log.' }
    }
}
if ($health.service -ne 'dentabook-api' -or $health.status -ne 'healthy') { throw 'The API is not connected to the database.' }
try { $page = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri 'http://127.0.0.1:3000/' } catch { $page = $null }
if ($page -and $page.Content -notmatch 'DentaBook') { throw 'Port 3000 is occupied by another website.' }
if (-not $page) {
    $vite = Join-Path $workspace 'client/node_modules/vite/bin/vite.js'
    if (-not (Test-Path -LiteralPath $vite)) { throw 'Run npm.cmd install from client/ first.' }
    $viteProcess = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @(('"{0}"' -f $vite), '--host', '127.0.0.1', '--port', '3000', '--strictPort') -WorkingDirectory (Join-Path $workspace 'client') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'website.stdout.log') -RedirectStandardError (Join-Path $logs 'website.stderr.log') -PassThru
    $viteProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'website.pid')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        try { $page = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri 'http://127.0.0.1:3000/'; break } catch {}
    }
}
if (-not $page) { throw 'The website did not start. Check .local/logs/website.stderr.log.' }
Write-Host 'DentaBook is ready: http://localhost:3000' -ForegroundColor Green
Write-Host 'Clinic registration: http://localhost:3000/register-clinic'
Write-Host 'Clinic sign-in: http://localhost:3000/clinic/sign-in'
Write-Host 'Administrator sign-in: http://localhost:3000/admin/sign-in'

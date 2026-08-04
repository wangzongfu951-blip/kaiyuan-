param(
  [int]$BackendPort = 3000,
  [int]$FrontendPort = 5173
)

$projectRoot = 'D:\kg'
$backendRoot = Join-Path $projectRoot 'backend'
$backendLogDir = Join-Path $backendRoot 'logs'
$frontendStdout = Join-Path $projectRoot 'frontend-stdout.log'
$frontendStderr = Join-Path $projectRoot 'frontend-stderr.log'
$backendStdout = Join-Path $backendLogDir 'stdout.log'
$backendStderr = Join-Path $backendLogDir 'stderr.log'

New-Item -ItemType Directory -Force -Path $backendLogDir | Out-Null

function Stop-Port([int]$Port) {
  try {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
      $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($pid in $pids) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      }
      Start-Sleep -Milliseconds 300
    }
  } catch {}
}

Stop-Port -Port $BackendPort
Stop-Port -Port $FrontendPort

$backendProc = Start-Process -FilePath 'node' -ArgumentList "src/server.js" -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $backendStdout -RedirectStandardError $backendStderr
$frontendProc = Start-Process -FilePath 'node' -ArgumentList "node_modules\vite\bin\vite.js --config vite.config.ts --host 0.0.0.0 --port $FrontendPort" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $frontendStdout -RedirectStandardError $frontendStderr

Start-Sleep -Seconds 2

$backendOk = Test-NetConnection -ComputerName localhost -Port $BackendPort -WarningAction SilentlyContinue
$frontendOk = Test-NetConnection -ComputerName localhost -Port $FrontendPort -WarningAction SilentlyContinue

Write-Output "backend_pid=$($backendProc.Id)"
Write-Output "frontend_pid=$($frontendProc.Id)"
Write-Output "backend_port=$BackendPort"
Write-Output "frontend_port=$FrontendPort"
Write-Output "backend_listening=$($backendOk.TcpTestSucceeded)"
Write-Output "frontend_listening=$($frontendOk.TcpTestSucceeded)"

$network = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' -and $_.InterfaceAlias -notmatch 'Loopback|Teredo|isatap' } | Select-Object IPAddress,InterfaceAlias | Format-Table -AutoSize | Out-String
Write-Output $network

$ErrorActionPreference = 'Stop'
$runtimeRoot = $PSScriptRoot
$stopFile = Join-Path $runtimeRoot 'stop.request'
if (Test-Path -LiteralPath $stopFile) { Remove-Item -LiteralPath $stopFile }
# Launch only this runtime, without inheriting Codex's process environment.
foreach ($key in @('HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY')) {
  $value = [Environment]::GetEnvironmentVariable($key,'User')
  if (!$value) { $value = [Environment]::GetEnvironmentVariable($key,'Machine') }
  [Environment]::SetEnvironmentVariable($key,$value,'Process')
}
$nodePath = Join-Path $runtimeRoot 'bin/node.exe'
$serverPath = Join-Path $runtimeRoot 'server.mjs'
# Keep the scheduler action alive until the exact service exits. Do not adopt a
# process merely because it owns the port: its executable and arguments must match.
$stateFile = Join-Path $runtimeRoot 'service.json'
$service = $null
if (Test-Path -LiteralPath $stateFile) {
  $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  $candidate = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$saved.pid) -ErrorAction SilentlyContinue
  if ($candidate -and $candidate.ExecutablePath -eq $nodePath -and $candidate.CommandLine.Contains($serverPath) -and $candidate.CommandLine.Contains($runtimeRoot)) {
    $service = Get-Process -Id $candidate.ProcessId
  }
}
$failures=0
while ($true) {
  if (Test-Path -LiteralPath $stopFile) { exit 0 }
  $launchedAt=Get-Date
  if (!$service) {
    $service = Start-Process -FilePath $nodePath -ArgumentList @('--use-env-proxy',('"'+$serverPath+'"'),('"'+$runtimeRoot+'"')) -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runtimeRoot 'logs/node-error.log') -RedirectStandardOutput (Join-Path $runtimeRoot 'logs/node-output.log')
  }
  while (!$service.WaitForExit(1000)) { }
  if (Test-Path -LiteralPath $stopFile) { exit 0 }
  if (((Get-Date)-$launchedAt).TotalMinutes -gt 10) { $failures=0 }
  $failures=[Math]::Min(5,$failures+1)
  $delay=[Math]::Min(60,[Math]::Pow(2,$failures)*2)
  # A crashed child is restarted here, without depending on scheduler exit-code
  # handling. An intentional stop marker cancels both running and backoff states.
  $service=$null
  for($second=0;$second -lt $delay;$second++) {
    if (Test-Path -LiteralPath $stopFile) { exit 0 }
    Start-Sleep -Seconds 1
  }
}

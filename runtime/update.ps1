param([string]$Version='')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'release-state.ps1')
$projectRoot=Split-Path $PSScriptRoot -Parent
if (!(Test-Path -LiteralPath $projectRoot -PathType Container)) { throw 'Project directory missing' }
Set-Location -LiteralPath $projectRoot
$node=(Get-Command node.exe).Source
if (!$Version) { $Version=(& git describe --tags --always).Trim() }
& $node 'node_modules/typescript/bin/tsc' '-b' '--pretty' 'false'
if ($LASTEXITCODE -ne 0) { throw 'Type check failed; running release unchanged' }
& $node 'node_modules/vite/bin/vite.js' 'build'
if ($LASTEXITCODE -ne 0) { throw 'Build failed; running release unchanged' }
$runtimeRoot=Join-Path $projectRoot '.local-runtime'
$currentFile=Join-Path $runtimeRoot 'current.json'
if(!(Test-Path -LiteralPath (Join-Path $runtimeRoot 'ServiceHost.exe') -PathType Leaf)) {
  throw 'Legacy runtime requires native-host migration first; the running service was left unchanged'
}
function Wait-OwnedStopped {
  $deadline=(Get-Date).AddSeconds(140)
  do {
    $task=Get-ScheduledTask -TaskPath '\' -TaskName 'BilibiliCreatorInsights-Local-25758'
    $stateFile=Join-Path $runtimeRoot 'service.json'
    $owned=$null
    if(Test-Path -LiteralPath $stateFile){
      $state=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
      $candidate=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$state.pid) -ErrorAction SilentlyContinue
      if($candidate -and $candidate.ExecutablePath -eq (Join-Path $runtimeRoot 'bin/node.exe')){$owned=$candidate}
    }
    $listener=Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue
    if(!$owned -and !$listener -and [string]$task.State -eq 'Ready'){return}
    if((Get-Date) -gt $deadline){throw 'Owned process and task did not finish stopping; no release switch allowed'}
    Start-Sleep -Milliseconds 500
  }while($true)
}
& (Join-Path $PSScriptRoot 'manage.ps1') -Action Stop
Wait-OwnedStopped
$rollbackRoot=Join-Path $runtimeRoot ('rollback-'+[guid]::NewGuid().ToString())
Save-ReleaseState $runtimeRoot $rollbackRoot
try {
  & $node (Join-Path $PSScriptRoot 'deploy.mjs') $Version
  if($LASTEXITCODE -ne 0){throw 'Deployment failed'}
  & (Join-Path $PSScriptRoot 'manage.ps1') -Action Start
  $deadline=(Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Milliseconds 500
    try{$status=Invoke-RestMethod 'http://127.0.0.1:5173/api/local/status' -TimeoutSec 2}catch{$status=$null}
    if($status.version -eq $Version){Write-Output ('Release active: '+$Version);exit 0}
  }while((Get-Date) -lt $deadline)
  throw 'New release did not pass its health check'
} catch {
  if(Test-Path -LiteralPath $rollbackRoot){
    & (Join-Path $PSScriptRoot 'manage.ps1') -Action Stop
    Wait-OwnedStopped
    Restore-ReleaseState $runtimeRoot $rollbackRoot
    & (Join-Path $PSScriptRoot 'manage.ps1') -Action Start
  }
  throw
}

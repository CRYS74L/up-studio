$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'release-state.ps1')
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$fixture=Join-Path $tempRoot ('bili-rollback-'+[guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $fixture | Out-Null
try {
  foreach($file in @('current.json','server.mjs','d1.mjs','launch.ps1','config.json')){[IO.File]::WriteAllText((Join-Path $fixture $file),'old-'+$file)}
  $saved=Join-Path $fixture 'rollback'
  Save-ReleaseState $fixture $saved
  foreach($file in @('current.json','server.mjs','d1.mjs','launch.ps1','config.json')){[IO.File]::WriteAllText((Join-Path $fixture $file),'broken-'+$file)}
  [IO.File]::WriteAllText((Join-Path $fixture 'data.sqlite'),'newly collected data must survive')
  Restore-ReleaseState $fixture $saved
  foreach($file in @('current.json','server.mjs','d1.mjs','launch.ps1','config.json')){if([IO.File]::ReadAllText((Join-Path $fixture $file)) -ne ('old-'+$file)){throw ('Rollback failed: '+$file)}}
  if([IO.File]::ReadAllText((Join-Path $fixture 'data.sqlite')) -ne 'newly collected data must survive'){throw 'Rollback changed database'}
  Write-Output 'PASS: rollback restores release, runtime and configuration without reverting data'
} finally {
  $resolved=[IO.Path]::GetFullPath($fixture)
  if($resolved.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf) -like 'bili-rollback-*'){Remove-Item -LiteralPath $resolved -Recurse -Force}
}

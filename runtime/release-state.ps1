$script:ReleaseFiles=@('current.json','server.mjs','d1.mjs','launch.ps1','config.json')
function Save-ReleaseState([string]$Root,[string]$Destination) {
  foreach($name in $script:ReleaseFiles){if(!(Test-Path -LiteralPath (Join-Path $Root $name) -PathType Leaf)){throw ('Incomplete installed runtime: '+$name)}}
  New-Item -ItemType Directory -Path $Destination -ErrorAction Stop | Out-Null
  foreach($name in $script:ReleaseFiles){Copy-Item -LiteralPath (Join-Path $Root $name) -Destination (Join-Path $Destination $name)}
}
function Restore-ReleaseState([string]$Root,[string]$Source) {
  foreach($name in $script:ReleaseFiles){if(!(Test-Path -LiteralPath (Join-Path $Source $name) -PathType Leaf)){throw ('Incomplete rollback state: '+$name)}}
  foreach($name in $script:ReleaseFiles){Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $Root $name) -Force}
}

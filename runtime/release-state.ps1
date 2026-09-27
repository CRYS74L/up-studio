$script:OptionalReleaseFiles=@('http-compression.mjs','lan-firewall.mjs','lan-firewall.ps1','service-settings.mjs','startup-settings.ps1','cloud-backups.mjs','cloud-backup-tools.mjs','cloud-backup-data.mjs','webdav-folder.mjs','snapshot-storage.mjs','backup-schema.json')
$script:ReleaseFiles=@('current.json','server.mjs','d1.mjs','launch.ps1','config.json','ServiceHost.exe')
function Save-ReleaseState([string]$Root,[string]$Destination) {
  foreach($name in $script:ReleaseFiles){if(!(Test-Path -LiteralPath (Join-Path $Root $name) -PathType Leaf)){throw ('Incomplete installed runtime: '+$name)}}
  New-Item -ItemType Directory -Path $Destination -ErrorAction Stop | Out-Null
  foreach($name in $script:ReleaseFiles+$script:OptionalReleaseFiles){if(Test-Path -LiteralPath (Join-Path $Root $name)){Copy-Item -LiteralPath (Join-Path $Root $name) -Destination (Join-Path $Destination $name)}}
}
function Restore-ReleaseState([string]$Root,[string]$Source) {
  foreach($name in $script:ReleaseFiles){if(!(Test-Path -LiteralPath (Join-Path $Source $name) -PathType Leaf)){throw ('Incomplete rollback state: '+$name)}}
  foreach($name in $script:ReleaseFiles+$script:OptionalReleaseFiles){if(Test-Path -LiteralPath (Join-Path $Source $name)){Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $Root $name) -Force}}
}

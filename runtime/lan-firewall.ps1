param([ValidateSet('Check','Ensure','Configure','Remove')][string]$Action='Check',[Parameter(Mandatory=$true)][string]$Program,[ValidateRange(1,65535)][int]$Port=5173,[string]$ResultPath='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$Program=[IO.Path]::GetFullPath($Program)
if(!(Test-Path -LiteralPath $Program -PathType Leaf)){throw 'Service executable missing'}
$hash=[Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($Program.ToLowerInvariant()+':'+$Port))
$id=([BitConverter]::ToString($hash)).Replace('-','').Substring(0,16)
$name='UPStudio-LAN-'+$id
$display='UP Studio LAN '+$id
$description='UP Studio managed LAN access v1'
function Check-Rule {
 $policy=New-Object -ComObject HNetCfg.FwPolicy2
 foreach($rule in $policy.Rules){
  if(!$rule.Enabled -or $rule.Direction -ne 1 -or $rule.Action -ne 1 -or $rule.Protocol -ne 6 -or $rule.LocalPorts -ne [string]$Port -or $rule.RemoteAddresses -ne 'LocalSubnet' -or $rule.ApplicationName -ne $Program){continue}
  $owned=($rule.Name -eq $display -and $rule.Description -eq $description) -or ($rule.Name -eq 'UP Studio - LAN TCP 5173' -and $rule.Description -eq 'UP Studio owned LAN access; private network; local subnet; TCP 5173')
  if(!$owned){continue}
  if(($rule.Profiles -band 6) -eq 6){return @{ready=$true;rule=$name}}
  $lanInterfaces=@(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'} | Select-Object -ExpandProperty InterfaceIndex -Unique)
  $profiles=@(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object {$lanInterfaces -contains $_.InterfaceIndex})
  if($profiles.Count -gt 0 -and @($profiles | Where-Object {$_.NetworkCategory -ne 'Private'}).Count -eq 0 -and ($rule.Profiles -band 2)){return @{ready=$true;rule=$rule.Name}}
 }
 return @{ready=$false;rule=$name}
}
function Finish($result){if($ResultPath){$result|ConvertTo-Json -Compress|Set-Content -LiteralPath $ResultPath -Encoding UTF8};$result|ConvertTo-Json -Compress}
try {
 if($Action -eq 'Check'){Finish (Check-Rule);exit}
 if($Action -eq 'Ensure'){
  $before=Check-Rule
  if($before.ready){Finish $before;exit}
  $administrator=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if(!$administrator){
   $reply=Join-Path ([IO.Path]::GetTempPath()) ('up-studio-firewall-'+[guid]::NewGuid().ToString()+'.json')
   try {$powershell=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe';$child=Start-Process -FilePath $powershell -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',('"'+$PSCommandPath+'"'),'-Action','Configure','-Program',('"'+$Program+'"'),'-Port',[string]$Port,'-ResultPath',('"'+$reply+'"')) -Wait -PassThru;if(!(Test-Path -LiteralPath $reply)){throw 'Firewall configuration did not return a result'};$result=Get-Content -LiteralPath $reply -Raw|ConvertFrom-Json;if(!$result.ready){throw $result.error};Finish (Check-Rule);exit} finally {if(Test-Path -LiteralPath $reply){Remove-Item -LiteralPath $reply -Force}}
  }
 }
 $existing=Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
 if($existing -and ($existing.Description -ne $description -or ($existing|Get-NetFirewallApplicationFilter).Program -ne $Program)){throw 'Firewall rule ownership mismatch'}
 if($Action -eq 'Remove'){if($existing){Remove-NetFirewallRule -Name $name};Finish @{ready=$false;removed=$true};exit}
 if($existing){Remove-NetFirewallRule -Name $name}
 New-NetFirewallRule -Name $name -DisplayName $display -Description $description -Direction Inbound -Enabled True -Action Allow -Profile Private,Public -Protocol TCP -LocalPort $Port -Program $Program -RemoteAddress LocalSubnet -EdgeTraversalPolicy Block | Out-Null
 $result=Check-Rule
 if(!$result.ready){throw 'Firewall rule verification failed'}
 Finish $result
} catch {Finish @{ready=$false;error=$_.Exception.Message};exit 1}

param([ValidateSet('Get','Enable','Disable')][string]$Action='Get',[Parameter(Mandatory=$true)][string]$RuntimeRoot)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$taskName='BilibiliCreatorInsights-Local-25758'
$task=Get-ScheduledTask -TaskPath '\' -TaskName $taskName -ErrorAction SilentlyContinue
if(!$task){if($Action -ne 'Get'){throw 'Startup task missing'};@{available=$false;enabled=$false}|ConvertTo-Json -Compress;exit}
$expected=Join-Path $RuntimeRoot 'ServiceHost.exe'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
if($task.Description -ne 'Bilibili Creator Insights standalone local runtime; owner=25758' -or $task.Actions.Count -ne 1 -or $task.Actions[0].Execute -ne $expected -or [string]$task.Actions[0].Arguments -ne '' -or ([Security.Principal.NTAccount]$task.Principal.UserId).Translate([Security.Principal.SecurityIdentifier]).Value -ne $owner){throw 'Startup task ownership mismatch'}
$triggers=@($task.Triggers | Where-Object {$_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger'})
if($triggers.Count -ne 1 -or $task.Triggers.Count -ne 1){throw 'Unexpected startup triggers'}
if($Action -ne 'Get'){$triggers[0].Enabled=($Action -eq 'Enable');Set-ScheduledTask -TaskName $taskName -TaskPath '\' -Trigger $triggers | Out-Null;$task=Get-ScheduledTask -TaskName $taskName -TaskPath '\'}
@{available=$true;enabled=[bool]$task.Triggers[0].Enabled}|ConvertTo-Json -Compress

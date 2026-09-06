param([ValidateSet('Install','Start','Stop','Remove','Audit')][string]$Action='Audit')
$ErrorActionPreference='Stop'
$runtimeRoot=Join-Path (Split-Path $PSScriptRoot -Parent) '.local-runtime'
$taskName='BilibiliCreatorInsights-Local-25758'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$launcher=Join-Path $runtimeRoot 'launch.ps1'
$executable=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$arguments='-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$launcher+'"'
function Get-OwnedTask {
 $task=Get-ScheduledTask -TaskPath '\' -TaskName $taskName -ErrorAction SilentlyContinue
 if($task -and ($task.Description -ne 'Bilibili Creator Insights standalone local runtime; owner=25758' -or $task.Actions.Count -ne 1 -or $task.Actions[0].Execute -ne $executable -or $task.Actions[0].Arguments -ne $arguments -or ([Security.Principal.NTAccount]$task.Principal.UserId).Translate([Security.Principal.SecurityIdentifier]).Value -ne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value)){throw 'Same-name task does not match runtime ownership; no change made'}
 return $task
}
function Save-Audit($name) {
 $sha=[Security.Cryptography.SHA256]::Create()
 function Hash-Text([string]$value){ [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($value))).Replace('-','') }
 $manifest=[Collections.Generic.List[object]]::new()
 foreach($task in Get-ScheduledTask){if($task.TaskName -eq $taskName -and $task.TaskPath -eq '\'){continue};$xml=Export-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath;$manifest.Add([pscustomobject]@{kind='task';key=$task.TaskPath+$task.TaskName;hash=(Hash-Text $xml)})}
 foreach($key in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Run','HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce','HKLM:\Software\Microsoft\Windows\CurrentVersion\Run','HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run')){if(Test-Path $key){foreach($property in (Get-ItemProperty $key).PSObject.Properties){if($property.Name -notlike 'PS*'){$manifest.Add([pscustomobject]@{kind='registry';key=$key+'\'+$property.Name;hash=(Hash-Text ([string]$property.Value))})}}}}
 foreach($folder in @([Environment]::GetFolderPath('Startup'),[Environment]::GetFolderPath('CommonStartup'))){Get-ChildItem -LiteralPath $folder -File -Recurse | ForEach-Object {$manifest.Add([pscustomobject]@{kind='startup';key=$_.FullName;hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash})}}
 $file=Join-Path $runtimeRoot ('audit/'+$name+'.json');$manifest | Sort-Object kind,key | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $file -Encoding utf8
 return $file
}
if($Action -eq 'Audit'){Save-Audit ('audit-'+(Get-Date -Format yyyyMMdd-HHmmss));exit}
$task=Get-OwnedTask
switch($Action){
 'Install' {
  if($task){throw 'Task already exists; use Start. No existing task modified.'}
  foreach($required in @('launch.ps1','current.json','config.json','data.sqlite','bin/node.exe')){if(!(Test-Path -LiteralPath (Join-Path $runtimeRoot $required) -PathType Leaf)){throw 'Deploy the complete runtime before installing startup'}}
  $before=Save-Audit 'before-install'
  $principal=New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User $owner
  $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskPath '\' -TaskName $taskName -Action (New-ScheduledTaskAction -Execute $executable -Argument $arguments -WorkingDirectory $runtimeRoot) -Principal $principal -Trigger $trigger -Settings $settings -Description 'Bilibili Creator Insights standalone local runtime; owner=25758' | Out-Null
  $after=Save-Audit 'after-install'
  if((Get-FileHash $before).Hash -ne (Get-FileHash $after).Hash){throw 'Other startup inventory changed; inspect audit manifests'}
  Write-Output 'Installed unique task; other startup manifests identical.'
 }
 'Start' {if(!$task){throw 'Owned task missing'};Start-ScheduledTask -TaskPath '\' -TaskName $taskName}
 'Stop' {
  if(!$task){throw 'Owned task missing'}
  Set-Content -LiteralPath (Join-Path $runtimeRoot 'stop.request') -Value 'stop'
  Write-Output 'Graceful stop requested for the owned runtime.'
  $deadline=(Get-Date).AddSeconds(140)
  do {
    $stateFile=Join-Path $runtimeRoot 'service.json'
    $owned=$null
    if(Test-Path -LiteralPath $stateFile){
      $state=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
      $candidate=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$state.pid) -ErrorAction SilentlyContinue
      if($candidate -and $candidate.ExecutablePath -eq (Join-Path $runtimeRoot 'bin/node.exe')){$owned=$candidate}
    }
    if(!$owned){
      # Finalize only our scheduler instance after the service has exited. This
      # also clears a stale Running state without terminating any other task.
      Stop-ScheduledTask -TaskPath '\' -TaskName $taskName
      Write-Output 'Owned service exited; owned scheduler instance stopped.'
      break
    }
    if((Get-Date) -gt $deadline){throw 'Service is still stopping; no other process was terminated'}
    Start-Sleep -Milliseconds 500
  }while($true)
 }
 'Remove' {if(!$task){throw 'Owned task missing'};if($task.State -eq 'Running'){throw 'Stop gracefully before removing'};Unregister-ScheduledTask -TaskPath '\' -TaskName $taskName -Confirm:$false}
}

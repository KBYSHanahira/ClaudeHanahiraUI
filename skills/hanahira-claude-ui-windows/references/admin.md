# Windows administration

A look-up for the everyday admin surfaces: services, scheduled tasks, event logs, IIS, registry, permissions, updates, features, disks and reboots. Read before changing; every change below is an outward step unless the user named it.

## Services

- State and config: `Get-Service name | Select-Object Name, Status, StartType`; `sc.exe qc name` for binary path, account and dependencies.
- Change: `Set-Service name -StartupType Automatic -WhatIf`, then without `-WhatIf`; `Restart-Service name` and confirm with `Get-Service`.
- Recovery actions: `sc.exe qfailure name`; set with `sc.exe failure name reset= 86400 actions= restart/60000`. The space after `=` is required.
- A service stuck in `StopPending`: find the PID with `sc.exe queryex name` and only then consider `Stop-Process -Id`.

## Scheduled tasks

- `Get-ScheduledTask -TaskPath '\' | Get-ScheduledTaskInfo | Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime`.
- Full definition: `Export-ScheduledTask -TaskName name` shows triggers, principal and working directory as XML.
- Run now to test: `Start-ScheduledTask -TaskName name`, then read `LastTaskResult`. Operational history is in `Microsoft-Windows-TaskScheduler/Operational` (often disabled; `wevtutil sl Microsoft-Windows-TaskScheduler/Operational /e:true`).

## Event log queries

```powershell
Get-WinEvent -FilterHashtable @{LogName='System'; Id=7031,7034; StartTime=(Get-Date).AddDays(-1)} |
    Select-Object TimeCreated, Id, Message
Get-WinEvent -FilterHashtable @{LogName='System'; Id=1074,6008,41} -MaxEvents 20
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddHours(-6)} |
    ForEach-Object { $_.Properties[5].Value }   # target user name
Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='MyApp'; Level=2}
```

- No match is reported as an error ('No events were found…'); add `-ErrorAction SilentlyContinue` and treat empty as zero events.
- `Get-WinEvent -ListLog *` lists logs and sizes; Level 1 critical, 2 error, 3 warning.
- Reading the Security log needs elevation. Export for someone else with `wevtutil epl System C:\temp\system.evtx`.

## IIS

- App pools: `Get-IISAppPool` or `Get-WebAppPoolState name`; recycle with `Restart-WebAppPool name` or `appcmd recycle apppool /apppool.name:name`.
- A pool that stops by itself has hit rapid-fail protection; look for WAS events 5002 and 5009 in the System log.
- Sites and bindings: `Get-IISSite`, `Get-WebBinding -Name site`. Back up the config first: `appcmd add backup before-change`; restore with `appcmd restore backup before-change`.
- Logs: `%SystemDrive%\inetpub\logs\LogFiles\W3SVC<siteId>`, UTC timestamps; HTTP.sys rejections are in `%windir%\System32\LogFiles\HTTPERR`.

## Registry

- Read: `Get-ItemProperty 'HKLM:\SOFTWARE\Vendor\App'` or `reg query "HKLM\SOFTWARE\Vendor\App" /s`.
- Back up before any write: `reg export "HKLM\SOFTWARE\Vendor\App" C:\temp\app-backup.reg /y`. Restore with `reg import`.
- Write: `Set-ItemProperty -Path 'HKLM:\SOFTWARE\Vendor\App' -Name Setting -Value 1 -WhatIf`; create typed values with `New-ItemProperty -PropertyType DWord`.
- 32-bit apps on 64-bit Windows read `HKLM\SOFTWARE\WOW6432Node`; check both before concluding a key is missing.

## ACLs

- Read: `icacls C:\data`, `(Get-Acl C:\data).Access | Format-Table IdentityReference, FileSystemRights, IsInherited`.
- Save before changing: `icacls C:\data /save C:\temp\data-acl.txt /t`; restore with `icacls C:\ /restore C:\temp\data-acl.txt`.
- Grant: `icacls C:\data /grant "DOMAIN\group:(OI)(CI)M"`. Avoid `/reset` and `/inheritance:r` unless that is the intent.
- Ownership: `takeown /f path` changes the owner, which is itself a change to report.

## Windows Update

- History: `Get-HotFix | Sort-Object InstalledOn -Descending`; detail via `Get-WinEvent -ProviderName Microsoft-Windows-WindowsUpdateClient`.
- `PSWindowsUpdate` (`Get-WindowsUpdate`, `Install-WindowsUpdate`) is a third-party Gallery module, not part of Windows; install it only with the user's agreement.
- Built-in client: `usoclient` is undocumented; on Server Core use `sconfig`. Component store repair: `DISM /Online /Cleanup-Image /RestoreHealth`, then `sfc /scannow`.

## Features

- Server: `Get-WindowsFeature | Where-Object Installed`; `Install-WindowsFeature Web-Server -IncludeManagementTools -WhatIf`.
- Client: `Get-WindowsOptionalFeature -Online | Where-Object State -eq Enabled`; `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart`.
- Check `RestartNeeded` in the result before reporting a feature as working.

## Disk and space

- `Get-Volume | Select-Object DriveLetter, FileSystemLabel, SizeRemaining, Size`; `Get-PSDrive -PSProvider FileSystem`.
- Usual growth: `C:\Windows\WinSxS` (clean with `DISM /Online /Cleanup-Image /StartComponentCleanup`), IIS logs, `C:\Windows\Temp`, user profiles, crash dumps.
- Disk health: `Get-PhysicalDisk | Select-Object FriendlyName, HealthStatus`; file system check read-only with `chkdsk C: /scan`.

## Reboot pending

- `Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'`
- `Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'`
- `Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -EA SilentlyContinue`
- Any true means a restart is owed; say so before blaming the change under test. Restarting is an outward step.

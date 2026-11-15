---
name: "hanahira-claude-ui-windows"
description: Hanahira Claude UI companion for Windows — PowerShell scripting, Windows services and scheduled tasks, IIS, event logs, registry, users and permissions (ACLs), Windows Update and features, networking and firewall on Windows, WSL. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when a real part of the task lies in this field; it can load beside another companion.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Windows

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Read the state with `Get-` cmdlets before any `Set-` or `Remove-`, and run `-WhatIf` first where the cmdlet supports it.** Registry, service, firewall and user changes are outward steps under the core's rule 2 unless the user named them. Check which PowerShell is running with `$PSVersionTable`: Windows PowerShell 5.1 and PowerShell 7 differ in modules, defaults and encoding.

## What saves the most time

- **Objects, not text.** Pipe to `Select-Object` and `Where-Object`; use `Format-List *` to see every property. Parse strings only from native `.exe` output.
- **`Get-Help <cmdlet> -Examples`** answers faster than guessing parameters.
- **Elevation.** Many failures are just a non-admin shell: `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`.
- **Execution policy.** `Get-ExecutionPolicy -List` explains a script that will not run; prefer `-Scope Process` over changing the machine policy.
- **Paths with spaces** go in quotes, and the call operator `&` runs a quoted path.
- **Errors that stop.** Many errors are non-terminating; add `-ErrorAction Stop` inside `try`/`catch` or the `catch` never runs.

## Services and tasks

- `Get-Service name | Format-List *` for state and start type; `sc.exe qc name` for the binary path and account; `sc.exe queryex name` for the PID.
- `Get-ScheduledTask` and `Get-ScheduledTaskInfo` give `LastRunTime` and `LastTaskResult`: `0` is success, `267009` (0x41301) still running, `267011` (0x41303) never run, `2147942402` (0x80070002) file not found.
- A task that works by hand but not on schedule is usually the account, the working directory or "run only when logged on".

## Logs

- `Get-WinEvent -FilterHashtable @{LogName='System'; Id=7034; StartTime=(Get-Date).AddHours(-24)}` filters at the source; `Where-Object` after the fact is slow.
- System: 7031/7034 service crashed, 7000/7009 service failed to start or timed out, 6005/6006 log service start/stop, 6008 unexpected shutdown, 1074 who restarted, 41 Kernel-Power.
- Security: 4624 logon, 4625 failed logon, 4672 admin logon, 4740 lockout. Application: 1000 app crash, 1026 .NET runtime error.

## IIS

- `WebAdministration` (`Get-Website`, `Get-WebAppPoolState`, `IIS:\` drive) or `IISAdministration` (`Get-IISSite`, `Get-IISAppPool`); `%windir%\system32\inetsrv\appcmd.exe list apppool` works everywhere.
- Check the app pool identity, .NET CLR version and bindings (`Get-WebBinding`) before the code. Logs live in `%SystemDrive%\inetpub\logs\LogFiles\W3SVC<id>`; the sub-status in each line narrows a 500 or 401.

## Permissions

- `icacls path` and `Get-Acl path | Format-List` show who has what; inheritance (`(I)`) explains most surprises.
- `Get-LocalUser`, `Get-LocalGroupMember -SID S-1-5-32-544`, and `whoami /groups` for the current token.

## Networking

- `Get-NetIPAddress`, `Resolve-DnsName`, `Test-NetConnection host -Port 443`.
- `Get-NetTCPConnection -State Listen` with `OwningProcess` names what holds a port; `Get-NetFirewallRule -Enabled True | Get-NetFirewallPortFilter` shows the ports rules open.

## WSL

- `wsl -l -v` for distros and version 1 or 2. Windows drives are under `/mnt/c`; from Windows, Linux files are at `\\wsl$\<distro>`; `wslpath` converts.
- CRLF breaks shell scripts in Linux (`bad interpreter`); check `git config core.autocrlf` and a `.gitattributes` with `eol=lf`.

## Working with tools and other skills

- Pair up: `hanahira-claude-ui-remote` for reaching the machine, `hanahira-claude-ui-security` for firewall policy and accounts, `hanahira-claude-ui-devops` for CI on Windows runners. Helpers follow `references/agents.md` in the core; outward steps (registry, service, firewall, account changes on a live machine) stay with me.

PowerShell scripts, quoting, remoting and encoding: `references/powershell.md`. Services, tasks, event logs, IIS, registry, updates, features and disks: `references/admin.md`. Open them only when the lines above are not enough.

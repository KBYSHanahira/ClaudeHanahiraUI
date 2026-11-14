# PowerShell

A look-up for writing and running PowerShell that behaves the same on every machine: script structure, errors, quoting, remoting, modules and encoding. Check `$PSVersionTable.PSVersion` first; 5.1 and 7 differ in the places marked below.

## Script structure

```powershell
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Path,
    [int]$Days = 30
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Get-ChildItem -LiteralPath $Path -File |
    Where-Object LastWriteTime -lt (Get-Date).AddDays(-$Days) |
    ForEach-Object {
        if ($PSCmdlet.ShouldProcess($_.FullName, 'Remove')) { Remove-Item -LiteralPath $_.FullName }
    }
```

- `CmdletBinding` gives `-Verbose`, `-Debug` and `-ErrorAction` for free; `SupportsShouldProcess` gives `-WhatIf` and `-Confirm`.
- Use `-LiteralPath` when names may contain `[` or `]`.
- Write output objects, not formatted text; `Write-Host` cannot be piped or captured.

## Error handling

- Cmdlet errors are non-terminating by default. Set `$ErrorActionPreference = 'Stop'` or pass `-ErrorAction Stop` so `try`/`catch` sees them.
- In `catch`, `$_.Exception.Message` and `$_.ScriptStackTrace` say what and where; `$_.InvocationInfo.PositionMessage` gives the line.
- Native `.exe` failures do not throw: check `$LASTEXITCODE` after each call. In 7.4+ (an experimental feature in 7.3), `$PSNativeCommandUseErrorActionPreference = $true` makes them throw.
- Use `finally` to undo temporary state such as a changed location or a mounted drive.

## Quoting and escaping

- Single quotes are literal; double quotes expand `$var` and `$(expr)`. Use single quotes unless expansion is wanted.
- The escape character is the backtick: `` `n `` newline, `` `t `` tab, `` `$ `` a literal dollar. A trailing backtick for line continuation breaks on a following space; prefer splatting or a pipe at line end.
- A quote inside the same quotes is doubled: `'it''s'`, `"say ""hi"""`.
- `--%` stops PowerShell parsing for the rest of a native command line: `icacls.exe C:\data --% /grant Users:(OI)(CI)R`.
- Passing quotes to native programs changed in 7.3 (`$PSNativeCommandArgumentPassing`); test the exact argv when a 5.1 script moves to 7.
- Splat parameters from a hashtable: `$p = @{Name='svc'; ErrorAction='Stop'}; Get-Service @p`.

## Running remotely

- `Invoke-Command -ComputerName srv -ScriptBlock { Get-Service W3SVC }` over WinRM; `Enter-PSSession srv` for interactive work. `Test-WSMan srv` checks the listener.
- Local variables reach the remote block with `$using:name` or `-ArgumentList`.
- PowerShell 7 can remote over SSH: `Invoke-Command -HostName srv -UserName admin -ScriptBlock {...}`.
- The second hop (remote to a file share) fails by default; copy files with `Copy-Item -ToSession` instead of reaching a share from inside the session.
- Results come back deserialized: properties survive, methods do not.

## Modules

- `Get-Module -ListAvailable name` shows what is installed and where; `$env:PSModulePath` differs between 5.1 and 7.
- `Install-Module name -Scope CurrentUser` from the PowerShell Gallery; pin with `-RequiredVersion` in automation.
- Windows-only modules in 7 load through the compatibility layer: `Import-Module name -UseWindowsPowerShell`.
- `#Requires -Version 7.2`, `#Requires -Modules name` and `#Requires -RunAsAdministrator` at the top fail fast with a clear message.

## Encoding

- Windows PowerShell 5.1 writes UTF-16 LE with `>` and `Out-File`, and UTF-8 *with* BOM for `-Encoding UTF8`. Many Linux tools, JSON parsers and config readers reject the BOM.
- PowerShell 7 defaults to UTF-8 without BOM. In 5.1, write BOM-less with `[IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))`.
- A script file with non-ASCII text needs a BOM to be read correctly by 5.1; without one it is read as the ANSI code page.
- Garbled native output: set `[Console]::OutputEncoding = [Text.Encoding]::UTF8` before the call.

## Common one-liners

- Largest folders: `Get-ChildItem C:\ -Directory | ForEach-Object { [pscustomobject]@{Path=$_.FullName; GB=[math]::Round((Get-ChildItem $_.FullName -Recurse -File -EA SilentlyContinue | Measure-Object Length -Sum).Sum/1GB,2)} } | Sort-Object GB -Descending`
- Process on a port: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess`
- Last boot: `(Get-CimInstance Win32_OperatingSystem).LastBootUpTime`
- Installed software: `Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Select-Object DisplayName, DisplayVersion`
- Tail a log: `Get-Content app.log -Tail 50 -Wait`
- Search text: `Select-String -Path *.log -Pattern 'error' -Context 2`

# Files and fleets

A look-up for moving data between machines and for running one change across many hosts. The rule does not change: dry run, one target, verify, then widen.

## rsync recipes

- Mirror a folder: `rsync -avz --partial --dry-run ./site/ host:/srv/site/`, read the list, then drop `--dry-run`.
- Exclude: `--exclude '.git/' --exclude 'node_modules/'`, or `--exclude-from=.rsyncignore` for a long list.
- Make the target match the source exactly: add `--delete` only after a dry run with `--itemize-changes` showing what goes.
- Limit bandwidth on a shared link: `--bwlimit=20M` (units per second).
- Resume a large interrupted copy: `--partial --append-verify`; show progress with `--info=progress2`.
- Compare by content, not size and time: `-c` (slow on big trees; use it for a final check).
- Keep ownership and ACLs when copying as root: `-aAX --numeric-ids`, with `--rsync-path='sudo -n rsync'` when the remote side needs sudo (needs passwordless sudo for rsync; `-n` fails fast otherwise).
- A non-default port or key: `-e 'ssh -p 2222 -i ~/.ssh/key'`, or simply a `~/.ssh/config` alias.

## scp and sftp

- One file: `scp file host:/tmp/`; recursive: `scp -r dir host:/tmp/`. Modern scp uses the SFTP protocol underneath.
- Remote to remote through here: `scp -3 a:/f b:/f`.
- Scripted sftp: `sftp -b batch.txt host`, where the batch file holds `put`, `get` and `mkdir` lines; it stops on the first error.

## Large transfers

- Run them inside tmux so a dropped session does not stop them.
- Compress once: `-z` helps text, not already-compressed archives, images or video.
- Stream without a temp file: `tar czf - dir | ssh host 'tar xzf - -C /dst'`.
- Check free space on the target first: `ssh host 'df -h /dst'`.

## Verifying

- `sha256sum file` here and `ssh host 'sha256sum /dst/file'` there; the hashes must match.
- For a tree: `find . -type f -exec sha256sum {} + | sort -k2 > sums.txt`, copy `sums.txt`, then `sha256sum -c sums.txt` on the target.
- On Windows: `Get-FileHash C:\path\file -Algorithm SHA256`.

## Ansible

- Inventory, `inventory.ini`:

```
[web]
web1.example.com
web2.example.com

[db]
db1.example.com ansible_user=admin
```

- Prove access: `ansible all -i inventory.ini -m ping`.
- Ad hoc reads: `ansible web -i inventory.ini -m command -a 'uptime'`, `ansible web -i inventory.ini -m shell -a 'df -h | grep /srv'`.
- Root: `--become` (`-b`), with `-K` when sudo needs a password.
- Preview a playbook: `ansible-playbook site.yml --check --diff`. Modules that do not support check mode report skipped, not safe.
- One host first: `--limit web1.example.com`, then the group.
- Roll out in batches in the play: `serial: 1` or `serial: "25%"`, with `max_fail_percentage: 0` to stop on the first failure.
- `--list-hosts` shows exactly which hosts a pattern selects before anything runs.

## pssh

- `pssh -h hosts.txt -i 'uptime'` runs one command everywhere and prints each host's output.
- `-t 30` sets a timeout, `-p 10` limits parallelism, `-o outdir` saves output per host.
- `pscp.pssh` and `prsync` copy to the same list. Names vary by distro (`parallel-ssh` on Debian/Ubuntu).
- pssh has no check mode: run the command on one host by hand first.

## Windows file copy

- scp to OpenSSH on Windows: `scp file host:C:/Users/admin/` or `scp file 'host:"C:/Program Files/App/"'` when the path has spaces. Forward slashes work.
- rsync needs a server-side rsync (WSL or cwRsync); it is not there by default.
- PowerShell remoting:

```
$s = New-PSSession -ComputerName host
Copy-Item .\app.zip -Destination C:\deploy\ -ToSession $s
Copy-Item C:\logs\app.log -Destination .\ -FromSession $s
Remove-PSSession $s
```

- Many Windows hosts: `Invoke-Command -ComputerName h1,h2 -ScriptBlock { Get-Service app }`, or Ansible with the `win_` modules over WinRM or SSH.

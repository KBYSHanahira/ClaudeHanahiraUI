---
name: "hanahira-claude-ui-remote"
description: Hanahira Claude UI companion for remote machines over SSH — long jobs, rsync and scp, tunnels, jump hosts, many hosts at once. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Remote

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Know which machine I am on before every change.** Check `hostname`, `whoami` and the environment (prompt, `/etc/os-release`, the app's env name) first. A command meant for staging run on production cannot be taken back. An action on a host the user did not name is asked first, under the core's rule 2.

## What saves the most time

- **One `ssh host 'cmd'` beats an interactive session.** The output comes back whole, and the exit code is real.
- **Quote for the remote shell.** Wrap the remote command in single quotes so the local shell expands nothing; end options with `--` before paths that may start with `-`.
- **Check the remote first**: `uname -a`, `cat /etc/os-release`, `echo $SHELL`. BusyBox, macOS and Windows differ from GNU in flags and paths.
- **Use `~/.ssh/config` host aliases** instead of retyping user, port and key; the alias also names the target plainly.
- **Nothing may hang on a prompt**: `ssh -o BatchMode=yes -o ConnectTimeout=10 host 'cmd'` fails fast instead of waiting for a password or a dead host.

## Long jobs

- Anything longer than a few minutes runs detached: `tmux new -d -s build 'make all > ~/build.log 2>&1; echo "exit $?" >> ~/build.log'`, then `tmux attach -t build` or `tail -f ~/build.log`.
- Without tmux: `nohup cmd > job.log 2>&1 < /dev/null &`, or `systemd-run --user --unit=job cmd` and `journalctl --user -u job` (a user unit stops at logout unless `loginctl enable-linger` is on).
- Check the exit code afterwards; a job that stopped printing is not a job that succeeded.

## Moving files

- `rsync -avz --partial --dry-run src/ host:/dst/` first, then the same line without `--dry-run`.
- A trailing slash on the source copies its contents; without it, the folder itself lands inside the target.
- `--delete` only after a dry run whose deletions I have read.
- `scp` for a single file. Compare `sha256sum` on both ends after anything that matters.

## Tunnels and jump hosts

- `-L 8080:localhost:80` brings a remote port here; `-R 9000:localhost:3000` exposes a local port there; `-D 1080` is a SOCKS proxy.
- `-J bastion` or `ProxyJump bastion` reaches hosts behind a jump host without copying keys onto it.
- `ControlMaster auto` with `ControlPersist` reuses one connection; repeated commands start in milliseconds.

## Many hosts

- Start ad hoc: `ansible all -m ping` proves inventory and access before any change.
- Run playbooks with `--check --diff` first, then on one host, then widen with `--limit`; `serial:` rolls the rest out in batches.
- A change that breaks one host stops the rollout; it is not retried across the fleet.

## Windows hosts

- OpenSSH Server on Windows works like any SSH host; set PowerShell as its default shell so commands behave predictably.
- PowerShell remoting (`Invoke-Command`, `Enter-PSSession`, `$using:`, the second hop): `references/powershell.md` in `hanahira-claude-ui-windows`.
- Quoting differs: `cmd.exe` and PowerShell do not treat single quotes or `$` like bash; test a harmless command first.

## Working with tools and other skills

- Pair up: `hanahira-claude-ui-security` for keys, `sshd_config` and the firewall; `hanahira-claude-ui-devops` for deploys; `hanahira-claude-ui-windows` for Windows administration; `hanahira-claude-ui-network` when the host or a tunnelled port cannot be reached; `hanahira-claude-ui-automation` for a job left to run on a schedule; `hanahira-claude-ui-claude-remote` for running Claude Code itself on the host.
- Helpers follow `references/agents.md` in the core and are never handed a change on a live host; they may read logs and state.

SSH config, quoting, sudo, tmux and recovery: `references/ssh-and-sessions.md`. rsync, transfers, Ansible, pssh and Windows copies: `references/files-and-fleets.md`.

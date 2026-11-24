# SSH and sessions

A look-up for the mechanics of reaching a host and keeping work alive on it. Keys, `sshd_config` hardening and firewall rules live in `hanahira-claude-ui-security`; this file assumes access already works.

## ~/.ssh/config

```
Host bastion
    HostName bastion.example.com
    User ops
    IdentityFile ~/.ssh/id_ed25519

Host app-prod
    HostName 10.0.1.20
    User deploy
    ProxyJump bastion

Host *
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/cm-%r@%h:%p
    ControlPersist 10m
```

- The first matching value wins, so `Host *` goes last.
- `ssh -G app-prod` prints the final resolved settings; use it when a host connects with the wrong user or key.
- `ssh -O check app-prod` and `ssh -O exit app-prod` inspect and close a shared master connection.
- Name aliases so production is obvious (`app-prod`, not `app2`).

## Quoting remote commands

- The command is parsed twice: once locally, once by the remote shell. Single quotes stop the local pass: `ssh host 'echo $HOME'` prints the remote home.
- To pass a local value in, quote it for the remote shell: `ssh host "ls -- $(printf %q "$dir")"`; bare `'…'"$dir"` breaks on spaces.
- A single quote inside a single-quoted command: `'\''`.
- Pipes and redirects inside the quotes run remotely; outside them, locally. `ssh host 'cat log' | grep x` filters here.

## Heredocs over ssh

- Send a script without quoting trouble: `ssh host 'bash -s' <<'EOF'` ... `EOF`. The quoted `'EOF'` stops local expansion.
- Pass arguments to it: `ssh host 'bash -s -- arg1 arg2' < script.sh`.
- Add `set -euo pipefail` at the top so the first failure stops the script and sets the exit code.

## sudo over ssh

- `ssh -t host 'sudo systemctl restart app'` allocates a terminal so sudo can ask for a password.
- Non-interactive runs need `sudo -n`; it fails at once instead of hanging when a password would be required.
- Write a root-owned file with `sudo tee`: `echo line | ssh host 'sudo tee -a /etc/file > /dev/null'`. `sudo echo x > file` redirects as the user and fails.

## tmux cheat lines

- `tmux new -d -s job 'cmd'` start detached · `tmux ls` list · `tmux attach -t job` attach · `Ctrl-b d` detach.
- `tmux capture-pane -pt job -S -200` prints the last 200 lines without attaching; good from a one-shot `ssh`.
- `tmux kill-session -t job` when done. `screen -dmS job cmd` and `screen -r job` are the equivalents where tmux is missing.

## Dropped-connection recovery

- Reconnect and check what survived: `tmux ls`, `pgrep -af cmd`, the log's last lines, the exit marker.
- A command run in the foreground of the dropped session usually received SIGHUP and died partway; check its output before re-running, and make the re-run safe to repeat.
- A package manager killed mid-run may leave a lock: `sudo dpkg --configure -a` on Debian/Ubuntu, then retry.
- A stuck client: type `Enter ~ .` to close it. A stale master socket: `ssh -O exit host` or delete the `ControlPath` file.
- `mosh` survives roaming and sleep for interactive work, but needs UDP ports open on the host.

## Agent forwarding

- `ssh -A` lets anyone with root on the remote host use my agent for as long as I am connected. Prefer `ProxyJump`, which never exposes the agent.
- If forwarding is needed (a git pull over SSH on the server), enable it only for that host, and use `ssh-add -c` so each use asks for confirmation.
- Never forward to a shared or untrusted host.

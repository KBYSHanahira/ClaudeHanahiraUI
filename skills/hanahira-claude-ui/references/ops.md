# Operations

A look-up for work on a running service, container, build or deploy, and for anything that will not start or will not connect at all. (A connection that works and then drops or slows belongs to `hanahira-claude-ui-security`.)

## Rule one: look before touching

Every command below is read-only and needs no yes. Anything that starts, stops, restarts, reloads, installs, deletes or rewrites is asked first: show the exact command and its target, then ask. When it is unclear whether a host is production, it is production.

Find out where I am before running anything: which host, which OS, which user, which service manager. Never assume systemd, Docker or bash.

## What is running, and is it healthy?

| Question | systemd Linux | Docker / Compose | macOS | Windows (PowerShell) |
|---|---|---|---|---|
| Is it up? | `systemctl status <svc>` | `docker ps -a` · `docker compose ps` | `launchctl list \| grep <name>` | `Get-Service <name>` |
| Why did it stop? | `journalctl -u <svc> -n 100 --no-pager` | `docker logs --tail 100 <ctr>` · `docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}}' <ctr>` | `log show --last 10m --predicate 'process == "<name>"'` | `Get-WinEvent -LogName Application -MaxEvents 50` |
| What listens on the port? | `ss -ltnp` | `docker port <ctr>` | `lsof -nP -iTCP -sTCP:LISTEN` | `Get-NetTCPConnection -State Listen` |
| Resources | `df -h` · `free -m` · `uptime` | `docker stats --no-stream` | `df -h` · `vm_stat` | `Get-PSDrive` · `Get-Counter` |

A full disk, an exhausted inode table (`df -i`) and an out-of-memory kill (`dmesg -T | grep -i -E 'oom|killed'`) explain a large share of "it just stopped". Check them early.

## It will not start

Work down this list; stop at the first that explains it.

1. **Read the actual error** — the first one in the log, not the last. Later lines are usually consequences.
2. **Config**: validate with the tool's own checker before any restart (`nginx -t`, `apachectl configtest`, `sshd -t`, `docker compose config`, `caddy validate`, `haproxy -c -f <file>`).
3. **Port already taken**: see what listens there.
4. **Permissions and ownership**: the user the service runs as, the files it must read and write, SELinux or AppArmor denials.
5. **Missing dependency**: a database, a mount, an environment variable, a secret file, a network that is not up yet.
6. **Wrong version or architecture**: runtime version, image built for another CPU.
7. **Resources**: disk, memory, file-descriptor limits.

## It will not connect

Test from the outside in, one layer at a time, and note where it first fails.

```
1. Name      does the name resolve, and to the right address?      dig / nslookup / Resolve-DnsName
2. Route     can the host be reached at all?                       ping (may be blocked) / traceroute
3. Port      is the port open from where the client is?            nc -vz host port / Test-NetConnection host -Port n
4. Listener  is something listening, and on which address?         ss -ltnp   (127.0.0.1 only = not reachable from outside)
5. Firewall  host firewall, cloud security group, container        read the rules; do not change them yet
             network
6. Protocol  does it answer correctly?                             curl -v / openssl s_client -connect host:443
7. App       does the application accept the request?              its own log at the moment of the request
```

"Connection refused" means nothing is listening there or a firewall rejects actively. "Timed out" means packets are dropped: a firewall, a wrong route, or a wrong address. They point to different layers. Inside containers, `localhost` is the container itself, not the host.

## Changing a running thing

1. **Know the way back before starting**: the previous image tag, the config backup, the commit to redeploy. Copy a config file before editing it.
2. **Validate, then apply.** Prefer reload over restart where the service supports it; a reload keeps connections.
3. **One change at a time**, so the cause of any new problem is known.
4. **Check the running thing afterwards**: process up, port listening, the logs since the change, and a real request through the real entry point. A deploy is done when the new version is serving and its logs are clean — not when the command exits.
5. **Changes to how I reach the machine** — SSH, firewall, VPN — keep a second session open until the new path is proven, and are covered in `hanahira-claude-ui-security`.

## Builds and deploys

- A build that fails only in CI: compare versions, environment variables, cache state and the working directory before suspecting the code.
- Pin versions — base images, runtimes, dependencies — and build from the lock file, so the same commit builds the same thing twice.
- Keep secrets out of images, build arguments and logs; pass them at run time.
- Containers: one process per container, a non-root user, a health check, logs to stdout, state in a volume.
- Scheduled jobs: log to somewhere durable, make them safe to run twice, and check their last run rather than assuming.

## Reporting

`Done` — the exact commands run and where. `Verified` — the checks against the running thing and what they showed. `Open` — what was not checked, and what would roll the change back.

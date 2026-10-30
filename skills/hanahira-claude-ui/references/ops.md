# Ops — Docker and first checks

Read when the task touches a running service, a build, a deploy, or a service that won't start or won't connect. Use the commands for the user's OS — never Linux commands on Windows.

## Docker (only when the project uses it)

Any task touching a running service, build, or deploy starts with:

```bash
ls compose.yaml compose.yml docker-compose.yaml docker-compose.yml Dockerfile docker/ 2>/dev/null; docker compose ps
```

PowerShell: `Get-ChildItem compose*.y*ml, docker-compose*.y*ml, Dockerfile, docker -ErrorAction SilentlyContinue`. Compose file in a subfolder (e.g. `docker/`) → run compose from there or with `-f docker/docker-compose.yml`.

A compose project is the deploy path: edit compose/Dockerfile/mounted source, rebuild through compose. Never `docker run`, manual `docker build`, or edits inside a running container — they vanish on rebuild.

```bash
docker compose up -d --build <service>     # recreates the container — ask first
docker compose up -d <service>             # .env/compose change: recreates, no rebuild (`restart` keeps the old env)
docker compose build --no-cache <service>  # stale layer
docker compose ps && docker compose logs --tail=50 <service>   # verify after, never assume
```

Warn above: `down -v` destroys volumes; `system prune -a` removes images that may not rebuild offline.

## Long-running processes

A dev server or watcher is a service start: ask first, bind `127.0.0.1`, start it in the background with output to a log (`nohup <cmd> > <log> 2>&1 &`; PowerShell `Start-Process -RedirectStandardOutput`), then confirm it is ready by requesting its URL or reading the log — never assume.

## Symptom → first check

| Symptom | Linux | Windows (PowerShell) | macOS |
|---|---|---|---|
| service won't start | `systemctl status <svc>`; `journalctl -u <svc> -n 50` | `Get-Service <svc>`; `Get-WinEvent -LogName System -MaxEvents 50` | `launchctl list \| grep <svc>`; `log show --last 10m` |
| port in use | `ss -ltnpH "sport = :<port>"` | `Get-NetTCPConnection -LocalPort <port>` → `Get-Process -Id <pid>` | `lsof -nP -iTCP:<port> -sTCP:LISTEN` |
| connection refused | listening? on `0.0.0.0` vs `127.0.0.1`? | same; plus Windows Firewall rule | same; plus app firewall |
| permission denied | owner/mode, then process user | ACL (`Get-Acl`), run-as user, UAC | owner/mode; Full Disk Access |
| container exits immediately | `docker compose logs --tail=50 <svc>` — env or DB connection | same | same |
| config change no effect | reloaded? editing the file actually loaded? (`-t` / `--test`) | same; service restarted? | same |
| worked yesterday | `git diff` / `git log -p` since then, before anything else | same | same |

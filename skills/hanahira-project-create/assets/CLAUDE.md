# <name>

Hono + Vite + TypeScript on Bun. Single Docker container. MySQL runs on the host, not in Docker.

## Rebuild after every change

This project runs in production mode only. There is no hot reload — source edits do nothing until the image is rebuilt.

```bash
cd docker && docker compose up -d --build
```

Verify it came up:

```bash
docker compose ps
docker compose logs --tail=50
```

Narrower options when they apply:

```bash
docker compose up -d            # .env/compose change only: recreates the container, no rebuild
docker compose build --no-cache # stale layer suspected
```

## Layout

```
docker/     Dockerfile + docker-compose.yml
src/server  Hono app, entry at src/server/index.ts
src/client  Vite frontend, builds to dist/client
.env        real credentials, gitignored
```

## Networking

The container runs `network_mode: host` — it shares the host's network namespace. There is no port mapping; the app binds `<port>` on the host directly. Adding a `ports:` block does nothing under host mode.

`restart: unless-stopped` brings it back after a crash or a daemon restart, but not after a manual `docker compose stop`.

Host mode needs a native Linux engine. Docker Desktop (any OS, Linux included) runs the engine in a VM, so "host" is the VM: MySQL on `127.0.0.1` is not this machine's. There, use bridge mode with `ports:` and `host.docker.internal`.

## Database

MySQL runs on the host. Under host networking it's reachable at `127.0.0.1` — the container is already on the host's network stack.

`bind-address = 127.0.0.1` works as-is. A `'user'@'localhost'` grant works unless `skip_name_resolve` is ON (`SELECT @@skip_name_resolve;`) — then the TCP client is matched as `127.0.0.1`, so grant `'user'@'127.0.0.1'` instead (still loopback-only). Do not loosen beyond loopback — that would expose the database for no benefit.

If `/health` returns `db: down`, `docker compose logs` shows the reason (`health: db check failed: …`): credentials in `.env`, MySQL not running, or `Access denied … @'127.0.0.1'` (see above).

## Firewall

Port `<port>`:

```bash
<firewall-rule-as-applied>
```

Under host networking, ufw does control this port — Docker isn't publishing anything, so there are no `DOCKER-USER` rules bypassing it. The widely-repeated "Docker ignores ufw" caveat applies to bridge mode with `ports:`, not here.

To make the service loopback-only, set `hostname: "127.0.0.1"` in `src/server/index.ts` and front it with a reverse proxy.

## Gotchas

- Bun server binds `0.0.0.0`, which under host mode means every host interface.
- Static routes are registered after API routes so `/api/*` isn't swallowed by the SPA fallback.
- Nothing else on the host may use port `<port>` — host mode shares the port space.
- `bun.lock` is committed; the image builds with `--frozen-lockfile`. Run `bun install` after changing dependencies (no Bun on the host → `docker run --rm -u $(id -u):$(id -g) -v "$PWD":/app -w /app oven/bun:<bun-version> bun install`), then commit the lockfile.
- `.env` is mode 600 and never committed. If it ever gets committed, rotate every secret in it.
- Never run `ufw enable` on a remote box without allowing SSH first — it cuts the session.

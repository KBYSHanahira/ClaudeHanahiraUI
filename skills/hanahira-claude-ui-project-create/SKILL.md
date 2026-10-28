---
name: "hanahira-claude-ui-project-create"
description: Hanahira companion that scaffolds a Hono + Vite + TypeScript project on Bun as one Docker container in host network mode connected to the host's MySQL — app, docker/ folder, .env, CLAUDE.md, optional ufw rule; can also dockerize an existing project. OPT-IN ONLY — use only while Hanahira mode is ON under the core hanahira-claude-ui skill's Activation rules; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira skills. Once ON, apply it whenever scaffolding or containerizing a project comes up.
license: "MIT — Copyright (c) 2026 Hanahira. See LICENSE.txt"
---

# Hanahira Project-Create

Scaffolds a production-mode Hono + Vite + TypeScript project on Bun, in one Docker container, wired to the host's MySQL. Scaffolding has an extra hazard — a generated file that's subtly wrong gets committed and trusted. State what each file does and why any non-obvious line is there.

## Role

**Owns:** a new Hono + Vite + TypeScript project on Bun in one Docker container on the host network, connected to the host's MySQL — or containerizing an existing project the same way.

**Hands off:** other stacks → the core's `planning.md` and `ops.md`. Creating the database user and its grants → `hanahira-claude-ui-data`. Firewall changes → this file's steps under `hanahira-claude-ui-security`'s lockout rules. A service that already runs and misbehaves → `ops.md` or `hanahira-claude-ui-debug-test`.

**Helpers** aren't needed to generate files — the work follows templates and is faster done directly. Once the user has approved it, the container build and health check may go to a runner agent (core *Who does the work*) so a failed build is reported the moment it happens.

## Core first

Runs only when Hanahira is ON per the core's **Activation** (`hanahira-claude-ui/SKILL.md`). Otherwise stand down silently — no banner, no Hanahira rules, no mention — except what the core prescribes for a `/Hanahira` command or a status question. When ON and the core's rules aren't in context, read `hanahira-claude-ui/SKILL.md` first. Its *Sizing and when to ask* table applies; this file's gates are stricter where they differ, and stricter wins. Banner: the core's; roster entry **Hanahira Project-Create** (compact: `Project-Create`).

This skill replaces `planning.md` for a new Hono/Bun/Vite project or containerizing one, and `ops.md` for the new container (ops.md is for services that already exist).

## Intake — two questions

Ask both together, before generating anything, in the user's language, as a two-line form:

```
Project name: _______
Port to open: _______
```

Validate before proceeding:

- **Name** — lowercase letters, digits, hyphens; starts with a letter; ≤ 50 chars. Becomes the directory, compose project, container and package name. Convert silently if close (`My App` → `my-app`) and say what it became. Then check both are free: `ls -A <name> 2>/dev/null` (a non-empty directory → stop; offer existing-project mode instead of writing over it) and `docker ps -a --format '{{.Names}}' | grep -x <name>` (a container with that name makes `up` fail).
- **Port** — 1024–65535, not a port a known service on this host is configured for even if it's stopped right now (3306, 5432, 6379, 8080 for an existing proxy…). Reject anything in use and say which process holds it: `sudo -n ss -ltnp | grep :<port>`, or `lsof -i :<port>`.

Read-only `sudo` probes (`ss -ltnp`, `ufw status`) count as reads: run them with `sudo -n`; if that fails, run without `sudo` (`ss -ltn` hides process names) and say so; `ufw status` needs root, so if `sudo -n ufw status` fails the ufw state is unknown — say so and put the rule in the plan as conditional (add only if it shows Active). Never wait on a password prompt.

Ask nothing else. Writing files into a new directory needs no further yes. Database credentials go in `.env` as placeholders; create it `chmod 600` — it will hold real passwords.

## The plan — one yes

After the answers, write the files, then show ONE plan: the file tree plus the state-changing steps, each exact:

1. Lockfile — `bun install` (host has `bun`), else in a throwaway container: `docker run --rm -u $(id -u):$(id -g) -v "$PWD":/app -w /app oven/bun:<bun-version> bun install`. `bun.lock` gets committed; without it `--frozen-lockfile` still passes but resolves fresh versions every build.
2. Start — `cd docker && docker compose up -d --build`.
3. Firewall — open `<port>` to: (a) everyone, (b) a CIDR you name, (c) nobody (loopback + reverse proxy). Recommend (b) or (c) while the app has no auth. See **Firewall** for the exact command per ufw state.

One yes covers that plan as shown. Nothing outside it runs without a new yes — a changed step, an extra `sudo`, a removal of an old container.

## Two modes

**New project** — generate everything below.

**Existing project without Docker** — skip app scaffolding. Generate only `docker/`, `.dockerignore`, `.env` additions, and `CLAUDE.md`. Read the existing `package.json` first and match the real build command, entry point, and runtime. Never overwrite existing source or replace a `package.json`. If the project isn't Bun-based, say so and adapt the Dockerfile to what's there rather than forcing Bun. Compose still gets `name: <name>`.

Existing files are merged, never replaced: `.env` gets only the missing keys appended (existing values untouched and never printed), `.gitignore` gets `.env` added if absent, an existing `CLAUDE.md` gets a new section. If `git ls-files .env` shows `.env` is already tracked, say so above everything else: untrack it (`git rm --cached .env`) and **rotate** every secret in it — it's in the history.

## Structure

```
<name>/
├─ docker/
│  ├─ Dockerfile
│  └─ docker-compose.yml
├─ src/
│  ├─ server/index.ts       Hono app + Bun server
│  └─ client/
│     ├─ index.html         Vite entry
│     └─ main.ts
├─ .env                     real values, gitignored
├─ .env.example             placeholders, committed
├─ .dockerignore
├─ .gitignore
├─ CLAUDE.md
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

Everything Docker-related lives in `docker/`. The compose file builds with `context: ..` so it still sees the project root, and sets `name: <name>` — otherwise every project is named `docker` and one project's `up`/`down` replaces or removes another's container.

## Production only

No dev mode in the container. Edit source → rebuild → run. Vite builds to static assets; Hono serves them. No dev server, no HMR, no `--watch` in the image.

```bash
cd docker && docker compose up -d --build
```

It stops and recreates the container — every rebuild of an existing container needs a yes. `.env`/compose-only change → `docker compose up -d` (recreates, no rebuild); `restart` keeps the old environment.

## Host networking

`network_mode: host` and `restart: unless-stopped`. The container shares the host's network namespace. Consequences that change how everything else is written:

- **No port mapping.** A `ports:` block is ignored under host mode — never add one back; it misleads readers of the file. Same for `EXPOSE`.
- **Port conflicts are real.** Nothing else on the host may hold `<port>` — hence the check at question time.
- **Native Linux engine only.** Check the engine, not the OS: `docker info --format '{{.OperatingSystem}}'`. Contains "Docker Desktop" (any OS, Linux included) → the engine runs in a VM, so `127.0.0.1:3306` isn't the host's MySQL. Say so and offer bridge mode with `ports:` plus `host.docker.internal`.
- **`extra_hosts: host-gateway` is unnecessary** — it bridges a separation that doesn't exist here.

`unless-stopped` restarts on failure and daemon start but respects a manual `docker compose stop`.

## Host MySQL, not containerized

```
DB_HOST=127.0.0.1
```

Never `host.docker.internal` — that's a bridge-mode name and won't resolve. The connection comes from `127.0.0.1`, so `bind-address = 127.0.0.1` works as-is and a `'user'@'localhost'` grant works — unless `skip_name_resolve` is ON (`SELECT @@skip_name_resolve;`); then grant `'user'@'127.0.0.1'`, still loopback-only. **Say this when generating** — a user who has fought bridge-mode Docker will expect to loosen MySQL, and loosening it here exposes the database for no reason. Never add a MySQL service to the compose file. One container, by design.

## Firewall

Host mode: ufw controls this port (no `DOCKER-USER` bypass).

```bash
command -v ufw && sudo -n ufw status
```

- **Not installed** (or macOS/Windows) → one line, skip. Don't install a firewall the user didn't ask for.
- **Inactive** → never `ufw enable` — it drops every connection not yet allowed, including the user's SSH. The rule may still be added dormant (applies when ufw is later enabled), only as part of the plan's yes.
- **Active** → (a) `sudo ufw allow <port>/tcp comment '<name>'` · (b) `sudo ufw allow from <cidr> to any port <port> proto tcp comment '<name>'` · (c) no rule; set `hostname: "127.0.0.1"` in the Bun server and front it with a reverse proxy — under host mode that binding is the real control. Verify with `sudo -n ufw status numbered`.

In `CLAUDE.md`, replace `<firewall-rule-as-applied>` with the exact command run, or `not opened: <reason>`.

## Templates

Read `assets/` and copy, substituting `<name>`, `<port>` and `<bun-version>`:

```
assets/Dockerfile           multi-stage Bun build; set ARG BUN_VERSION from `bun --version`; no host Bun → `docker run --rm oven/bun:1 bun --version` (a pull — list it in the plan)
assets/docker-compose.yml   single service, host MySQL wiring
assets/server-index.ts      Hono app, static serving, health route, DB pool
assets/package.json         scripts and dependencies
assets/env.example          → .env.example (as is) and .env (chmod 600)
assets/CLAUDE.md            the project memo
assets/misc.md              tsconfig, vite.config, dockerignore, gitignore, client index.html + main.ts
```

## After generating

Report compactly — the tree, the MySQL note above, then the plan. After its yes, run the plan and verify rather than assume:

```bash
cd docker && docker compose ps           # STATUS should reach (healthy), not just Up
docker compose logs --tail=50
curl -s localhost:<port>/health          # {"db":"up"} once .env has real credentials
```

## Symptom → first check

| Symptom | Check first |
|---|---|
| container exits immediately | `docker compose logs --tail=50` — almost always DB connection or missing env |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL running? `bind-address`? On Docker Desktop (any OS)? → bridge + `ports:` |
| `Access denied … @'127.0.0.1'` | `skip_name_resolve` ON — grant `'user'@'127.0.0.1'` |
| port unreachable from another machine | ufw rule present and active; app bound to `0.0.0.0` not `127.0.0.1` |
| `EADDRINUSE` | another process holds `<port>` — `sudo -n ss -ltnp \| grep :<port>` |
| frontend 404s | Vite build output path doesn't match what Hono serves — check `vite.config.ts` `outDir` |
| container stays `(unhealthy)` | `/health` returns 503 — the reason is in the logs (`health: db check failed`) |
| `container name already in use` | an old container holds `<name>` — `docker ps -a`, then remove it only with a yes |
| another app's container disappeared | compose project name collision — each compose file needs its own `name:` |
| change to source has no effect | not rebuilt — production image needs `up -d --build` |
| `.env` change has no effect | `restart` keeps the old env — `docker compose up -d` |

## Output shape

Generated files as a tree, not prose. Explain only the lines a reviewer would question. Answer in the user's language, including the two intake prompts. Generated file contents — code, config, comments, CLAUDE.md — stay in English, since they get committed and read by tooling and teammates.

## What this mode is not

Not a dev-mode setup — if the user asks for hot reload, say it conflicts with the production-rebuild design and let them decide. Not a reason to assume an existing project's shape — read `package.json` before writing a Dockerfile against it.


# Pipelines and containers

A look-up for building and shipping: CI configuration, reproducing a CI failure locally, Dockerfiles per language, Compose for development, and image scanning. The rule does not change — pin it, reproduce it, prove it — but each platform has its own switches.

## GitHub Actions

- **Pin actions by commit SHA**: `uses: actions/checkout@<40-char-sha> # v4.2.2`. A tag can be moved; a SHA cannot.
- **Least privilege**: set `permissions:` at the top (`contents: read`) and widen per job only where needed.
- **Caching**: `actions/setup-node` with `cache: npm`, or `actions/cache` keyed on `hashFiles('**/package-lock.json')`. A key without the lock file serves stale dependencies.
- **Matrix**: `strategy.matrix` for versions and OS; `fail-fast: false` when every cell's result matters.
- **Artifacts**: `actions/upload-artifact` and `actions/download-artifact` pass build output between jobs; set `retention-days`.
- **Concurrency**: `concurrency:` with `group: deploy-${{ github.ref }}` and `cancel-in-progress: false` (block form; braces inside `{ }` break YAML) for deploys; `true` for PR builds.
- **Cloud credentials by OIDC**: `permissions: id-token: write` plus the cloud's login action (`aws-actions/configure-aws-credentials`, `google-github-actions/auth`, `azure/login`) with a role trusted only for this repo and branch. No long-lived keys in secrets.
- **Secrets**: reference as `${{ secrets.NAME }}`; never `echo` them; pass them to scripts through `env:`, not the command line. Use environments with required reviewers for production.
- **Untrusted input**: never interpolate `${{ github.event.* }}` titles or branch names into `run:`; pass them through `env:` and quote.
- **Timeouts**: set `timeout-minutes` on every job; the default is six hours of a hung runner.
- **Path filters**: `on: push: paths:` keeps docs-only changes from running the full build.
- **Reuse**: shared steps go in a reusable workflow (`workflow_call`) or a composite action, pinned like any other action.
- **Debugging**: `gh run list`, `gh run view <id> --log-failed`, `gh run rerun <id> --failed`; set the `ACTIONS_STEP_DEBUG` secret to `true` for verbose logs.

## GitLab CI

- `cache:` with `key: files: [package-lock.json]`; `artifacts:` with `expire_in`.
- `parallel: matrix:` for matrices; `needs:` for a DAG instead of strict stages.
- `resource_group: production` serialises deploys.
- Protected and masked variables for secrets; `id_tokens:` for OIDC to clouds.
- `rules:` instead of `only`/`except`; pin `image:` by digest.

## Reproducing CI locally

- Use the same image: `docker run --rm -v "$PWD":/src -w /src node:20-bookworm sh -c '<the step's exact commands>'`.
- Match the environment: CI often sets `CI=true`, a different locale and time zone, no TTY, and a clean checkout (a fresh clone, or `git clean -xdn` to see what a clean would remove).
- GitHub Actions: `act -j <job>` runs a job locally; good for shell steps, weaker for service containers and OIDC.
- GitLab: `gitlab-runner exec` is gone from recent versions; run the job's image by hand.
- Differences that bite: file-system case sensitivity, CPU count (parallel tests), a missing cache, a shallow clone (`fetch-depth: 0` when tags or history matter).

## Dockerfiles by language

- **Node**: `FROM node:20-slim AS build`, `COPY package*.json ./`, `RUN npm ci`, build; a runtime stage runs `npm ci --omit=dev` and copies `dist/`; runtime `USER node`, `CMD ["node", "dist/server.js"]` in exec form so signals reach the process.
- **Python**: `python:3.12-slim`; `PIP_NO_CACHE_DIR=1`, `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`; install `requirements.txt` before copying code, or build wheels in one stage and install them in the next.
- **Go**: build with `CGO_ENABLED=0 go build -trimpath -ldflags="-s -w"` in `golang:1.23`; ship on `gcr.io/distroless/static` or `scratch` with CA certificates copied in.
- **Java**: build in a JDK image (`./mvnw -B package` or `./gradlew build`); run on a JRE image; set `-XX:MaxRAMPercentage=75` so the heap respects the container limit.
- All: pin base images by digest; use `RUN --mount=type=cache` for package managers and `--mount=type=secret,id=npmrc` for private registries (BuildKit); add a `HEALTHCHECK` or a probe.
- Check the result: `docker image ls` for size, `docker history <image>` for fat layers, `docker run --rm <image> id` for the user.

## Compose for development

- One `compose.yaml` for the stack; `compose.override.yaml` for dev-only bind mounts and ports.
- `depends_on: { db: { condition: service_healthy } }` with a `healthcheck:` on the database; plain `depends_on` only orders start.
- `env_file: .env` kept out of git; commit an `.env.example`.
- Named volumes hold data; removing volumes on teardown deletes it, so say so before doing it.
- Useful: `docker compose config` (the resolved file), `docker compose logs -f <svc>`, `docker compose up --build`, `docker compose exec <svc> sh`.
- Use `profiles:` for optional services rather than a second file.

## Image scanning and supply chain

- Scan in CI and fail on fixable high and critical findings: `trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed <image>` or `grype <image>`.
- Scan the repo too: `trivy fs .` for dependencies and misconfigurations, `hadolint Dockerfile` for Dockerfile mistakes.
- Generate an SBOM (`syft <image> -o spdx-json`) and sign images (`cosign sign`) where the platform verifies them.
- A finding in the base image is fixed by a newer base digest, not by patching in a layer.

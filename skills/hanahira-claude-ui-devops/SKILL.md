---
name: "hanahira-claude-ui-devops"
description: Hanahira Claude UI companion for delivery and infrastructure — CI/CD, Docker, Kubernetes, Terraform, cloud CLIs and IAM, deploys, rollbacks, alerts. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — DevOps

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Every deploy has a way back that was known before it went out, and a check after it.** Name the rollback command and the signal that proves health before shipping. Deploying, applying infrastructure, changing a live pipeline or touching secrets is an outward step under the core's rule 2 unless the user named it.

## What saves the most time

- **The failing CI log from its first error.** `gh run view <id> --log-failed` shows only the failed steps; later errors are usually consequences.
- **Reproduce the CI step locally** with the same image and command: `docker run --rm -v "$PWD":/src -w /src <ci-image> sh -c '<step>'`. A guess about the runner costs more than a run.
- **Plan before apply.** `terraform plan -out=tfplan`, `kubectl diff -f <file>`, `helm diff upgrade` (plugin) or `helm template`. Read the diff; apply exactly the reviewed plan.
- **Pin versions and digests**: base images by `@sha256:`, actions by commit SHA, charts and providers by exact version. Floating tags make yesterday's build unrepeatable.
- **One change per deploy.** When it breaks, the cause is the one thing that changed.

## Pipelines

- Fail fast: lint and unit tests before slow stages; cache dependencies keyed on the lock file.
- Build once, promote the same image digest through environments; never rebuild for production.
- Secrets come from the platform's store or OIDC, never from the repo or echoed into logs. Prefer short-lived credentials.
- Set `concurrency` (or `resource_group`) so two deploys to one environment cannot race.

## Containers

- Multi-stage builds: compile in a full image, ship a slim or distroless runtime.
- Run as a non-root `USER`; keep a `.dockerignore` so `.git`, `node_modules` and `.env` stay out of the context.
- Order layers from least to most changing: dependency manifests and install before copying source.
- Add a `HEALTHCHECK` or an orchestrator probe. Never put secrets in `ARG`, `ENV` or a layer; use `RUN --mount=type=secret`.

## Kubernetes

- Set requests and limits on every container; a missing memory limit hides a leak until the node suffers.
- Readiness gates traffic, liveness restarts; do not point liveness at a dependency.
- `kubectl rollout status deploy/<name>` after every change; `kubectl rollout undo deploy/<name>` is the way back.
- Diagnose with `kubectl describe pod <pod>`, `kubectl get events --sort-by=.lastTimestamp`, `kubectl logs <pod> --previous`.

## Infrastructure as code

- State is the source of truth: remote, locked, versioned. Back it up (`terraform state pull > backup.tfstate`) before any state command.
- Check drift with `terraform plan` before any change; a plan with surprises is a stop.
- Read every `destroy` and `replace` in the plan; know the blast radius of each resource.
- Bring existing resources in with an `import` block or `terraform import` rather than recreating them.

## Observability

- Structured logs (JSON) carrying a request id across services; no secrets or personal data in them.
- RED metrics for services (rate, errors, duration), USE for resources (utilisation, saturation, errors).
- Alert on symptoms users feel, not on every cause; each alert links a runbook with the first steps.

## Working with tools and other skills

- A service that will not start or will not connect: core `references/ops.md`, not here.
- Pair up: `hanahira-claude-ui-security` for secrets, TLS or firewall; `hanahira-claude-ui-data` for a migration that ships with a deploy; `hanahira-claude-ui-backend` for health checks and graceful shutdown in the service's own code; `hanahira-claude-ui-perf` for capacity and load; `hanahira-claude-ui-debug-test` for a test failing in the pipeline; `hanahira-claude-ui-network` for DNS or a load balancer in front of it; `hanahira-claude-ui-remote` for a deploy done over SSH; `hanahira-claude-ui-automation` for a scheduled job; `hanahira-claude-ui-claude-remote` for `claude -p` in CI.
- Helpers follow `references/agents.md` in the core. A deploy or apply is never handed to a helper.

Pipelines, CI reproduction, Dockerfiles, Compose and scanning: `references/pipelines-and-containers.md`. Release strategies, rollbacks, migrations, Kubernetes failures, Terraform state and alerting: `references/deploy-and-observe.md`.

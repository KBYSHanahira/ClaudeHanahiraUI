# Deploy and observe

A look-up for putting a change live and knowing it worked: release strategies, rollback per platform, database migrations alongside deploys, Kubernetes failure states, Terraform state, and the basics of logs, metrics and alerts. Before each step, the way back is known and the health signal is named.

## Release strategies

- **Rolling**: replace instances a few at a time. Cheap, and the Kubernetes default (`maxSurge`, `maxUnavailable`). Old and new run together, so both must accept the same data and APIs.
- **Blue-green**: bring up the full new version beside the old, switch traffic at once, keep the old ready. Rollback is switching back; it costs double capacity during the switch.
- **Canary**: send a small share of traffic (1–10%) to the new version, compare error rate and latency with the baseline, then widen. Needs metrics split by version and an automatic stop (Argo Rollouts, Flagger, a load-balancer weight).
- **Feature flags** separate deploy from release: ship dark, turn on gradually, turn off without a deploy.

## Rollback by platform

- **Kubernetes**: `kubectl rollout undo deploy/<name>` (or `--to-revision=<n>` after `kubectl rollout history deploy/<name>`); watch with `kubectl rollout status`.
- **Helm**: `helm history <release> -n <ns>`, then `helm rollback <release> <revision> -n <ns>`. `helm upgrade --atomic --timeout 5m` rolls a failed upgrade back by itself.
- **Docker Compose**: set the previous pinned tag or digest, then `docker compose up -d <svc>`.
- **Terraform**: revert the commit, then `plan` and `apply` again; there is no undo. Destroyed data is not restored by reapplying.
- **Serverless and PaaS**: move the alias or traffic to the previous version (`aws lambda update-alias`, `gcloud run services update-traffic <svc> --to-revisions=<rev>=100`, `heroku rollback`).
- **Git-driven (Argo CD, Flux)**: revert in git; a manual change on the cluster is overwritten by the next sync.

## Database migrations with deploys

- Code and schema never change in one step. Use **expand / contract**:
  1. Expand: add the new column or table, nullable or with a default; old code ignores it.
  2. Deploy code that writes both and reads old (or reads new with a fallback).
  3. Backfill in batches.
  4. Deploy code that reads only new.
  5. Contract: drop the old column in a later release, after the rollback window.
- Each step stays compatible with the code still running, so rolling back the app never needs rolling back the schema.
- Run migrations as one job before rollout, not in every replica's start-up. Know the restore point first; pair with `hanahira-claude-ui-data`.

## Kubernetes failure states

| State | Look at | Usual cause |
|---|---|---|
| `CrashLoopBackOff` | `kubectl logs <pod> --previous`, exit code in `describe` | app error at start, missing config or secret, failing liveness probe |
| `ImagePullBackOff` / `ErrImagePull` | `describe` events | wrong tag or digest, private registry without `imagePullSecrets`, registry rate limit |
| `OOMKilled` (exit 137) | `describe` last state, `kubectl top pod` | memory limit below real use, a leak, a runtime heap unaware of the limit |
| `Pending` | `describe` events | requests larger than any node, selector or taint mismatch, unbound PVC, quota |
| `CreateContainerConfigError` | `describe` events | referenced ConfigMap, Secret or key missing |
| Running but not Ready | readiness probe in `describe`, `kubectl get endpoints` | wrong probe path or port, dependency down, slow start without a `startupProbe` |

- `kubectl get events -n <ns> --sort-by=.lastTimestamp` shows the order of what happened.
- `kubectl debug -it <pod> --image=busybox --target=<container>` gives a shell beside a distroless container.

## Terraform workflow and state recovery

- Workflow: `terraform fmt -check`, `terraform validate`, `terraform plan -out=tfplan`, review, `terraform apply tfplan`. In CI, plan on the PR and apply only the reviewed plan on merge.
- Remote backend with locking (S3 with locking, GCS, Terraform Cloud). A stuck lock after a crashed run: confirm nothing is running, then `terraform force-unlock <id>`.
- Before any state surgery: `terraform state pull > backup.tfstate`.
- Renamed resource: a `moved` block (or `terraform state mv`) instead of destroy and create.
- Resource exists but not in state: an `import` block or `terraform import <addr> <id>`.
- Resource in state that Terraform should stop managing: a `removed` block or `terraform state rm <addr>`.
- Drift: `terraform plan -refresh-only` shows it without changing anything; decide whether the code or reality is right.
- Guard critical resources with `lifecycle { prevent_destroy = true }`.

## Logs, metrics, alerts

- **Logs**: JSON lines with timestamp, level, service, version and request id; one event per line; log at boundaries (request in, call out, error). Never log secrets, tokens or full personal data.
- **Metrics**: RED per service (request rate, error ratio, latency p50/p95/p99 from histograms); USE per resource (CPU, memory, disk, connections). Label by version so a canary can be compared; keep label cardinality low (no user ids).
- **Alerts**: page on symptoms (error ratio, SLO burn rate, saturation about to run out), not on every cause. Each alert has an owner, a threshold over a window (`for: 5m`), and a runbook link with the first checks and the rollback.
- After every deploy, compare the same dashboard before and after over at least one window; that comparison is the check the discipline asks for.

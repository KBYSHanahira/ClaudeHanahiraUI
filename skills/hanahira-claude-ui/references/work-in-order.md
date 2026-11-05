# Work in order — refactoring, multi-component failures, done table

Read when refactoring, migrating an API/config/dependency, or chasing a failure across several components. Single-bug discipline (reproduce, confirm cause, one change at a time, three failed fixes) lives in `hanahira-claude-ui-debug-test`.

- **Failure across components** (client → proxy → app → DB): find the first boundary where input is right and output is wrong before touching any component. One read-only check per boundary.
- **A refactor keeps behavior.** Name what must not change (public interfaces, failure behavior, ordering) and run the same proof before and after. One ownership boundary at a time, every intermediate state buildable, no feature changes and no new dependencies mixed in. Stop when behavior matches and the requested structure exists.
- **A migration is reversible** (API, protocol, config, dependency; data/schema → `hanahira-claude-ui-data`). Map current readers, writers and the compatibility window first; define forward and rollback paths; sequence expand → migrate → verify → contract; keep mixed versions safe while rollout overlaps; make retries idempotent and partial failure visible. Stop after the requested stage — the destructive contract step is never implicit and needs its own yes.

## Done means verified — full table

| Claim | Needs | Not enough |
|---|---|---|
| fixed | the original symptom re-run, now gone | the code changed |
| tests pass | the full test command, exit 0, its output free of new warnings | an earlier or partial run |
| build / deploy ok | build exit 0; the service's status + recent logs from whatever runs it (`references/ops.md`) | linter clean |
| works where it runs (core *Check the running thing*) | on that machine: the loaded code is the edited code (rebuilt, reloaded or restarted — a restart needs its yes); the process or container up; the port listening (`ss -ltnp` on Linux, `lsof -iTCP -sTCP:LISTEN` on macOS, `Get-NetTCPConnection -State Listen` on Windows); its logs since the change clean; the real entry point answering (the endpoint with `curl`, the CLI run, the page loaded) | tests passing in the repo |
| regression test is valid | fails with the fix reverted, passes restored | passed once |
| delegated work done | the diff or state, read directly | the helper said so |
| a runner's command passed | its exit code and the end of its log, read by me | the runner's summary |
| requirements met | each requirement checked off | tests passing |

**Scope limits the change, not the check.** A task about one file still runs the project's full test command before "done", and every red test seen goes in the report by name — including ones I didn't cause and won't fix. Failures that were red before my change are the baseline: name them; the claim is then "no new failures (baseline: <names>)", never "tests pass". Leaving one out misreports the state.

Report each check as pass, fail, unavailable, or blocked. Reuse a result only if nothing changed after it ran. Focused check before the wider one. Once the proof is complete, stop — no extra polish, cleanup, or unrelated tests.

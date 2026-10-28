# Work in order — refactoring, multi-component failures, done table

Read when refactoring, migrating an API/config/dependency, or chasing a failure across several components. Single-bug discipline (reproduce, confirm cause, one change at a time, three failed fixes) lives in `hanahira-claude-ui-debug-test`.

- **Failure across components** (client → proxy → app → DB): find the first boundary where input is right and output is wrong before touching any component. One read-only check per boundary.
- **A refactor keeps behavior.** Name what must not change (public interfaces, failure behavior, ordering) and run the same proof before and after. One ownership boundary at a time, every intermediate state buildable, no feature changes and no new dependencies mixed in. Stop when behavior matches and the requested structure exists.
- **A migration is reversible** (API, protocol, config, dependency; data/schema → `hanahira-claude-ui-data`). Map current readers, writers and the compatibility window first; define forward and rollback paths; sequence expand → migrate → verify → contract; keep mixed versions safe while rollout overlaps; make retries idempotent and partial failure visible. Stop after the requested stage — the destructive contract step is never implicit and needs its own yes.

## Done means verified — full table

| Claim | Needs | Not enough |
|---|---|---|
| fixed | the original symptom re-run, now gone | the code changed |
| tests pass | the full test command, exit 0 | an earlier or partial run |
| build / deploy ok | build exit 0; the service's status + recent logs (e.g. `docker compose ps` + logs) | linter clean |
| regression test is valid | fails with the fix reverted, passes restored | passed once |
| delegated work done | the diff or state, read directly | the helper said so |
| a runner's command passed | its exit code and the end of its log, read by me | the runner's summary |
| requirements met | each requirement checked off | tests passing |

Report each check as pass, fail, unavailable, or blocked. Reuse a result only if nothing changed after it ran. Focused check before the wider one. Once the proof is complete, stop — no extra polish, cleanup, or unrelated tests.

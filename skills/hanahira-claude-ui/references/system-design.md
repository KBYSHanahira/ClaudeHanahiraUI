# System design — Hanahira method

Read when the task is designing or reviewing a system: architecture, service boundaries, APIs, data flow, queues, caching, scaling, or "how should I build X". Terse rules from the core still apply — compress the packaging, never the structure. Hand schema detail to `hanahira-claude-ui-data`, auth/network detail to `hanahira-claude-ui-security`.

A design is only as good as the questions it answers before it's built. The failure to avoid is a clean diagram that nobody checked against real numbers, real failures, or the team that has to run it.

## 1. Frame — before any boxes

```
Job        the 2–3 core flows the system must do (user signs up, places order, gets report)
Numbers    users, requests/sec at peak, data size now and in a year, read:write ratio
Targets    latency that matters (p95 for the core flow), availability, data-loss tolerance
Limits     team size, stack already in use, hosting (one VM? k8s?), budget, deadline
```

Missing numbers → estimate on the back of an envelope and say so ("~50 rps peak, assuming 5k DAU × 10 actions in a 2h window"). A design without numbers can't be judged as too big or too small. If one unknown flips the whole design (single server vs distributed), ask that one question.

## 2. Start with the simplest thing that meets the numbers

Default: one service + one database + a reverse proxy, deployed the way the user already deploys. Add each extra part — a queue, a cache, a second service, a read replica — only when a named requirement from step 1 forces it, and write that requirement next to it. Every component added is something to deploy, monitor, back up, and debug at 3 a.m.

Smells of over-design: microservices for a team of one or two; Kafka for 20 msgs/sec; a cache before measuring the slow query; Kubernetes for one container.

## 3. Data first

Most system design is data design. For each core flow:

- **Entities and relationships** — cardinality, nullability, what cascades on delete.
- **Ownership** — exactly one component owns each write. Two writers to one table with no owner is the most common source of "it randomly got overwritten".
- **Access patterns** — which queries each flow runs, how often; indexes follow from these, not the other way round.
- **Invariants** — what must never be true (negative balance, double booking) and where it's enforced: a DB constraint beats app code beats "we'll be careful".
- **Consistency** — where stale reads are fine and where they're a bug.

## 4. Boundaries and flow

- Draw the path of one request through every component for each core flow. If a hop can't be justified by step 1, remove it.
- **Sync vs async**: the user waits → sync, and keep it short; the work can happen later → queue it, and the user gets a status to poll or a notification.
- Every boundary needs an answer to "what happens when the other side is slow or down": timeout value, retry policy, fallback, or a clear error.

## 5. Interfaces

For each API: resource and method, request/response shape, error codes and body, auth, pagination for any list, and **idempotency for anything retried** (payments, order creation, webhooks — use an idempotency key). Version from day one only if external clients exist.

## 6. Failure and operations

```
Dependency down    DB, cache, 3rd-party API — what the user sees; degrade, don't cascade
Retries            bounded, exponential backoff + jitter, only on idempotent operations
Queues             dead-letter queue, max attempts, poison-message handling, backpressure
Cache              what invalidates it; what happens on a cold cache (thundering herd)
Data               backups on a schedule AND a tested restore; migrations reversible or staged
Observe            structured logs with request id, health endpoint, the 3 metrics that page someone
Deploy             how it ships and how it rolls back in under 5 minutes
```

## 7. Decide, don't survey

For each real decision, one line in this form — a decision record, not an essay:

```
Queue: Redis list, not RabbitMQ — 30 jobs/min, Redis already runs; revisit above ~1k/min
```

Mark **one-way doors** (hard to reverse: data model, public API, choice of primary DB) — these deserve the thinking time and a checkpoint with the user. Two-way doors (library choice, cache TTL) get a sensible default and move on.

## 8. Growth

State what breaks first at 10× the step-1 numbers and what the fix would be. That's the whole scaling section — don't build for 100× now.

## Output shape

```
Goal & numbers    3–5 lines (incl. stated assumptions)
Design            component list or a small diagram; one line per component: its job + why it exists
Data              entities, ownership, key constraints (table or type block)
APIs              the core endpoints, compact
Failure modes     table: what fails → what happens → mitigation
Decisions         decision-record lines; one-way doors marked
Open questions    only ones that would change the design
```

Small questions ("Redis or in-memory for sessions?") get a one-line decision record, not the whole template. Use the template for "design X" and scale it to the size of X.

## Symptom → first check

| Symptom | Check first |
|---|---|
| schema keeps needing migrations | a relationship modelled as a column that should be a join table |
| unclear which service writes what | ownership not stated — state it before anything else |
| "random" overwrites | two writers to one record with no owner, or no optimistic lock (`version` column) |
| duplicate orders / charges | a retried call without an idempotency key |
| queue backs up forever | no dead-letter path; one poison message blocking the consumer |

## Example

**Input:** How should I model users and organizations?

```
users        id, email (unique), name
orgs         id, name, owner_id → users.id
memberships  user_id, org_id, role   (PK: user_id + org_id)
```
"Membership is a join table, not a `users.org_id` column — a user in two orgs is a normal case, and refactoring out of the column later is a data migration. `owner_id` is denormalized on purpose so orgs can't end up ownerless."

## Review checklist — run before sending a design

- Every component traces back to a requirement from step 1.
- Every write has one owner.
- Every retried call is idempotent.
- Every external call has a timeout.
- Every queue has a dead-letter path; every cache has an invalidation story.
- Backups have a restore test; migrations have a rollback.
- The numbers in step 1 actually fit the design (a single MySQL easily does thousands of simple queries/sec; don't shard it for 50).
- The team in step 1 can run it.

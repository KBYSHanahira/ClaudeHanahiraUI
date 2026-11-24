# Services

A look-up for the patterns behind the short rules in `SKILL.md`. Library and platform details change: read the project's lock file for the version in use and confirm against that version's docs before relying on any API named here.

## Idempotency

- **By key.** The caller sends a unique key (a header, a job id, a message id); the handler records it in the same transaction as the effect, under a unique constraint. A second arrival finds the key and returns the first result.
- **By state.** The effect is written as a move between states (`pending → paid`), done by one conditional statement (`UPDATE … WHERE id = ? AND status = 'pending'`); zero rows changed means someone else did it.
- **By upsert.** `INSERT … ON CONFLICT DO UPDATE/NOTHING` (PostgreSQL, SQLite), `INSERT … ON DUPLICATE KEY UPDATE` (MySQL). Syntax and locking differ per engine: `hanahira-claude-ui-data`.
- An idempotency record has a lifetime; say how long a repeat is still recognised.

## Two systems, one change (the outbox)

A database write and a message to a queue cannot be made atomic by calling one after the other.

1. In the same transaction as the business write, insert a row into an outbox table (the event, its id, `sent_at` null).
2. A separate loop reads unsent rows in order, publishes each, then marks it sent.
3. Publishing can happen twice (a crash after publish, before the mark), so consumers are idempotent by the event id.

The reverse (consume a message, write to the database) uses the message id as the idempotency key in the same transaction as the write, and acknowledges only after the commit.

## Queues and workers

- **Acknowledge after the work**, not on receipt; a worker killed mid-job must leave the message to be redelivered.
- **Visibility or lock timeout** longer than the slowest honest run, or the job is handed to a second worker while the first still runs. Long jobs extend the lock or are split.
- **Retries**: bounded count, exponential backoff with jitter; separate errors worth retrying (a timeout, a 503, a deadlock) from those that will fail the same way (a validation error, a missing row).
- **One poisoned message** must not stop the queue behind it: after its retries it moves aside.
- **A payload, event or cached value outlives the deploy**: old and new code run together during a rollout, so change its shape compatibly (add optional fields; the reader tolerates both) or version the key or queue.
- **Dead letters** are looked at: an alert on their count, and a way to replay one after the fix.
- **Order** is guaranteed only where the queue says so, usually per key or partition and only with one consumer for it; code that needs order checks a version or sequence number instead of trusting arrival.
- **Concurrency** per worker is a setting with a reason: bounded by the database pool and by the rate limits of what the job calls.
- A queue in the database (`SELECT … FOR UPDATE SKIP LOCKED` in PostgreSQL and MySQL 8) is sound for modest load and gives transactions with the business data for free.

## Locks and scheduled work

- A lock across processes lives outside them: a database advisory lock or row lock, or a cache key set with "only if absent" and an expiry.
- A lock with an expiry can run out while its holder is still working (a pause, a slow call). Work that must not be done twice also carries a fencing check: a version or token the final write verifies.
- Release a lock only if still holding it (compare the token), never by plain delete.
- A scheduler that runs on every instance fires once per instance; take a lock, or run the scheduler as one process.

## Database connections

- One pool per process, sized so that all instances together stay under the database's connection limit; serverless and many small workers need a pooler in front.
- A connection is returned on every path, errors included (`finally`, `defer`, a context manager). A pool that runs dry looks like a hang.
- A transaction is as short as its statements; no network call, no user wait, no long computation inside it.
- A deadlock or serialisation failure is retried from the start of the transaction, a bounded number of times.

## Caching patterns

- **Cache-aside**: read the cache; on a miss read the source, store with a TTL. On a write, delete the key after the commit (deleting is safer than updating: two writers cannot leave an old value behind). A reader that missed before the commit can still store the old value after the delete, so the TTL stays as the backstop.
- **Stampede**: a per-key lock so one caller recomputes, or stale-while-revalidate; add jitter to TTLs so keys written together do not expire together.
- **Negative results** (not found) are cached briefly too, or a missing key is a query on every request.
- Never cache a response that depends on who asked under a key that does not say who.
- An in-process cache is per instance: fine for values that may differ briefly between instances, wrong for anything a user must see change at once.

## Graceful shutdown

1. On SIGTERM, mark the instance not ready and stop pulling from the queue; keep answering liveness and keep accepting requests.
2. Once the load balancer has stopped sending (a short wait or a preStop sleep: Kubernetes removes the pod from endpoints alongside SIGTERM, not before it), close the listener.
3. Wait for in-flight requests and jobs, up to a deadline shorter than the platform's kill timeout (Docker's default stop timeout is 10s; Kubernetes' default grace period is 30s — read the project's own setting).
4. Close pools and connections, flush logs and metrics, exit 0.

In a container the signal must reach the process and be handled: a shell-form `CMD` or an `npm start` wrapper can swallow SIGTERM, and a process running as PID 1 ignores SIGTERM unless it installs a handler (or runs under an init such as `docker run --init` or `tini`). Otherwise it is killed at the timeout with work in hand (`hanahira-claude-ui-devops`).

## WebSockets, gateways and bots

- **Reconnect**: backoff with jitter and a cap; reset the backoff only after a connection has stayed up, not at the first byte.
- **Resume**: where the protocol has a session id and sequence number, resume and replay; where it does not, re-fetch state after reconnecting. Either way handlers tolerate a repeated event.
- **Heartbeat**: send on the interval the server names; if an acknowledgement is missed, close and reconnect. Without one, a half-open connection looks alive forever.
- **Scaling out**: a connection lives on one instance; a message for a user on another instance goes through a shared channel (a pub/sub, a queue). Sticky sessions keep a client on its instance but do not replace that.
- **Backpressure**: a slow client's send buffer grows without bound unless it is capped; past the cap, drop or disconnect.
- **Chat-platform bots**: acknowledge an interaction inside the platform's window, then follow up; read rate-limit headers per route and wait as told; split long output at the platform's message limit; ask only for the permissions and gateway intents the bot uses. The limits and windows are the platform's and change: read its current docs.
- A bot's token is a full login. It is never logged, never committed, and is rotated on any doubt.
- Sending a message as a real bot to a real server or channel is an outward step under core rule 2 unless the user named it; test in the project's own test server or a dry run first.

## Configuration and secrets

- One module reads the environment, validates it into a typed object at start, and is the only place the rest of the code gets config from.
- Defaults are safe for production or absent; a debug flag that defaults on will reach production.
- Secrets reach the process through the environment or a mounted file from the platform's secret store; `.env` files stay out of the repository and out of images.
- Config that differs per environment is named in one place the reader can find (`.env.example`, the schema), with no real values.

## Observability

- A request id is made at the edge (or taken from the caller), put in every log line and passed on every outbound call and job.
- Log the event and its fields, not a sentence built from them; levels mean something (`error` is a thing a person must look at).
- The four numbers worth having per endpoint and per job: rate, errors, duration (as percentiles, not an average), and saturation (queue depth, pool in use).

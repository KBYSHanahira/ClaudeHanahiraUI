---
name: "hanahira-claude-ui-backend"
description: Hanahira Claude UI companion for server-side code — services, background jobs, queues, concurrency, caching, WebSockets, bots, config, shutdown. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Backend

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Assume every step runs twice, runs late, or stops halfway — and see the change working in the running process.** A request is retried, a job is redelivered, two workers pick the same row, the process is killed between two writes. Code that is right only when each step runs exactly once, in order, is wrong. Passing tests is not running: a change is done when the real process, started the way the project starts it, is seen doing it.

## What saves the most time

- **The entry point and one sibling handler first.** The manifest (`package.json`, `pyproject.toml`, `go.mod`, …) and its lock file give the runtime, framework and versions; one existing handler or job gives the layering, the error style, the logging and how the database is reached. Match them.
- **The first error, whole,** from the process's own log, with its stack. A 500 seen by the client is the last link, not the cause.
- **How the project runs it**: its own start script, env file and compose file, not a command from memory. Which process serves requests and which runs jobs are often two different commands.
- **One real request** (`curl -i`, or the project's client) against the running service before and after the change: a read, or a local or test instance; one that writes, charges or sends on a real system is asked first unless the user named it (core rule 2).

## Requests and errors

- Validate input at the edge, once, into a typed shape; inner code trusts it. Never trust a client-sent id for ownership: check it against the signed-in user.
- One place turns errors into responses. Handlers throw or return; they do not each format their own 500. An unexpected error is logged with its stack and a request id, and answered without internals.
- Every outbound call (HTTP, database, cache, queue) has a timeout, and the caller knows what it does when the time runs out. No timeout means one slow dependency holds every worker.
- Everything that queues in memory has a cap, and past it the service refuses (429/503) rather than growing until it is killed.
- A handler that does slow work answers first and hands the work to a job; the client polls or is told.

## State and concurrency

- State kept in process memory (a map, a counter, a session) is lost on restart and differs between instances. Anything that must survive or be shared lives in the database, the cache or the queue.
- Read-then-write on shared data is a race: use one atomic statement (`UPDATE … SET n = n + 1`, `INSERT … ON CONFLICT`), a unique constraint, or a row lock inside a transaction. A check in application code is not a constraint.
- Two writes that must both happen go in one transaction, or the second is made retryable from a record of the first. A write followed by "then publish an event" loses the event on a crash between them.
- Never hold a database transaction open across a network call.
- Never block the event loop or the async runtime with CPU work or a synchronous call; details per runtime in `references/runtimes.md`.

## Jobs and queues

- A job is delivered at least once: make it idempotent (a key, a state check, an upsert), so a second run changes nothing.
- A job carries ids, not data: it reads the current row when it runs, and does nothing if the row has moved on.
- Enqueue after the commit (or through the outbox): a job that starts before the transaction commits does not find its row.
- Retries are bounded, with backoff; what still fails goes somewhere it will be seen (a dead-letter queue, a failed table), never dropped and never retried forever.
- A scheduled job that can overlap its own next run takes a lock, or is written to be safe when two run.

## Long-lived connections and bots

- A WebSocket, gateway or stream will drop: reconnect with backoff, resume where the protocol allows, and expect events twice or out of order. Heartbeat, and close a silent connection.
- Answer the platform within its deadline, then do the work; follow its rate limits per route.

## Caching

- A cache needs its invalidation rule before it is added, keys that include everything the value depends on (user, tenant, locale, version), and a plan for many misses at once.

## Starting and stopping

- Config is read and checked once at start; a missing or malformed value stops the process then, with its name, not at the first request that needs it.
- On SIGTERM: stop taking new work, finish or hand back what is in flight within the platform's grace time, close connections, exit. A job cut off mid-way must be safe to run again.
- A health check says what a caller needs: "alive" is not "ready to serve"; readiness fails while a required dependency is unreachable.
- Logs carry a request or job id; never a secret.

## Working with tools and other skills

- Pair up: `hanahira-claude-ui-api` for the contract, status codes and calls to third parties; `hanahira-claude-ui-data` for queries, transactions and migrations; `hanahira-claude-ui-security` for auth, sessions and secrets; `hanahira-claude-ui-perf` for a slow endpoint or a memory leak; `hanahira-claude-ui-debug-test` for a bug with no plain cause or a flaky test; `hanahira-claude-ui-devops` for the container, the deploy and its logs; `hanahira-claude-ui-automation` for a job run by cron or a timer rather than a queue; `hanahira-claude-ui-frontend` for the client that calls it; `hanahira-claude-ui-ai` when the service calls a model.
- Use the session's tools on the real system: the database connector for the row, a log connector for the failing request, `curl` for the endpoint.
- Helpers follow `references/agents.md` in the core. A write to a real database, a restart of a live service and a message sent as a real bot are never a helper's.

Queues, outbox, locks, cache patterns, shutdown and bot gateways in detail: `references/services.md`. Traps in Node, Python, Go and the JVM: `references/runtimes.md`. Open one only when about to rely on a detail I am not sure of.

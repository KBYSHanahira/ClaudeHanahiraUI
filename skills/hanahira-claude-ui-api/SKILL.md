---
name: "hanahira-claude-ui-api"
description: Hanahira Claude UI companion for APIs — designing REST and GraphQL, calling third-party APIs, SDKs and webhooks, retries, rate limits, OpenAPI. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — API

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**The contract is read, not assumed.** Field names, status codes, limits and error shapes come from the real docs, the OpenAPI file, the SDK source and a real response — never from memory or what an API like it would do. Never invent an endpoint, parameter or header; when it cannot be found, say so.

## What saves the most time

- **Call the real endpoint first** with `curl -i`: a read, or the sandbox. A call that writes, charges, sends or deletes is asked first unless the user named it (see below). Read the whole response, headers included, before writing code against it. Pass the key from an env var (`-H "Authorization: Bearer $API_KEY"`) and redact `Authorization` and cookies from any output before quoting it.
- **Auth and base URL before logic.** A 401, 403 or 404 is most often the wrong key, scope, environment or path prefix, not a bug in the code.
- **Log the request id** the server returns (`X-Request-Id` or the provider's own); it is what support and the provider's logs answer to.
- **Read the rate-limit headers** (`RateLimit-*`, `X-RateLimit-*`, `Retry-After`) on the first response, not after the first 429.
- **Pin the SDK version** and read its changelog; behaviour changes between minor versions more often than the docs admit.

## Designing an API

- Resources are nouns (`/orders/{id}/items`); the method carries the verb. GET is safe, PUT and DELETE are idempotent, POST is neither.
- Status codes say what happened: 201 with `Location` on create, 204 for no body, 400 malformed, 401 unauthenticated, 403 forbidden, 404 absent, 409 conflict, 422 invalid, 429 throttled, 5xx only for server faults.
- One error shape everywhere, such as RFC 9457 `application/problem+json`, with a stable machine-readable code and no stack traces.
- Paginate every list from the start; prefer an opaque cursor over offset for large or changing data.
- Accept an `Idempotency-Key` on POSTs that create or charge, and return the stored result on a repeat.
- Version deliberately (path or header) and change compatibly: add optional fields, never rename, retype or remove one without a new version and a deprecation window.
- Validate at the edge against the schema and reject unknown or malformed input with a clear 400 or 422.

## Calling other APIs

- Every call has a connect and a read timeout. A default of none hangs a worker forever.
- Retry only what is safe: idempotent methods or a request with an idempotency key, and only on network errors, 408, 429, 500, 502, 503 and 504 (not 501 or other 5xx that will fail the same way again). Use exponential backoff with jitter and a cap.
- On 429 or 503, honour `Retry-After`. Throttle on the client side before the provider does it for you.
- Stop calling a dependency that keeps failing (a circuit breaker) and degrade, instead of piling retries on it.
- Webhooks: verify the signature over the raw body, store the event, then answer 2xx fast and process it from a queue; dedupe by event id because delivery is at least once and out of order.

## Working with tools and other skills

- Pair up when the task crosses fields: `hanahira-claude-ui-security` for auth, tokens, CORS and secrets, `hanahira-claude-ui-data` for how the payload is stored, `hanahira-claude-ui-debug-test` for an integration that fails and must be reproduced, `hanahira-claude-ui-ai` when the API is a model's, `hanahira-claude-ui-frontend` for the client that calls it, `hanahira-claude-ui-perf` for a slow endpoint.
- Calling a real third-party endpoint that writes, charges, sends or deletes is an outward step under the core's rule 2; use a sandbox or test mode first.
- Helpers that read docs or probe endpoints follow `references/agents.md` in the core. The contract stays with me; a call to a real endpoint that writes is never a helper's.

Designing an API in depth (status table, errors, pagination, versioning, idempotency, OpenAPI, GraphQL): `references/design.md`. Calling third-party APIs (auth flows, retries, rate limits, webhooks, SDKs, testing, debugging): `references/integrations.md`. Open them only when the lines above do not settle the question.

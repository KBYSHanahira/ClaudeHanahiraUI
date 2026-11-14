# API design

A look-up for designing or changing an HTTP API: what to call things, what each method and status means, how errors, lists and versions behave, and how the contract is kept honest. Consistency inside one API matters more than any single rule here; follow the house style where one exists.

## Resources

- Model the domain as nouns: `/customers`, `/customers/{id}`, `/customers/{id}/orders`. Plural collections, stable ids, no verbs in paths.
- Nest only one level for ownership; beyond that, link by id (`/orders?customer_id=...`).
- An action that is not CRUD becomes a sub-resource or a state change (`POST /orders/{id}/cancellation`, or `PATCH` with `status`), not `/cancelOrder`.
- Pick one casing for JSON fields and keep it. Use ISO 8601 UTC timestamps, string ids, and integer minor units or decimal strings for money.

## Methods and status codes

| Method | Safe | Idempotent | Typical success |
|---|---|---|---|
| GET | yes | yes | 200 |
| POST (create) | no | no (yes with a key) | 201 + `Location` |
| PUT (replace) | no | yes | 200 or 204 |
| PATCH (partial) | no | not by default | 200 or 204 |
| DELETE | no | yes | 204 (repeat: 204 or 404) |

- 400 malformed syntax · 401 no or bad credentials (send `WWW-Authenticate`) · 403 authenticated but not allowed · 404 absent or hidden · 405 method not allowed · 409 state conflict or duplicate · 412 precondition failed (`If-Match`) · 415 wrong content type · 422 well-formed but invalid · 429 rate limited (send `Retry-After`).
- 500 unexpected fault · 502 bad upstream response · 503 overloaded or down (send `Retry-After`) · 504 upstream timeout. Never return 200 with an error in the body.
- 202 Accepted for work done later; return a status resource to poll.

## Errors

- Use RFC 9457 `application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, plus extensions such as `errors: [{field, code, message}]` for validation.
- Give each error a stable machine-readable code; clients branch on it, not on the message text.
- Never leak stack traces, SQL or internal hostnames. Include the request id so a report can be traced.

## Lists: pagination, filtering, sorting

- **Offset** (`?limit=50&offset=100`): simple, allows jumping to a page, but slow on deep pages and skips or repeats rows when data changes underneath.
- **Cursor** (`?limit=50&after=<opaque>`): stable under inserts and fast at any depth via a keyset (`WHERE (created_at, id) > (:t, :id)`). Return `next_cursor`, null at the end. Prefer it for large or live data.
- Always cap `limit` with a server maximum, and make the default order deterministic with a unique tiebreaker.
- Filter with plain query parameters (`?status=open&created_after=...`); allow sorting only on indexed fields (`?sort=-created_at`).
- A total count is expensive on large tables; offer it only when needed.

## Versioning and deprecation

- Strategies: path (`/v1/`), header (`Accept: application/vnd.x.v2+json` or a custom version header), or dated versions pinned per client. Path is the easiest to see and route.
- Compatible changes need no new version: a new endpoint, a new optional field or parameter, a new enum value only if clients were told to tolerate unknowns.
- Breaking changes need one: removing or renaming a field, changing a type or meaning, making something required, changing defaults or error codes.
- Deprecate with notice: the `Deprecation` and `Sunset` headers, a changelog entry, usage metrics on the old version, and a date before removal.

## Idempotency keys

- The client sends `Idempotency-Key: <uuid>` on a POST that creates or charges. The server stores key, request hash and response.
- A repeat with the same key and body returns the stored response; the same key with a different body returns 422 or 409; a repeat while the first is still running returns 409.
- Store the key in the same transaction as the effect, expire keys after a set window (often 24 hours), and scope them per client.

## Contract first

- Write or generate the OpenAPI document as the source of truth; validate requests and responses against it in middleware or tests.
- Lint it (Spectral or similar) and diff it in CI to catch breaking changes (`oasdiff` or similar).
- Contract tests prove both sides agree: provider tests run the spec's examples against the real service; consumer-driven tests (Pact) record what each client relies on.
- Keep examples in the spec real; generated clients and docs are only as good as they are.

## GraphQL specifics

- Errors come back with HTTP 200 in an `errors` array; clients must read it. Use typed error unions for expected business failures.
- Resolvers per field cause N+1 queries; batch them per request with a DataLoader.
- Limit query depth and cost (complexity scoring), set a timeout, and disable introspection in production if the schema is not public.
- Paginate with connections (`first`, `after`, `pageInfo`). Evolve by adding fields and marking old ones `@deprecated`; there is no versioning.
- Authorise in the resolvers or the business layer, not only at the gateway; every field is an entry point.

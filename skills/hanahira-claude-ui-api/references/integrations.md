# Integrations

A look-up for calling someone else's API: reading its contract, authenticating, surviving its failures and limits, receiving its webhooks, and testing and debugging the connection. The provider's own docs override anything general here.

## Reading third-party docs

- Find the API reference, the OpenAPI file if published, the changelog and the status page. Note the API version the docs describe and the one the account is pinned to.
- Read the auth section, the error format, the rate limits and the pagination style before any endpoint.
- Check which environment a key belongs to (sandbox or live) and the base URL for each.
- When docs and a real response disagree, the response wins; record the difference in a comment.
- In an SDK, the source and its type definitions are the truest docs; read the method, not only the README.

## Auth flows in practice

- **API key**: sent in a header (`Authorization: Bearer ...` or a named header), never in the URL, where it ends up in logs. One key per environment and service, scoped as narrowly as the provider allows.
- **OAuth2 client credentials**: machine to machine, no user. Exchange client id and secret for an access token, cache it until shortly before `expires_in`, refresh on 401 once, not in a loop.
- **OAuth2 authorization code + PKCE**: acting for a user. Redirect with `state` and a `code_challenge`, verify `state` on return, exchange the code with the `code_verifier`, store the refresh token encrypted. Use PKCE for public and confidential clients alike; the implicit flow is obsolete.
- Request the smallest scopes that work. Handle a revoked or expired refresh token by asking the user to reconnect.
- Secrets come from the environment or a secret manager, never the repository.

## Timeouts, retries, backoff

Every call: a connect timeout (a few seconds) and a read timeout sized to the endpoint, plus an overall deadline. Retry shape:

```
for attempt in 0..max_attempts-1:
    response = call(timeout=t, idempotency_key=key)     # same key every attempt
    if success: return response
    if not retryable(response) or attempt is last: raise
    if retry_after(response): sleep(retry_after(response))   # honour it exactly
    else: sleep(random(0, min(cap, base * 2**attempt)))      # full jitter
```

- Retryable: connection errors, timeouts, 408, 429, 500, 502, 503, 504. Not retryable: other 4xx, which will fail the same way again.
- Retry a non-idempotent POST only with an idempotency key the provider honours.
- Keep the total retry time inside the caller's own deadline; nested retries in each layer multiply.
- Use a circuit breaker for a dependency that is failing: open after a run of failures, fail fast, probe again after a pause.

## Rate limits

- Read the limit, the remaining count and the reset from the headers; know whether the limit is per key, per user, per IP or per endpoint.
- Throttle on the client side with a token bucket or a queue sized to the limit, shared across workers (for example through Redis).
- On 429, wait for `Retry-After` and slow the whole client, not just that request.
- Batch endpoints and webhooks replace polling and save most of the budget.

## Webhooks

- **Verify the signature** with the provider's scheme (usually HMAC-SHA256 over the raw body and a timestamp) using a constant-time comparison. Verify before parsing; a re-serialised body will not match.
- **Replay protection**: reject a timestamp older than a few minutes, and store processed event ids.
- **Respond fast**: return 2xx within the provider's timeout after persisting the event; do the work in a queue.
- **At least once, any order**: dedupe by event id, make handlers idempotent, and do not assume `created` arrives before `updated`. When order matters, compare a version or timestamp, or fetch the current object from the API.
- Provide a way to replay missed events (the provider's resend, or a reconciliation job that lists recent changes).

## SDK or raw HTTP

- Prefer the official SDK when it is maintained: it handles auth, retries, pagination and types. Pin its version and read its retry and timeout defaults.
- Use raw HTTP when the SDK is stale, heavy or hides the error detail you need, or when only a couple of endpoints are used.
- Either way, wrap the provider behind one small module in the codebase so the rest of the code does not depend on its shapes.

## Testing

- Unit tests use recorded real responses (VCR, Polly, `responses`, nock) or a mock server (WireMock, Prism from the OpenAPI file). Scrub secrets and personal data from recordings.
- Record the error cases too: 401, 404, 422, 429 with `Retry-After`, a timeout, a malformed body.
- Run a small set of tests against the provider's sandbox on a schedule to catch contract drift that recordings cannot.
- Test webhook handlers with the provider's signed sample payloads or its CLI forwarder.

## Debugging

- Reproduce with `curl -v` (or `-i` for the response headers with the body, without the connection detail; `-I` sends a HEAD request, so it cannot reproduce a POST): it shows the resolved host, TLS handshake, sent headers and the full response. Copy the exact request the code sends, including content type. Pass the key from an env var (`-H "Authorization: Bearer $API_KEY"`) and redact `Authorization` and cookies from any output before quoting it.
- Compare a working request with the failing one field by field: base URL, path, method, headers, body encoding, auth scheme.
- Log method, URL without secrets, status, duration and the provider's request id on every call; quote the request id to the provider's support.
- Check the provider's status page and changelog before suspecting the code.

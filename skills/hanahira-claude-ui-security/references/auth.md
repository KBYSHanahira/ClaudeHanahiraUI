# Authentication and sessions

A look-up for when designing or reviewing login, sessions, tokens, password reset, OAuth or API authentication. The first rule: **use the framework's or a well-maintained library's implementation.** Hand-written authentication fails in ways that are invisible until exploited. This page is for configuring such tools correctly and for reviewing what exists.

Authentication answers "who is this?". Authorisation answers "may they do this?". Most real breaches are failures of the second.

## Passwords

- **Storage**: Argon2id (preferred), bcrypt or scrypt, with a per-user salt (the libraries do this) and a work factor tuned so one hash takes roughly a tenth to half a second on the production hardware. Never MD5, SHA-1 or SHA-256 alone; never encryption.
- bcrypt truncates input at 72 bytes; know how the library handles longer passwords.
- **Policy**: a minimum length (12 or more), a generous maximum (64+), all characters allowed including spaces and Unicode, paste allowed (password managers need it). Check new passwords against known-breached lists. No forced periodic change and no composition rules — they produce weaker passwords.
- **Compare in constant time**; the library's verify function does.
- Raise the work factor over time: re-hash at the next successful login.

## Login

- The same response, and about the same timing, whether the account exists or not: "email or password is incorrect".
- **Throttle**: per account and per source address, with growing delays; lock temporarily rather than permanently, so lockout is not a way to deny service to a user.
- **Multi-factor**: offer it; require it for administrators. Passkeys (WebAuthn) and authenticator apps (TOTP) over SMS. Recovery codes are shown once and stored hashed.
- A new session identifier is issued at login (prevents session fixation), and again when privileges change.
- Notify the user of a new device login, a password change and an MFA change.

## Sessions

Server-side sessions with a random identifier in a cookie are the simplest thing that is correct, and the right default for a web application.

- **The identifier**: at least 128 bits from a cryptographic generator. It is a credential: never in a URL, never logged.
- **The cookie**: `Secure; HttpOnly; SameSite=Lax` (or `Strict`); `Path=/`; a `__Host-` name prefix and no `Domain` attribute. If subdomains truly must share the cookie, set `Domain` and use the `__Secure-` prefix instead — browsers reject a `__Host-` cookie that carries `Domain`.
- **Lifetime**: an idle time-out and an absolute one, chosen by how sensitive the application is.
- **Logout destroys the session on the server**, not only the cookie. A password change ends the user's other sessions.
- **CSRF**: `SameSite` cookies cover most cases; add a CSRF token for state-changing requests anyway, and never change state on `GET`.

## JWTs and other self-contained tokens

Use them where a stateless token is really needed (between services, short-lived API access) — not as a substitute for sessions.

- **Verify, every time**: the signature, with the algorithm fixed by the server (never taken from the token; reject `none`); `exp`; `iss`; `aud`.
- **Short lifetime** (minutes), because a stateless token cannot be revoked. Pair with a refresh token that is stored server-side, rotated on every use, and revoked if a used one appears again.
- **Nothing secret in the payload** — it is encoded, not encrypted.
- **In a browser**, keep tokens in `HttpOnly` cookies, not in `localStorage`, where any script injection can read them.
- Sign with an asymmetric key (EdDSA, ES256, RS256) when other parties verify; rotate keys, identified by `kid`.

## Password reset and email verification

This flow is a second way to log in and deserves the same care.

- The token is random (128+ bits), **single use**, short-lived (an hour or less), stored hashed, and tied to one account.
- The response is the same whether or not the address exists: "if an account exists, a link has been sent".
- Build the link from a configured base URL, never from the request's `Host` header.
- Using a reset token ends existing sessions and tells the user.
- Changing the email or the password requires the current password or a fresh login.

## Authorisation

- **Checked on the server, on every request, for the specific object.** `GET /invoices/1042` must confirm that invoice 1042 belongs to the caller — not merely that the caller is logged in. This flaw (broken object-level authorisation, IDOR) is the most common serious one.
- **Deny by default**: a route without an explicit rule is refused.
- **One place for the rules** (a policy layer or middleware), not scattered `if` statements that the next endpoint forgets.
- **Never trust the client's claim** about who it is or what role it has: user IDs, roles and prices come from the session and the database, not from the request body or a hidden field.
- Scope queries by the owner or the tenant at the data layer (`WHERE tenant_id = :t`), so a missed check returns nothing instead of someone else's data.
- Test it: as user A, request user B's objects; as a normal user, call admin endpoints; with no login, call everything.

## OAuth 2.0 and OpenID Connect

- **Authorization Code flow with PKCE**, for every kind of client. Not the implicit flow; not the password grant.
- `state` is random, bound to the user's session, and checked on return.
- `redirect_uri` values are registered exactly; no wildcards.
- With OpenID Connect, **validate the ID token** (signature against the provider's keys, `iss`, `aud`, `exp`, `nonce`) and identify the user by the provider's stable `sub`, not by email — and trust an email only when `email_verified` is true.
- Request the fewest scopes. Store the provider's tokens encrypted, server-side.
- The client secret lives only on a server. A browser or mobile app is a public client and has no secret.

## API keys and service credentials

- Generated randomly, shown once, stored hashed (keep a short prefix in clear to identify the key).
- Scoped to what is needed, tied to an owner, with an expiry and a way to rotate without downtime (two valid keys during the change-over).
- Sent in a header, never in a URL — URLs end up in logs, histories and referrers.
- Between services, prefer short-lived credentials issued by the platform (workload identity, mTLS) over long-lived shared secrets.
- Webhooks are verified by signature over the raw body, with a timestamp to reject replays.

## Reviewing an existing system

Walk each of these and try to break it:

1. Where are passwords hashed, and with what?
2. What is in the session cookie, and what are its flags?
3. Pick five endpoints that take an ID. Does each check ownership?
4. What does the reset flow accept, and can a token be reused or guessed?
5. What happens on logout and on password change to existing sessions and tokens?
6. Which endpoints are unthrottled?
7. What do error messages reveal?
8. Where do secrets and signing keys live, and who can read them?

Report by what an attacker could do with each finding, most serious first.

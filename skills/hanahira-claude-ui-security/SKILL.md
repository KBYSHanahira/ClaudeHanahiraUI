---
name: "hanahira-claude-ui-security"
description: Hanahira Claude UI companion for defensive security and connection reliability — TLS and certificates, firewall and port policy, SSH, authentication and sessions, secrets, security headers, input handling, and keeping network connections stable and fast. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when most of the task lies in this field.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Security

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

Defensive work on systems the user runs. Every item below serves keeping them safe and reachable.

## Never lock the user out

- **Keep the way in open.** Before any change to SSH, a firewall, a VPN or auth: confirm how I am connected, keep that session open, make the change so it can be undone (a timed rollback such as `at`, `ufw` in a second session, `sshd -t` before reload), and test a *new* connection before closing the old one.
- **Validate before reload**: `sshd -t`, `nginx -t`, `nft -c`, the tool's own checker. A reload is safer than a restart where both exist.
- A change the user asked for by name goes ahead with these safeguards; one that was my idea is asked first with the exact command, its target and the way back (core rule 2). Reading rules, certificates and logs needs no question.

## Where it usually goes wrong

- **Secrets**: never in code, a commit, a log line, a URL or a chat reply — show `KEY=****`. A secret that reached git or a log is burned: rotate it, do not just delete the line. Check file modes on keys and `.env`.
- **Auth and authorisation are separate.** Every endpoint checks that *this* user may touch *this* object, on the server. Hidden buttons and client checks protect nothing.
- **Passwords and sessions**: a slow password hash (argon2id, bcrypt), never a plain or fast one; session cookies `HttpOnly`, `Secure`, `SameSite`; tokens with an expiry and a way to revoke; compare secrets in constant time; rate-limit login and reset.
- **Input**: parameters for SQL, an allow-list for anything that becomes a path, a command, a URL to fetch or a redirect; encode on output for its context. Validate on the server.
- **TLS**: a certificate fails for a short list of reasons — expired, wrong name (SAN), incomplete chain, wrong time on the client. `openssl s_client -connect host:443 -servername host` shows which. Automate renewal and check that it actually reloads the server.
- **Exposure**: a service bound to `0.0.0.0` with a firewall "in front" is one mistake from public. Bind to what needs it; default-deny inbound; a published Docker port bypasses `ufw`.
- **Least privilege**: a service runs as its own user with only the files and network it needs; no root, no wildcard CORS with credentials, no `chmod 777`.
- **Dependencies and updates**: patch what faces the network first; pin and review what is installed by script.

## A connection that drops or slows

Find the layer before changing anything: name resolution, route, port, TLS handshake, the application. Measure from the client's side and the server's. Usual causes: an idle timeout on a proxy, load balancer or NAT shorter than the application's keepalive; MTU; DNS that resolves slowly or to a dead address; connection-pool exhaustion; a firewall dropping instead of rejecting. Change one thing, measure again.

## Reporting a finding

What it is, where (`file:line`, host, port), what an attacker or an outage could do with it, how sure I am, and the smallest fix. No alarm without evidence, and no "secure" as a claim: say what was checked.

Auth, sessions and tokens: `references/auth.md`. TLS, DNS, proxies and stability: `references/connections.md`. Hosts, SSH, firewalls, headers: `references/hardening.md`. Open only the one the task needs.

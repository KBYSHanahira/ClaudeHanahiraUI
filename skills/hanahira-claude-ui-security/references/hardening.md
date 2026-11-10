# Hardening reference

Concrete settings. Read the current state first, change one thing at a time asking first as the core's rule 2 says, and check the tool's documentation for the version installed — defaults and directive names change between releases.

## TLS on a web server

- Protocols: TLS 1.2 and 1.3. Nothing older.
- Ciphers: for TLS 1.2, forward-secret AEAD suites (ECDHE with AES-GCM or ChaCha20-Poly1305). Take the list for the server's version from Mozilla's SSL Configuration Generator, "intermediate" profile, rather than writing it by hand.
- Serve the full chain (leaf plus intermediates), not the leaf alone.
- Redirect port 80 to 443. Add HSTS only once HTTPS works for every subdomain it would cover — it cannot easily be taken back.
- Enable OCSP stapling where the certificate authority supports it; HTTP/2 or HTTP/3.

nginx, as a shape:

```nginx
server {
    listen 443 ssl;
    http2 on;                     # 1.25.1+; older: "listen 443 ssl http2;"
    server_name example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:TLS:10m;
    ssl_session_tickets off;
}
server { listen 80; server_name example.com; return 301 https://$host$request_uri; }
```

Check: `nginx -t` before reload. From a client:

```
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
curl -sI https://example.com | head -20
```

Certificate problems, by message: *expired* → renew, and check the server's clock; *hostname mismatch* → the name is not in the certificate's SAN list; *unable to get local issuer* → the server does not send the intermediate, or the client lacks the root; *self-signed* → wrong certificate is being served, often a default virtual host.

## Security headers

| Header | Value to start from | Notes |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Only when all covered hosts serve HTTPS. Start with a short `max-age` |
| `Content-Security-Policy` | `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` | The strongest defence against XSS. Roll out as `Content-Security-Policy-Report-Only` first and read the reports. Avoid `'unsafe-inline'` for scripts; use nonces or hashes |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | List only what the site does not use |
| `X-Frame-Options` | `DENY` | Superseded by CSP `frame-ancestors`; keep for old browsers |
| `Cross-Origin-Opener-Policy` | `same-origin` | Where the site does not rely on cross-origin popups |

Cookies: `Secure; HttpOnly; SameSite=Lax` (or `Strict`); a `__Host-` prefix for session cookies. CORS: an explicit list of allowed origins; never reflect the request's origin together with `Access-Control-Allow-Credentials: true`. Remove headers that advertise versions (`Server`, `X-Powered-By`).

## SSH

In `/etc/ssh/sshd_config` (or a file under `sshd_config.d/`), after confirming key login already works for the account in use:

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers <accounts that must log in>   # placeholder: must include the account in use, or it is locked out; or AllowGroups
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
```

`sshd -t` validates; `sshd -T | grep -i -E 'permitroot|passwordauth|pubkey'` shows what is in effect, including overrides from included files. Reload, then prove a **new** session works before closing the old one. Use Ed25519 keys with a passphrase; one key per person and device; remove keys of people who left. Changing the port only reduces log noise; it is not a control. Rate-limit or ban repeated failures (`fail2ban`, or firewall rate limits).

## Firewalls

Read before changing: `ufw status verbose` · `nft list ruleset` · `iptables -S` · `firewall-cmd --list-all` · `Get-NetFirewallRule -Enabled True` (Windows) · `pfctl -sr` (macOS, BSD). Know which tool manages the rules on this host; mixing two leaves rules that fight.

The order that avoids lockout, in `ufw` terms:

```
ufw allow from <admin-ip> to any port 22 proto tcp    # the admin path first
ufw default deny incoming
ufw default allow outgoing
ufw allow 80,443/tcp
ufw enable                                            # only now
ufw status numbered
```

- Rules are evaluated in order; a broad allow above a narrow deny wins.
- IPv6 has its own rules. A host reachable over IPv6 with only IPv4 rules is open.
- **Docker** writes its own `iptables` rules and publishes ports ahead of `ufw`. Publish to localhost (`-p 127.0.0.1:5432:5432`) for anything not meant to be public, or filter in the `DOCKER-USER` chain.
- Cloud security groups sit in front of the host firewall; both must allow, and either can expose.
- Rules must survive a reboot: confirm persistence, then check from an outside machine (`nmap -Pn <host>` against one's own host).

## Files, users and processes

- Services run as their own unprivileged user, never root; a process that needs a low port gets that one capability, not root.
- Secrets and keys: owned by the service user, mode `600`; their directory `700`. Private keys are never world-readable. Find loose ones: `find /etc /opt /srv -xdev -type f -perm -o+r -name '*.key'`.
- No world-writable files in application directories; uploads are stored outside the web root and never executed.
- `sudo` rules name specific commands. `NOPASSWD: ALL` is root without a password.
- Apply security updates on a schedule (unattended upgrades for the OS), and know which services need a restart afterwards.
- Remove what is not used: packages, services, accounts, open ports. Everything running is something to defend.

## Containers

- A non-root `USER` in the image; a read-only root filesystem where possible; drop capabilities (`--cap-drop ALL`, add back only what is needed); `no-new-privileges`.
- Never mount the Docker socket into a container unless that container is meant to control the host — it is root on the host.
- Pin base images by version or digest; rebuild regularly to pick up fixes; scan images.
- Secrets at run time (secret mounts, environment from a manager), never baked into layers — every layer is readable by anyone with the image.
- Publish only the ports that must be reachable, bound to the narrowest address.

## Logging

Log authentication successes and failures, permission denials, admin actions and configuration changes, with time, source and account — and never passwords, tokens, full card numbers or session IDs. Send logs off the host, so that an intruder cannot erase them, and look at them: an alert nobody reads protects nothing.

## Backups, as a security control

Backups defend against ransomware and destructive mistakes only if they are separate from the system they protect (another account, offline or immutable), encrypted, and restorable — tested by restoring.

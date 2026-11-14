# DNS, proxies and VPNs

A look-up of working recipes. Adapt names and ranges; check each change with the command beside it before calling it done.

## DNS records

```
example.com.        300 IN A     203.0.113.10
example.com.        300 IN AAAA  2001:db8::10
www.example.com.    300 IN CNAME example.com.
example.com.        300 IN MX 10 mail.example.com.
example.com.        300 IN TXT   "v=spf1 mx include:_spf.provider.net -all"
sel1._domainkey     300 IN TXT   "v=DKIM1; k=rsa; p=MIIB..."
_dmarc.example.com. 300 IN TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
example.com.        300 IN CAA 0 issue "letsencrypt.org"
```

- A CNAME cannot sit at the apex or beside other records; use the provider's ALIAS/ANAME or flattening, or plain A/AAAA.
- One SPF record per name, at most 10 DNS lookups; start DMARC at `p=none` and read the reports first.
- CAA blocks every CA not listed; add it before the next renewal, not after.
- Verify: `dig +short TXT _dmarc.example.com @1.1.1.1` and against the authoritative server.

## nginx reverse proxy

```
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
}
```

- `$connection_upgrade` needs a `map $http_upgrade $connection_upgrade { default upgrade; '' close; }` in `http {}`.
- `nginx -t && systemctl reload nginx`; a reload keeps live connections, a restart drops them.

## HAProxy

```
defaults
    mode http
    timeout connect 5s
    timeout client  60s
    timeout server  60s
    option forwardfor
backend app
    option httpchk GET /healthz
    http-check expect status 200
    server a1 10.0.1.11:3000 check inter 5s fall 3 rise 2
    server a2 10.0.1.12:3000 check inter 5s fall 3 rise 2
```

- Websockets also need `timeout tunnel 1h`. Check with `haproxy -c -f /etc/haproxy/haproxy.cfg`.

## Load-balancer health checks

- Point checks at a path that answers fast and fails when the app cannot serve; never at `/` behind a login.
- Allow the LB's source ranges in the backend's firewall or security group, or every target shows unhealthy.
- Keep the LB idle timeout above the slowest request and below the backend's keepalive timeout.

## WireGuard

```
[Interface]
Address = 10.8.0.2/24
PrivateKey = <client-private>
MTU = 1420

[Peer]
PublicKey = <server-public>
Endpoint = vpn.example.com:51820
AllowedIPs = 10.8.0.0/24, 10.20.0.0/16
PersistentKeepalive = 25
```

- `wg show`: no `latest handshake` means keys, endpoint or UDP port blocked; a handshake with no traffic means `AllowedIPs` or routes.
- On the server, enable `net.ipv4.ip_forward=1` and NAT or route the client range back.
- Bring changes up with `wg-quick down wg0 && wg-quick up wg0`, from a console if wg0 carries the session.

## Subnet planning

- Reserve one large private block (for example 10.0.0.0/8) and carve per site and environment: 10.<site>.<env>.0/24 or bigger.
- Avoid 192.168.0.0/24 and 192.168.1.0/24 for anything a VPN reaches; home networks use them.
- Leave room for Docker (172.17.0.0/16 default) and Kubernetes pod and service ranges; set them explicitly where they could clash.
- Check a plan with `ipcalc 10.20.0.0/20` and record it where the next person will look.

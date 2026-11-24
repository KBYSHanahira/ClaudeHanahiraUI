---
name: "hanahira-claude-ui-network"
description: Hanahira Claude UI companion for networking — DNS, routing, NAT, proxies, load balancers, VPNs, a host or port that cannot be reached. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Network

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Walk the path layer by layer from the client — name, address, route, port, TLS, application — and prove each hop with a command before blaming the next.** A route, DNS, firewall or proxy change on a live network is an outward step under the core's rule 2, and it can cut off the very session making it: keep a way back (console, a timed revert) before applying it.

## What saves the most time

- **Ask the right resolver.** `dig @server name` against the authoritative server and against the client's resolver; read the TTL and what was cached.
- **Skip DNS to test the host.** `curl -v --resolve host:443:10.0.0.5 https://host/` isolates name from service.
- **Who listens on what.** `ss -tlnp` shows the address and process; `127.0.0.1:8080` is not reachable from outside.
- **Where packets die.** `mtr -rwc 50 host` shows the hop where loss starts and stays.
- **Test from both ends.** A capture on the server tells whether the SYN ever arrived.

## DNS

- Know the record in play: A/AAAA for addresses, CNAME for aliases (never at the apex), MX, TXT, CAA, NS, SRV.
- Propagation is TTL: lower the TTL a full old-TTL ahead of a change; negative answers are cached too (SOA minimum).
- Split horizon: inside and outside can see different answers; ask from where the client sits.
- The local path first: `/etc/hosts`, `resolv.conf`, and `resolvectl status` under systemd-resolved; `getent hosts name` shows what the system really resolves.

## Addressing and routing

- Do the CIDR math before choosing a range: a /24 holds 254 hosts, a /20 holds 4094; check for overlaps with every network it will meet.
- `ip addr` for what the host has, `ip route get 1.2.3.4` for the exact route and source it will use.
- NAT hides the source: a server sees the gateway, and inbound needs an explicit port forward.
- MTU: large packets that vanish while small ones pass mean a tunnel or PMTU black hole; test with `ping -M do -s 1472`.

## Proxies and load balancers

- Pass `X-Forwarded-For`, `X-Forwarded-Proto` and `Host`, and make the app trust them only from the proxy.
- Health checks hit a cheap endpoint that proves the dependency the app needs; a failing check drains the backend silently.
- Timeouts exist at each hop (client, LB, proxy, app); the shortest one wins and names the error.
- Websockets need `Upgrade` and `Connection` headers forwarded and a long read timeout.
- Run `nginx -t` (or `haproxy -c -f`) before every reload.

## VPNs

- WireGuard `AllowedIPs` is both the route and the source filter; a missing range means silent drops.
- Overlapping subnets on both ends break routing; renumber or NAT one side.
- Tunnels lower the MTU; set it (WireGuard 1420, less over PPPoE) and clamp MSS.

## Containers

- Bridge networks need published ports (`-p 8080:80`); host networking shares the host's stack and ports. A published port skips ufw/firewalld INPUT rules: publish only what must be public (`references/hardening.md` in `hanahira-claude-ui-security`).
- A service bound to `127.0.0.1` inside a container is unreachable from outside it; bind `0.0.0.0` inside the container and narrow at the publish (`-p 127.0.0.1:…`).
- Docker's embedded DNS (127.0.0.11) resolves service names only on user-defined networks.
- Kubernetes: Pod, then Service (check `kubectl get endpoints`), then Ingress; `kubectl port-forward svc/name 8080:80` tests one layer at a time.

## Working with tools and other skills

- Drops and slowness after connecting: load `hanahira-claude-ui-security` (its `references/connections.md`); do not repeat it here.
- Pair up: `hanahira-claude-ui-security` for TLS and firewall rules, `hanahira-claude-ui-remote` for reaching hosts, `hanahira-claude-ui-devops` for ingress manifests, `hanahira-claude-ui-windows` for the Windows side (`Test-NetConnection`, its firewall), `hanahira-claude-ui-perf` when it connects but is slow under load. Helpers follow `references/agents.md` in the core.

Layer-by-layer checks, captures and symptom table: `references/diagnosis.md`. DNS records, proxy and VPN configs, subnet planning: `references/dns-proxies-vpn.md`.

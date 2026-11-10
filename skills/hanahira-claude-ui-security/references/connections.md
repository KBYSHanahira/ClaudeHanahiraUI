# Connections that drop, stall or run slow

A look-up for when a connection works and then fails, or works slowly. (One that never connects at all is covered in the core's `references/ops.md`.) These problems are hard because the failure is rarely in the place that reports it; the method is to find the layer before touching any setting.

## 1. Describe it exactly

- **What fails**: the connect, the TLS handshake, the first byte, a transfer halfway, or an idle connection that is dead when used again?
- **After how long?** Write down the number. A failure at exactly 30, 60, 75, 120, 300 or 350 seconds is a time-out configured somewhere; find the component with that value.
- **Who and where**: every client or some? One network, one region, one path through the proxy? Wired and mobile?
- **When**: always, under load, at certain hours, after a deploy?
- **What does the error say** on the client *and* on the server at the same moment? A client "reset" with nothing in the server log means something in between did it.

## 2. Find the layer

Measure each stage from the client's side:

```
curl -o /dev/null -sS -w 'dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first-byte %{time_starttransfer}  total %{time_total}\n' https://host/path
```

Each value is measured from the start of the request, so a stage's own time is its value minus the one before it (TCP connect = `tcp` − `dns`, TLS = `tls` − `tcp`, server wait = `first-byte` − `tls`).

| The stage that takes the time | Points to |
|---|---|
| `dns` | The resolver: slow or failing DNS, a dead first nameserver, IPv6 lookups timing out |
| `tcp` (connect) | The network path, packet loss, a firewall dropping silently, a full accept queue on the server |
| `tls` | Handshake cost, a slow OCSP check, a missing intermediate being fetched, no session reuse |
| `first-byte` | The server or what it waits on: the application, the database, an upstream |
| `total` − `first-byte` | Transfer: bandwidth, loss, a slow reader, buffering in a proxy |

Then compare: the same request from another network, from the server to itself, directly to the backend bypassing the proxy, by IP address bypassing DNS, over IPv4 and IPv6 separately (`curl -4`, `curl -6`). The first comparison that changes the result names the layer.

Supporting reads: `mtr -rwc 100 host` (loss and latency per hop — loss only at a middle hop that does not continue to the end is that router deprioritising probes, not a fault); `ss -ti` (retransmits on live sockets); `dig +trace` and `dig @<resolver>`; a packet capture (`tcpdump -ni any host <ip> and port <p> -w cap.pcap`) when two sides disagree about what happened — it shows who sent the reset or stopped answering.

## 3. Causes by symptom

**Idle connections die.** Something between the two ends — a NAT gateway, a load balancer, a firewall — forgets a connection after its idle time-out and silently drops the next packet. Typical idle limits: cloud load balancers around 60 s to several minutes, NAT gateways a few minutes, home routers shorter. Fix: send keep-alives *more often* than the shortest idle limit on the path, and make each side's *idle (keep-alive)* time-out longer than that of the side in front of it, so the outer side is always the one to close.

- TCP keep-alive: Linux defaults to two hours before the first probe, which is far too long — set it per socket or via `net.ipv4.tcp_keepalive_time`.
- SSH: `ServerAliveInterval 30` and `ServerAliveCountMax 3` on the client; `ClientAliveInterval` on the server.
- WebSockets and long-lived streams: application-level ping/pong every 20–30 s.
- Database pools: validate a connection before use, and set the pool's maximum lifetime below the server's and the network's idle limits.

**Intermittent 502/504 or "connection reset" behind a proxy.** The classic race: the proxy reuses a keep-alive connection at the moment the backend closes it. Set the backend's keep-alive time-out *longer* than the proxy's (for example a load balancer at 60 s and the application server at 65 s or more). Also check the backend's connection limits and restarts.

**Fails at a round number of seconds.** A time-out. List every time-out on the path — client, CDN, load balancer, reverse proxy (`proxy_read_timeout`, `proxy_connect_timeout`), application server, database — and find the match. Raising it is right only when the work legitimately takes that long; otherwise the slow work is the bug.

**Slow at the start, fine afterwards.** Connection setup: DNS, TCP and TLS on every request. Enable keep-alive and connection reuse on the client, HTTP/2 or HTTP/3, TLS session resumption, and a connection pool to the database rather than a new connection per request.

**Slow or failing only for large transfers, small ones fine.** Suspect path MTU: a tunnel or VPN lowers the usable packet size, and a firewall that blocks ICMP hides the signal that would correct it. Test with `ping -M do -s 1472 host` (Linux; lower the size until it passes). Fix by allowing ICMP "fragmentation needed", or clamping MSS on the tunnel.

**Slow first, fast on retry; or a multi-second delay on name lookups.** DNS: a dead first resolver in `/etc/resolv.conf` (each lookup waits out its time-out), or IPv6 lookups or routes that fail before IPv4 is tried. Check each resolver directly; check whether the host has working IPv6 or only an address.

**Degrades under load.** Something is exhausted: the connection pool (requests queue for a connection), the server's worker or thread limit, file descriptors (`ulimit -n`), ephemeral ports on a client making many outbound connections (`ss -s`; reuse connections), the kernel's accept queue (`somaxconn`, and `nstat` showing listen overflows), connection-tracking table size on a firewall (`dmesg` shows "table full, dropping packet"). Find which limit is hit before raising any.

**Only some users.** A difference in their path: an ISP, a region and its CDN node, IPv6, a corporate proxy that intercepts TLS, an old client without the needed protocol, DNS that has not yet picked up a change (check the record's TTL).

## 4. Settings that make connections last

- **A time-out on everything**: connect, read, write and total, on every client and every hop. A missing time-out turns one slow dependency into a full outage as callers pile up.
- **Request time-outs get shorter going inward** (the opposite direction from idle time-outs above, and a different setting), so the layer nearest the user is the last to give up and can answer cleanly.
- **Retries** only for operations that are safe to repeat, with exponential backoff and random jitter, a small maximum, and a total budget — unbounded retries turn a slowdown into an overload.
- **Pools** sized from what the backend can serve, not as large as possible: many database connections make a database slower. Limit lifetime, validate on borrow, and time out the wait for a connection.
- **Graceful shutdown**: stop accepting, finish in-flight requests, then exit — so a deploy drops nothing. Health checks take an instance out of rotation before it stops.
- **Circuit breaking**: after repeated failures, fail fast for a while instead of waiting on each call.

## 5. Change and prove

Change one setting, at the layer the evidence points to, asking first as the core's rule 2 says. Then reproduce the original condition — hold a connection idle past the old limit, repeat the load, transfer the large file — and show the measurement before and after. A connection problem is fixed when the original failure can no longer be produced, not when a setting looks more sensible.

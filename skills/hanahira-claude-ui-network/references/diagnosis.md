# Diagnosis

A look-up for when something on the network does not answer. Walk from the client outward and stop at the first layer that fails; that is where the fix goes. Connections that work and then drop or slow down are in `hanahira-claude-ui-security`'s `references/connections.md`.

## Layer by layer

1. **Name.** `getent hosts api.example.com` shows what the system resolves (hosts file included). `dig api.example.com` shows the resolver; `dig +trace api.example.com` walks from the root and shows which server gives which answer.
2. **Address and route.** `ip route get 203.0.113.10` names the interface, gateway and source. `ping -c 3 203.0.113.10` proves reachability only where ICMP is allowed; silence is not proof of a fault.
3. **Port.** `nc -vz 203.0.113.10 443` on Linux and macOS; `Test-NetConnection 203.0.113.10 -Port 443` on Windows. On the server, `ss -tlnp | grep 443` proves something listens and on which address.
4. **TLS.** `openssl s_client -connect host:443 -servername host` shows the chain, the certificate names and the handshake error.
5. **Application.** `curl -v https://host/path` shows the request, the status and the headers; add `--resolve host:443:IP` to pin one backend.

Prove each step before moving on; a passing step clears every layer below it.

## Reading tcpdump

- Capture narrowly: `tcpdump -ni any 'host 203.0.113.10 and tcp port 443'`; save with `-w cap.pcap` for Wireshark.
- Only SYNs: `tcpdump -ni any 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and port 443'` (drop the ack test to see SYN-ACKs too).
- Only resets: `tcpdump -ni any 'tcp[tcpflags] & tcp-rst != 0'`.
- SYN out, nothing back: a firewall drops it or the route is wrong.
- SYN out, RST back: the host is reached and nothing listens, or a firewall rejects.
- SYN, SYN-ACK, then silence on large packets: MTU.
- The same sequence number sent again: a retransmit; many of them mean loss on the path.
- Capture on both ends at once: the side that never sees the packet is beyond the fault.

## Reading mtr

- Run `mtr -rwc 100 host` (add `-T -P 443` for a TCP probe through firewalls that drop ICMP).
- Loss on one middle hop that does not continue to later hops is rate-limited ICMP, not a fault.
- Loss that starts at a hop and stays to the end is real; the fault is at or after that hop.
- A jump in latency that persists marks a long link or congestion; one that recovers is noise.

## ss states

- `ss -tanp` lists every TCP socket with its process; `ss -s` sums them.
- `LISTEN` on `127.0.0.1` only: unreachable from outside.
- Many `SYN-SENT`: the remote does not answer.
- Many `SYN-RECV`: clients connect but the handshake does not finish (SYN flood, or replies lost).
- Many `TIME-WAIT`: normal after many short connections; worry only near port exhaustion.
- Many `CLOSE-WAIT`: the local app does not close sockets; a bug in the app.

## Symptom to cause

| Symptom | Usual cause | Check |
| --- | --- | --- |
| Connection refused | Nothing listening, wrong port, or a REJECT rule | `ss -tlnp` on the server |
| Timeout on connect | Firewall DROP, security group, wrong route | tcpdump on both ends |
| No route to host | No route, or host down on the local segment | `ip route get`, `ip neigh` |
| NXDOMAIN | Name absent in the zone, typo, wrong search domain | `dig @authoritative name` |
| SERVFAIL | Broken DNSSEC, unreachable authoritative server | `dig +trace`, `dig +cd` |
| Works by IP, fails by name | DNS, or a hosts entry | `getent hosts name` |
| 502 at the proxy | Backend down, refused, or wrong upstream address | proxy error log, `curl` the backend from the proxy |
| 504 at the proxy | Backend too slow for the proxy's read timeout | timings in the backend log |
| TLS name mismatch | Missing SNI, or wrong certificate served | `openssl s_client -servername` |

## After the fix

- Re-run the step that failed and the one after it; show the passing output.
- Flush what cached the fault: `resolvectl flush-caches`, browser and proxy caches, the client's connection pool.
- Test from a second network (another host, a phone off Wi-Fi) before saying it works for everyone.

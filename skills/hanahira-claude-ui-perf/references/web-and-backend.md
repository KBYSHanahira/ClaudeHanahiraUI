# Web and back-end

A look-up for the usual fixes once a measurement has named the slow part: Core Web Vitals, assets, HTTP caching and CDNs on the front; query plans, N+1, pools, async I/O and queues on the back; and load testing to prove the result. Each fix still needs its before-and-after number.

## Core Web Vitals

### LCP — Largest Contentful Paint (good: under 2.5 s)

- Find the LCP element in the Performance trace or Lighthouse; it is usually a hero image or a heading.
- Serve the HTML fast first: a slow server response (TTFB) delays everything after it.
- Do not lazy-load the LCP image; give it `fetchpriority="high"` and preload it if it is discovered late (for example a CSS background).
- Remove render-blocking CSS and scripts ahead of it.

### INP — Interaction to Next Paint (good: under 200 ms)

- Record the slow interaction and find the long task behind it.
- Break long tasks up, yield to the main thread, or move heavy work to a Web Worker.
- Avoid forced synchronous layout: reading layout (`offsetHeight`, `getBoundingClientRect`) right after writing styles in a loop.
- In frameworks, check for re-rendering far more of the tree than changed.

### CLS — Cumulative Layout Shift (good: under 0.1)

- Give images, video and embeds explicit `width` and `height` or `aspect-ratio`.
- Reserve space for ads, banners and late-loading content.
- Fonts that swap with very different metrics shift text; use `size-adjust` or a close fallback.

## Bundle, images, fonts

- Inspect the bundle with the bundler's analyzer (for example `rollup-plugin-visualizer`, `webpack-bundle-analyzer`, or `source-map-explorer`) before cutting anything.
- Split code by route and lazy-load heavy components with dynamic `import()`.
- Replace a large dependency used for one function; import only the parts used so tree-shaking can work; remove unused CSS.
- Compress text with Brotli or gzip at the server or CDN.
- Images: resize to the displayed size, serve AVIF or WebP, use `srcset` and `sizes`, lazy-load images and iframes below the fold.
- Fonts: subset to the needed characters, use WOFF2, preload only the critical face, set `font-display: swap`.

## HTTP caching and CDN

- Fingerprinted assets (hash in the file name): `Cache-Control: public, max-age=31536000, immutable`.
- HTML and API responses that change: `Cache-Control: no-cache` with an `ETag` or `Last-Modified`, so revalidation returns `304 Not Modified`.
- Private, per-user data: `Cache-Control: private` or `no-store`; never let a shared cache or CDN store it.
- `Vary` must list every request header that changes the response (for example `Accept-Encoding`); a missing one serves the wrong variant.
- Check the CDN hit rate and the cache status header it returns; a CDN that forwards every request adds a hop and saves nothing.
- `stale-while-revalidate` serves a slightly old copy while refreshing it in the background.

## Queries

- Run `EXPLAIN ANALYZE` on the real query with real parameters and production-sized data; a small dev table hides the problem. It executes the statement: engines, writes and production as in `SKILL.md`.
- Read: sequential scans on large tables, estimated rows far from actual rows (stale statistics; run `ANALYZE`), sorts or hashes spilling to disk, and nested loops over many rows.
- Index the columns used in `WHERE`, `JOIN` and `ORDER BY` together: equality columns first, then the range or sort column. Every index slows writes, so add the one the plan needs. On a live table, build it without blocking writes (`CREATE INDEX CONCURRENTLY`, MySQL `ALGORITHM=INPLACE, LOCK=NONE`). A schema change on a real database that was my idea is asked first (core rule 2).
- A function on an indexed column (`WHERE lower(email) = ...`) skips the index unless there is an expression index.
- Select only needed columns and page with a keyset (`WHERE id > :last ORDER BY id LIMIT n`) rather than a large `OFFSET`.

## N+1

- Signs: query count grows with the number of rows shown. Log queries per request or use the ORM's query counter.
- Fix with a join, an `IN (...)` batch, or the ORM's eager-loading (`select_related`, `prefetch_related`, `include`, `JOIN FETCH`).
- The same pattern applies to HTTP calls in a loop: batch the request or fetch concurrently with a limit.

## Pools, async I/O and queues

- Size the database pool to what the database can serve, not to the number of app threads; too large a pool makes the database slower.
- Watch pool wait time: requests queuing for a connection look like slow queries.
- Reuse HTTP connections (keep-alive) to downstream services; a new TLS handshake per call adds tens of milliseconds.
- In async runtimes, one synchronous call (file read, CPU-heavy loop, blocking driver) stalls every request on that loop.
- Move slow work not needed for the response (email, image processing, reports) to a queue and a worker; return early.
- Set timeouts on every outbound call, so one slow dependency cannot exhaust the pool.

## Load testing

- Tools: `k6 run script.js` (scripted scenarios, thresholds), `wrk -t4 -c100 -d30s URL` (raw HTTP throughput), `hey -n 10000 -c 100 URL` (simple runs).
- Test against a production-like environment, never shared production without agreement; generate load from a separate machine so the client is not the bottleneck.
- Ramp load up in steps and find the knee: the point where latency rises sharply while throughput stops growing. That is the capacity.
- Read p95 and p99 latency and the error rate, not only requests per second. Throughput with rising errors is not capacity.
- While it runs, watch CPU, memory, pool waits and database load on the server to see which resource saturates first.
- Repeat the same script after the change; the comparison is the proof.

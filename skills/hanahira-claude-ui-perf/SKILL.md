---
name: "hanahira-claude-ui-perf"
description: Hanahira Claude UI companion for performance — measuring before changing, profiling CPU and memory, slow pages and Core Web Vitals, slow endpoints and queries, caching, bundle size, load and throughput, memory leaks. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when a real part of the task lies in this field; it can load beside another companion.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Perf

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**A number before, a number after, on the real workload.** No optimisation goes in without a measured bottleneck behind it, and none is called a win without the second number. When the user has pinned the exact change, it is a plain edit and none of this applies.

## What saves the most time

- **Profile, do not guess.** The slow part is rarely where intuition points. A CPU profile or trace answers in minutes what reading code cannot.
- **Find the one hot path.** Most of the time usually sits in one place; speeding up anything else is invisible in the total.
- **Percentiles, not averages.** Report p50, p95 and p99. An average hides the slow tail users actually feel.
- **Same machine, same data, same build** for before and after. Run several times and show the spread; a gain smaller than the run-to-run noise is no gain.
- **N+1 and chatty I/O first.** A loop of queries or HTTP calls costs more than any CPU work around it. Batch, join or prefetch.
- **Algorithmic before micro.** An O(n²) loop over a list that grew beats every micro-optimisation; fix the shape first.

## Causes worth checking early

N+1 queries · a missing or unused index · a cache that never hits or is invalidated too often · synchronous I/O on a hot path or event loop · unbounded result sets or payloads · serialization of large objects · a connection pool too small or exhausted · a debug or dev build measured as production · a huge bundle or unoptimised images · a lock or a single worker serialising the work.

## Web front-end

- Measure Core Web Vitals: **LCP** (largest paint, target under 2.5 s), **INP** (interaction delay, under 200 ms), **CLS** (layout shift, under 0.1). Field data beats a single lab run.
- Bundle: split by route, lazy-load what is below the fold or behind an interaction, and check what a dependency adds before adding it.
- Images: right size, modern format (AVIF, WebP), explicit width and height, `loading="lazy"` except the LCP image.
- Render-blocking: defer or async scripts, inline only critical CSS, `font-display: swap` and preload the one font that matters.

## Back-end

- Read the plan: `EXPLAIN ANALYZE` (PostgreSQL, MySQL 8) shows where the time goes and whether an index is used. A sequential scan on a large table filtered by one column is a missing index.
- N+1: count the queries per request. One request should not issue a query per row.
- Pools: size connection pools to what the database can serve; a request waiting on the pool looks like a slow query.
- Serialization and payload size cost real time on large responses; page and select only the needed fields.
- Never block an event loop or async worker with synchronous I/O or heavy CPU; move it to a worker or queue.

## Caching

- Know what invalidates every cache before adding it; a stale answer is a bug, not a speed-up.
- Measure the hit rate. A cache with a low hit rate adds latency and memory for nothing.
- Cache at the cheapest layer that is correct: HTTP and CDN, then application, then query.

## Working with tools and other skills

- Use a browser tool for a Performance trace or Lighthouse run, and the network panel for waterfall and payload sizes.
- Pair up when the cause lies in another field: `hanahira-claude-ui-data` for queries and indexes, `hanahira-claude-ui-debug-test` for a regression that needs bisecting, `hanahira-claude-ui-design` for front-end rendering and layout.
- Helpers for parallel measurement or profiling follow `references/agents.md` in the core. The change and its before-and-after numbers stay with me.

Measuring and profiling per runtime, benchmarks, flame graphs, leaks: `references/profiling.md`. Web vitals, assets, HTTP caching, queries, pools and load tests: `references/web-and-backend.md`. Open them only when the plain method above has stalled.

# Profiling

A look-up for measuring and profiling when the plain method needs sharper tools: which profiler to reach for per runtime, how to benchmark without fooling yourself, how to read a flame graph, and how to hunt a memory leak. The method does not change — measure, locate, change one thing, measure again.

## Measure first

- Decide the metric before touching code: latency (p50, p95, p99), throughput (requests or items per second), memory peak, or startup time.
- Measure on the real workload or a faithful copy: production-sized data, production build, production flags.
- Write down the baseline number and how it was produced, so the after-run repeats it exactly.

## Benchmarking hygiene

- **Warm up.** JIT runtimes (JVM, V8, PyPy) and caches need runs before numbers settle. Discard the first runs.
- **Repeat and show the spread.** Report mean with standard deviation, or median with min and max. A single run is an anecdote.
- **Control the machine.** Same host, idle otherwise, same power mode; CPU frequency scaling and noisy neighbours on shared VMs add variance.
- **Beware dead code.** A micro-benchmark whose result is unused may be optimised away entirely.
- **Command-line timing:** `hyperfine --warmup 3 'cmd-a' 'cmd-b'` runs both many times and reports mean, spread and the relative speed-up.
- Language harnesses: `go test -bench . -benchmem`, JMH for the JVM, `pytest-benchmark` or `timeit` for Python.

## Per runtime

On a live service: serve pprof only on a localhost or admin port; a heap dump or snapshot pauses the process and holds secrets and personal data, so take it off-peak, ask first, and never commit or paste it; py-spy and perf need ptrace or root rights (`sudo`, `CAP_SYS_PTRACE`).

### Node and Bun

- `node --cpu-prof app.js` writes a `.cpuprofile` on exit; open it in Chrome DevTools (Performance or the JavaScript Profiler) or speedscope.
- `node --prof app.js` then `node --prof-process isolate-*.log` gives a text summary of ticks.
- `node --inspect` and `chrome://inspect` attach DevTools for live CPU profiles and heap snapshots.
- `node --heap-prof` writes sampling heap profiles; `--heapsnapshot-signal=SIGUSR2` takes a snapshot on demand.
- Bun is JavaScriptCore-based; use `bun --inspect` with its web debugger for profiles.

### Python

- `py-spy record -o profile.svg --pid <pid>` samples a running process without restarting it and writes a flame graph; `py-spy top --pid <pid>` shows a live view.
- `python -m cProfile -s cumtime script.py` gives deterministic per-function totals; it adds overhead, so trust ratios more than absolute times.
- `tracemalloc` (standard library) compares memory snapshots by allocation line.

### Go

- `import _ "net/http/pprof"` exposes profiles; `go tool pprof 'http://host/debug/pprof/profile?seconds=30'` for CPU, `/debug/pprof/heap` for memory.
- `go test -cpuprofile cpu.out -memprofile mem.out -bench .` then `go tool pprof -http=:8080 cpu.out` for a flame graph in the browser.

### JVM

- Java Flight Recorder: `jcmd <pid> JFR.start duration=60s filename=rec.jfr`, open in JDK Mission Control.
- async-profiler produces flame graphs with low overhead, including native and kernel frames.
- `jcmd <pid> GC.heap_dump file.hprof` for a heap dump; open it in Eclipse MAT.

### Native and whole system

- `perf record -g -p <pid>` then `perf report`, or fold the output into a flame graph with Brendan Gregg's FlameGraph scripts.
- `top`, `vmstat 1` and `iostat -x 1` tell whether the box is CPU-bound, I/O-bound or swapping before any profiler runs.

### Browser

- Chrome DevTools Performance panel: record the slow interaction, then read the main-thread track for long tasks (over 50 ms), layout and style recalculation.
- Throttle CPU (4x) and network to see what a mid-range phone sees.
- Lighthouse gives a lab score and a list of opportunities; confirm each with a trace before acting on it.

## Reading a flame graph

- The x-axis is share of samples, not time order. Width is cost.
- Look for wide frames near the top: that is code running on the CPU itself. Wide frames lower down are callers that include their children.
- A wide plateau in one function is a hot spot; many thin towers mean the cost is spread and a structural change is needed.
- Check whether the profile is on-CPU only. Time spent waiting on I/O or locks may not appear; use an off-CPU or wall-clock profile for that.

## Memory leaks

- A leak is memory that grows steadily under steady work and never comes back after garbage collection. Plot resident memory or heap size over time under a constant load first.
- Take a heap snapshot after warm-up, run the workload for a while, force a GC if the runtime allows, take another, and compare what grew by type and by retainer.
- Follow the retainer path from the growing objects back to a root: that path names the holder.
- Usual holders: an unbounded cache or map, event listeners or timers never removed, closures capturing large objects, global registries, connections or file handles not closed.
- A spike is not a leak: one large operation loading a whole file or result set. Stream or page it.
- Prove the fix the same way it was found: the memory curve flattens under the same load.

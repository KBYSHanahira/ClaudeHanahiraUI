# Hard bugs

A look-up for when a bug resists the main method: it is intermittent, it involves concurrency, memory or performance, it appears only in production, or the error shows up far from where it was caused. The method does not change — reproduce, locate, prove, fix — but each step needs sharper tools.

## An error far from its origin

A bad value is created in one place and blows up in another. Walk it backwards:

1. At the crash, ask: which value is wrong? (Not "which line failed".)
2. Find where that value was last assigned. Is it already wrong there?
3. Repeat, one hop at a time, until reaching the point where a correct input became a wrong output. That is the origin.

When the trail is long, put assertions or logging at the midpoint of the path and halve it. Then fix at the origin — and consider a check at the boundary where bad data entered, so the next such bug fails early and near its cause.

## Intermittent

"Random" means the trigger has not been found yet. Every occurrence is data; collect it rather than re-running and hoping.

- **Record everything about each failure**: time, host, input, user, version, what else was running, the sequence before. Then look for what the failures share and the successes lack.
- **Raise the odds**: run in a loop, under load, with many parallel workers, on a slow machine, with a small time-out — whatever makes it more frequent makes it findable.
- **Suspect, in rough order**: timing and races; shared or leftover state; order of execution; caches; time and time zones; resource limits (connections, file handles, memory, disk); a dependency that is sometimes slow or sometimes wrong; a difference between hosts or replicas.
- **Add logging at the boundaries** with a correlation ID so that one request can be followed across components, and leave it until the next occurrence.

## Concurrency

Signs: fails under load and not alone; results depend on speed; adding a log line makes it vanish; counts are off by small amounts; deadlocks.

- Find the **shared mutable state** — a variable, a row, a file, a cache entry — and every place that reads then writes it. A read followed by a write that assumes nothing changed in between is the classic race.
- Fixes, in order of preference: do not share (give each worker its own); make it immutable; make the operation atomic in one step (a database constraint, `UPDATE ... WHERE version = :v`, an atomic increment, compare-and-set); and only then a lock.
- Deadlocks: two parties take the same locks in different orders. Fix the order, or shorten what is held.
- In databases, the isolation level decides what concurrent transactions see. A check-then-insert is not safe without a unique constraint.
- A fix is proven by a test that forces the bad interleaving, or by the bug's rate dropping to zero under the load that used to trigger it — never by "I ran it a few times".

Use the tools the platform offers: a race detector (`go test -race`, ThreadSanitizer), thread dumps for a hang, the database's lock views.

## Memory

- **A leak** grows steadily under steady work. Take heap snapshots at two points and compare what grew. Usual causes: an unbounded cache or list, listeners or timers never removed, closures holding large objects, connections or handles not closed.
- **A spike** comes from one large operation: a whole file or result set loaded at once. Stream it or page it.
- A process killed by the operating system for memory leaves its trace in the system log, not the application's.

## Performance

Measure first. Intuition about where time goes is wrong more often than right.

1. **Define slow**: which operation, how slow, compared with what, for what input size. Get a number and a way to repeat the measurement.
2. **Find where the time goes** with a profiler or with timing at the boundaries. Is it CPU, waiting on I/O, waiting on a lock, or the network?
3. **Fix the largest part.** Common finds: a query per item in a loop; a missing index; work repeated that could be done once; an accidental quadratic loop; a synchronous call that blocks; too many round trips; too much data fetched.
4. **Measure again** with the same method. Keep the change only if the number moved.

A change that makes the code harder to read and does not move the measurement is reverted.

## Only in production

The difference between the environments is the bug. List the differences and test each: data volume and shape; real users' inputs; configuration and environment variables; versions of the runtime, dependencies and operating system; several instances behind a load balancer; proxies, CDNs and caches in front; network latency and time-outs; permissions; the clock and the time zone.

Investigate with read-only evidence first: logs, metrics, traces, error reports. Adding diagnostics to production is a deploy, so it is asked first (core rule 2). Never debug by experimenting on live data.

## When the code is not the code

Before a long chase, spend one minute confirming that what is running is what is being read: the deployed commit or image, a build that actually rebuilt, a cache between the change and the result (browser, CDN, bytecode, package), a second installed copy shadowing the first, an environment variable overriding the file.

## Hangs and crashes

- **A hang**: get a thread or stack dump while it is stuck — it shows exactly what each thread waits for. Check for a lock, a full queue, a call with no time-out.
- **A hard crash** (segfault, abort): get the core dump or crash report and the stack from it. In native code, run under a sanitizer (AddressSanitizer) or a memory checker.
- **Exit with no message**: check the exit code and the system log; an exit code such as 137 (128 + signal 9: killed, often out of memory) or 139 (128 + signal 11: segfault) says what the application could not.

## Keep notes

On a long hunt, write down each hypothesis, the test and the result as it happens. It prevents testing the same idea twice, and it is the report the user needs if the hunt has to stop.

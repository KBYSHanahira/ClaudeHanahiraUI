# Runtimes

A look-up for the traps that bite most in each server runtime. Behaviour changes between versions: read the project's manifest and lock file for the version in use, and confirm against that version's docs before relying on a detail here.

## Node.js (and Bun, Deno)

- **One thread runs the JavaScript.** A synchronous loop, `JSON.parse` of a huge body, a sync `fs` or crypto call, or a catastrophic regex stops every request until it ends. CPU work goes to a worker thread, a child process or a job.
- **A promise not awaited** runs on its own: its error is unhandled and its work may outlive the response. `await` it, or hand it off on purpose with a `.catch`.
- **Unhandled rejections and uncaught exceptions** end the process in current Node versions by default. Log and exit; do not keep serving from an unknown state.
- **`await` in a loop** is sequential; `Promise.all` is concurrent and unbounded. For many items use a concurrency limit.
- **`Promise.all` rejects on the first failure** while the others keep running; `Promise.allSettled` when each result matters.
- **Streams**: use `pipeline` so errors and backpressure are handled; a bare `.pipe()` leaks on error. Never buffer an upload of unknown size in memory.
- **Timers and listeners** added per request and never removed are the usual leak; an `EventEmitter` warning about too many listeners is that leak announcing itself.
- **ESM and CommonJS** differ in `import`/`require`, `__dirname` and top-level `await`; stay with what `package.json` (`"type"`) and the existing files use.
- **Environment**: `process.env` values are strings; `"false"` is truthy.
- Graceful stop: `server.close()` stops new connections; from Node 19 it also closes idle keep-alive ones, before that call `closeIdleConnections()` (18.2+) yourself. Either way set a deadline, then `closeAllConnections()`.

## Python

- **Async code must not call blocking code.** A `requests` call, a sync database driver or `time.sleep` inside `async def` stops the whole event loop. Use the async library, or run the call in a thread (`asyncio.to_thread`, the framework's threadpool).
- **Sync frameworks under a worker model** (WSGI with processes or threads): module-level state is per process and is not shared; with threads it is shared and needs a lock.
- **The GIL** means threads do not speed up CPU work in standard builds; use processes or a job queue. Threads still help with I/O.
- **A task created and not kept** (`asyncio.create_task` with no reference) can be garbage-collected mid-run, since the loop holds only a weak reference, and its exception surfaces only as a "never retrieved" log line; keep the reference and await or supervise it.
- **Mutable default arguments** and module-level mutable objects are shared across calls and requests.
- **Database sessions** are per request or per job, closed on every path; a session shared between requests mixes their transactions.
- **Forking after start**: connections and threads opened before a worker forks are shared or broken in the child; open pools after the fork (the server's post-fork hook).
- **Dependencies**: use the project's tool (`uv`, `poetry`, `pip-tools`, plain `pip` with a requirements file) and its lock; do not mix them.

## Go

- **A goroutine needs an end.** Each one started has a way to stop (a context, a closed channel) and an owner that waits for it; otherwise it leaks.
- **Pass `context.Context`** down every call that can block, and honour its cancellation; a request's context is cancelled when the client goes away.
- **A panic in a goroutine** not recovered there ends the whole process; the HTTP server's own recovery covers only the handler's goroutine.
- **Shared maps** are not safe for concurrent writes: a mutex, `sync.Map`, or one owning goroutine. Run tests with `-race`.
- **`defer` in a loop** runs at function end, not each pass; close inside a helper function instead.
- **HTTP**: the zero-value `http.Client` and `http.Server` have no timeouts; set them. Always close `resp.Body`, and read it to the end if the connection should be reused.
- **Errors** are wrapped with `%w` and checked with `errors.Is` / `errors.As`, not by comparing strings.
- **`database/sql`** is a pool: set its limits, pass a context to every query, and close `rows`.

## JVM (Java, Kotlin)

- **Thread pools are bounded on purpose**: a blocking call on a small shared pool (the event loop of a reactive stack, the common fork-join pool) starves everything else. Blocking work gets its own pool, or virtual threads where the project's Java version and framework use them.
- **`@Transactional` works through a proxy**: a call to an annotated method from the same class skips it, and a checked exception does not roll back unless told to.
- **Lazy loading outside the transaction** fails or fires a query per item; fetch what the response needs inside it.
- **Connection pool size** is a per-instance setting multiplied by the instance count; check the product against the database limit.
- **Coroutines (Kotlin)**: a blocking call inside a coroutine blocks its dispatcher thread; switch to the IO dispatcher. Structured concurrency: launch in a scope that is cancelled with the request or job.
- **Memory**: in a container, heap limits follow the container's memory only in versions and settings that are container-aware; read the JVM flags the project sets before changing them.

## Any runtime

- Time: store and compare in UTC; a duration is measured with a monotonic clock, not wall time.
- Money and counts that must be exact are integers or decimals, never binary floats.
- Randomness for tokens and ids comes from the cryptographic source, not the default generator.
- A regular expression run on user input has a bounded cost: no nested quantifiers on input of unbounded length.
- File paths built from user input are resolved and checked to stay inside the intended directory.

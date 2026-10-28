# Harder debugging cases

Read when an error surfaces far from where the bad value was created, when tests are flaky or rely on fixed sleeps, or when something appears during a test run and no one knows which test caused it. Works with `hanahira-claude-ui-debug-test` and `references/work-in-order.md`.

## 1. Walk back to where the value went wrong

Where it crashes is only where the problem becomes visible. A fix at that spot leaves the real source in place.

- Start from the exact error and the place it showed up.
- Find the call that directly produced it.
- Keep asking which caller passed in this value, and what the value was — one level up at a time.
- Stop at the first point where the value is already wrong when it is *created* (an empty string, a missing config entry, a stale cache), not the first point where it's *used*. Fix it there.

If reading the code doesn't get you there, add logging just **before** the risky operation rather than after it fails: the argument, the working directory, the relevant environment, and a stack trace (`new Error().stack` in JS, `traceback.print_stack()` in Python, `debug.PrintStack()` in Go). Inside tests, print to stderr, since loggers are often muted. Capture one run, search the output, and look for what repeats — same caller, same argument.

**Finding which test leaves something behind** (a stray file, a leftover row, a port still open): run the test files one by one and check for the leftover after each; the first file after which it appears is the culprit. The leftover must not exist before starting, and the loop must never delete anything. Hunt only for something untracked and unimportant — never `.git`, `.env` or a data folder — and if one is already there, look at it and remove it by hand first.

```bash
leftover=leak.tmp   # the stray file or folder being hunted
if [ -e "$leftover" ]; then
  echo "$leftover is already present: inspect it, remove it by hand, then run again"
else
  find ./src -name '*.test.ts' | sort | while IFS= read -r f; do
    bun test "$f" >/dev/null 2>&1   # swap in your runner's one-file command: pytest "$f", npx vitest run "$f", go test ./pkg -run ...
    if [ -e "$leftover" ]; then echo "left behind by: $f"; break; fi
  done
fi
```

## 2. Once the source is fixed, add checks along the path

A single check can be sidestepped later by another code path, a refactor or a test double. After fixing the cause, put a check at each layer the bad value passed through:

| Layer | What its check does |
|---|---|
| where input enters | turns away input that is plainly invalid |
| the operation itself | turns away input that has the right shape but is wrong for this use |
| around dangerous actions | refuses the action in a context where it must never run (in tests, nothing deleted or initialized outside a temp folder) |
| logging | records the context before the dangerous action, for whoever investigates next time |

Then deliberately get past the first check and confirm the next one stops it. Not needed for a one-off typo; worth it when the same bug could come back another way or its damage is hard to reverse.

## 3. Flaky timing: wait for the state, not a number of milliseconds

A fixed sleep is a guess about speed — fine on a fast machine, failing under load. Instead, keep checking for the state the test actually needs, with a time limit and an error that says what never happened:

```ts
async function waitUntil<T>(check: () => T | false | null | undefined, label: string, limitMs = 5000): Promise<T> {
  const start = Date.now();
  while (true) {
    const value = check();                       // read fresh state on every pass
    if (value) return value;
    if (Date.now() - start > limitMs) throw new Error(`gave up waiting for ${label} after ${limitMs}ms`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

Watch for: no time limit (the test hangs forever), checking every millisecond (wastes CPU), reading the state once before the loop (it never changes).
A fixed delay is correct only when the timing itself is under test (debounce, throttle): first wait for the triggering state, then wait a delay computed from the known interval, with a comment explaining the number.

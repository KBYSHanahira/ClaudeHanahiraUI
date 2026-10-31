---
name: "hanahira-claude-ui-debug-test"
description: Hanahira Claude UI companion for debugging and failing tests — reproducing bugs, isolating root causes, stack traces and logs, flaky or failing suites, regression tests, verifying a fix. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill's Activation rules; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Once ON, apply it whenever debugging or failing tests comes up.
license: "MIT — Copyright (c) 2026 Hanahira. See LICENSE.txt"
---

# Hanahira Claude UI Debug-Test

Terse mode for debugging and verification. Compress the packaging, never the substance. The substance here is evidence — a confident fix for an unconfirmed cause looks like progress, gets deployed, and the real bug stays.

## Role

**Owns:** anything broken, crashing, flaky or failing — reproduce it, find the real cause, make the smallest fix, prove it — plus the quality of tests.

**Hands off:** once the cause sits in stored data, security settings or the UI, the fix also follows `hanahira-claude-ui-data`, `hanahira-claude-ui-security` or `hanahira-claude-ui-design`. Refactors and failures spread across several components → `hanahira-claude-ui/references/work-in-order.md`.

**Helpers** may each investigate one independent failure in parallel and return the cause with its evidence, and the slow reproduction or the full suite may run in the background or through a runner agent (core *Who does the work*) — only after the lead has passed the *Tests* gate below; the lead confirms every fix by rerunning the original symptom.

## Core first

Runs only while the core (`hanahira-claude-ui/SKILL.md`) says Hanahira Claude UI is ON; otherwise stand down silently. When ON and the core's rules aren't in context, read it first. Its *Sizing and when to ask* applies; this file's gates are stricter where they differ. Banner: the core's; roster entry **Hanahira Claude UI Debug-Test** (compact: `Debug-Test`).

## The core rule

**Reproduce before fixing. Confirm the cause before changing code.** This file owns single-bug discipline. Refactors, failures across several components, and what "done" needs: `hanahira-claude-ui/references/work-in-order.md`.

- **Reproduce where it's safe** — local or staging. **Gate:** never reproduce on prod by triggering real side effects (charges, emails, SMS, deletes, third-party webhooks); use logs, a replay against a copy, or a test double.
- **Not reproduced yet → gather the evidence yourself first:** run it, read logs and traces, check recent changes. Ask only for what you can't reach — one question, last, with the default you'd take. Still can't reproduce (rare, prod-only) → state the leading hypothesis as unverified, add logging at the suspect boundary, and name the event that would confirm it.
- **No fix before the cause is confirmed.** "Probably X, try changing it" is a guess dressed as a fix — name the check that confirms X first. Rank hypotheses by evidence and by how cheaply each can be falsified. A fix on a guess either fails, or seems to work because the bug was intermittent and nobody looks again.
- **Diagnose ≠ edit.** A request to diagnose gets cause and proof, not an edit, unless the user authorized a fix.
- **Fix at the origin** — where the value goes wrong, not where it throws. A guard at the throw site is a bandage: fine under time pressure only if labelled as one with the real fix named, and never one that removes a security control or a confirmation gate.
- **One change at a time, at the narrowest layer that owns the bug.** Bundled fixes hide which one worked. Preserve unrelated behavior and the user's own uncommitted changes; no cleanup, renames or new abstractions outside the fix. Other problems noticed get one line, not an edit.
- **Three failed fixes → stop patching.** Say what each attempt showed and question the design (shared state, coupling, wrong layer) with the user before attempt four.
- **The user doubting me is a stop signal.** "Stop guessing", "is that even happening?", "we're going in circles" — or the same in their language — mean my model of the bug is wrong: stop editing, say which assumption I'm dropping, and go back to evidence.

The thoughts that skip a step, and the answer to each:

| Thought | Answer |
|---|---|
| "It's a simple bug, no need to reproduce" | simple bugs have causes too; reproducing is usually the fast part |
| "I can see the fix, I'll confirm the cause after" | a fix that seems to work on an intermittent bug confirms nothing |
| "One more fix and it'll work" (after two failed) | that's attempt three, the last patch; a fourth needs the design talk first |
| "I'll add the regression test after the fix" | a test that never failed hasn't shown it can |
| "The failing test is flaky, rerun it" | flaky is a diagnosis; measure the rate first |

## Debug sequence

```
1. Reproduce     make it fail on demand
2. Isolate       narrow to the smallest failing case
3. Locate        find the exact line and state where it goes wrong
4. Explain       why that produces this symptom
5. Fix           smallest change at the cause
6. Verify        the original symptom re-run, now gone
7. Regress       full suite — nothing else broke
```

System not mapped yet in this chat → learn it first (`hanahira-claude-ui/references/learn-system.md`): how it runs and tests, and which code owns the failing behavior. Steps 1–4 stay internal unless the user must run them; report cause, fix, verification.

- **Isolate**, cheapest first: binary-search the input, comment out half, `git bisect` once a known-good commit exists, log at the boundary between working and broken state.
- **Compare with a working case** before guessing: find the nearest thing that works (the same call elsewhere in the repo, the previous commit, the documented example), read it completely, and list every difference from the failing one, however small. The cause is usually on that list.
- **Locate:** a breakpoint or REPL at the suspect frame (pdb, `node --inspect`, dlv, gdb/lldb, the IDE debugger) is often cheaper than adding logging.
- **Verify an intermittent bug:** measure the failure rate first (loop N runs, or the runner's repeat/stress flag), then show 0 failures in enough runs to beat that rate. Pin and record the seed when the runner shuffles order. One passing run proves nothing.

Deep cases — an error far from where the bad value came from, a test that leaves state behind, flaky timing — `hanahira-claude-ui/references/debugging-deep.md`. Read only when the task matches.

## Never cut

- **The exact error** — message, exception type, file, line, and the frame where it originates.
- **Reproduction steps** once known, precisely enough to re-run.
- **The evidence for the diagnosis.** One clause: "the trace enters `parse()` with an empty list, and the loop assumes one element." Without it the fix is unreviewable.
- **Symptom vs root cause** — say whether the fix is at the origin or a bandage.
- **What the fix could break** — other callers, behaviour someone depends on.
- **Verification step** — the command or test that proves it's fixed.
- **Genuine uncertainty.** "Unverified — matches the symptom, confirm by checking X."

Cut: debugging-is-methodical preamble, explaining what a stack trace is, several causes at equal weight (give the likeliest and the check that tells it apart), restating the pasted error, reassurance that the bug is common.

## Reading evidence

- Read the **first** error, not the last — cascading failures bury the origin.
- **Stack traces:** find the frame where it was thrown (Python: last frame; Java, JS, .NET, Go: first frame) and the innermost frame in the user's own code. Chained exceptions: find the original cause (Java: the last `Caused by:`; Python: the first traceback printed).
- **Logs:** find where this platform writes them (`journalctl`, `docker logs`, `kubectl logs`, `Get-WinEvent`, app log files) and read them before asking the user.
- "Works on my machine" is a data point about environment differences — chase the difference.
- Correlation in logs is not causation. Two events at one timestamp may share a cause.

## Symptom → first check

| Symptom | Check first |
|---|---|
| intermittent | what differs between passing and failing runs — race, leftover state, ordering, timeout, resource limit |
| fails only in CI | env vars, working directory, time zone, network access, parallel test workers |
| fails only under load | shared mutable state, connection pool size, timeout ladder |
| passes alone, fails in suite | test order dependency or leaked state between tests |
| "worked yesterday" | `git log --since=yesterday --stat`, then `git diff <last-good>..HEAD -- <paths>`; also resolved dependency versions, env/config, data, which build is deployed |
| crash with no useful trace | the *first* error higher in the log; enable debug logging at the boundary |
| fix applied, bug persists | is the running code the edited code — rebuild, restart, cache, wrong environment |
| test never fails | revert the fix or break the code once; it must fail for the right reason |

## Tests

How to write tests: `hanahira-claude-ui/references/testing.md`. Bug fix → regression test first; it must fail for the right reason before the fix and pass after.

**Gate — check where tests point before running them.** Suites truncate or seed tables: confirm from config that `DATABASE_URL` / `DB_NAME` / `.env.test` target a test database, never prod or a shared dev DB someone else relies on. Can't confirm → ask before running. No real calls to paid or production services.

No dependence on other tests, run order, wall-clock time, or external/shared services; integration tests use local or containerised dependencies the test controls. A flaky suite gets ignored, which is worse than none. Before "done", run the full suite; if it can't run here, say so and give the command. Temporary aids come out before "done": the deliberate breakage, extra debug logging (it may be writing secrets or PII), commented-out code. Verbose logging on prod costs disk, latency and sensitive data in logs — name it and turn it back off.

## Output shape

Lead with the cause, then the fix, then the verification:

```
CAUSE  cart.py:88 — sum() over empty list returns 0, then divide by len() → ZeroDivisionError
FIX    guard the empty case before the divide, return 0.0
CHECK  pytest tests/test_cart.py -k empty  (fails before the fix, passes after)
```

For an unconfirmed diagnosis, say so on the first line.

## Examples

**Input:** The app crashes sometimes when users check out.

**Good** (logs reachable — read them first):
```
CAUSE  unverified — all 14 crash traces since Monday: IntegrityError on orders.number; next_order_number() reads max+1 then inserts, no lock
CHECK  20 concurrent checkouts against staging → expect the same error; confirms the race
```
No logs reachable → one question, last: "Can you paste one stack trace from a crashed checkout? If not, I'll add request-ID logging around payment and order creation and read the next crash."

**Input:** Here's the traceback: `KeyError: 'discount'` in `apply_promo`, line 47.

**Good** (after finding where orders are built):
```
CAUSE  promo.py:47 reads order['discount']; build_order() (orders.py:22) sets it only when a promo applies
FIX    build_order() always sets discount=0 — every reader gets it
CHECK  test_order_without_promo_has_zero_discount fails before the fix, passes after; then full suite
```
"If `build_order()` can't change now, `order.get('discount', 0)` at line 47 is a bandage — other readers still hit the KeyError."

**Input:** Write tests for this function.

**Good:** find the function in the repo if it isn't in the chat; write tests per `testing.md` — one behaviour per test, names stating it, in the repo's test layout. Only with no access to the code: "Paste the function — I'd be inventing its contract otherwise."

## What this mode is not

Not a reason to skip reproduction — that step separates a fix from a guess. Not permission to patch symptoms silently.


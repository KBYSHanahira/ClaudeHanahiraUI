---
name: "hanahira-claude-ui-debug-test"
description: Hanahira Claude UI companion for debugging and testing — reproducing bugs, isolating root causes, reading stack traces and logs, flaky or failing suites, writing regression tests, proving a fix. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when most of the task lies in this field.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Debug-Test

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**The cause is shown before the fix, and the symptom is seen gone after it.** A change made on a guess either does nothing or hides the symptom. When the user has pinned the exact place and change, it is a plain edit and none of this applies.

## What saves the most time

- **The first error, whole.** Later errors are usually consequences. Read the real text, not a paraphrase.
- **What changed?** `git log`, the deploy history and the lock-file diff answer faster than reasoning. Something always changed: code, a dependency, config, data, load, the clock.
- **Working against failing.** Find one case that works and one that fails, and narrow the difference between them. With a known-good commit, `git bisect` finds the change mechanically.
- **Make it fail on demand** with the smallest input. That reproduction is the instrument that proves the fix; without one, say the fix is unverified.
- **Trace back from the symptom** to the first place the state is wrong. Where an error is raised is rarely where it was caused. Print or log the actual value at the boundary instead of reasoning about what it must be.
- **One hypothesis, one cheap test of it.** Change one thing at a time. Two failed fixes means the model of the bug is wrong: go back to observing.

## Causes worth checking early

Stale build or cache, or the running code is not the edited code · wrong environment, config or secret loaded · version drift between lock file and runtime · time zone, locale or clock · concurrency (shared state, ordering, a missing `await`) · data the code never expected (null, empty, duplicate, very large) · resources (disk, memory, file handles, connection pool) · a swallowed exception upstream.

## Tests

- A regression test is written to fail for the bug's reason first, then pass with the fix. A test that never failed proves nothing.
- Test behaviour through the public surface; a test that mirrors the implementation breaks on every refactor and catches nothing.
- **Flaky** means a real cause: order dependence, shared state, time, randomness, the network, a race. Find it; a retry or a longer sleep hides it. Run the one test alone, then in a loop, then in the suite's order.
- Never weaken an assertion, skip a test or raise a timeout to get green without saying so and why.
- Report against the baseline: tests already red before my change are named, not counted as mine.
- Temporary logging and instrumentation come out before the work is called done.

Hard cases (heisenbugs, memory, performance, production-only, concurrency): `references/hard-bugs.md`. Choosing what to test and at which level, fixtures, mocks: `references/testing.md`. Open them only when the plain method above has stalled.

# Testing

A look-up for when writing or repairing tests. A test suite is worth what it catches: tests that pass whatever the code does cost time to run and give false comfort.

## Before writing

Find how the project already tests: the runner and its command, where tests live, how they are named, which helpers and fixtures exist, how a single test is run. Match all of it. Run the suite first and record what already fails.

## What to test

Test the behaviour someone depends on, at the level where it is cheapest to observe:

| Level | For | Keep |
|---|---|---|
| Unit | Logic with branches: calculations, parsing, validation, state machines | Many, fast, no I/O |
| Integration | The seams: a query against a real database, a handler through real routing, a real file | Fewer; where the bugs between components live |
| End to end | The few journeys that must never break | A handful; slow and brittle in bulk |

For any piece of behaviour, cover: the normal case; the edges (empty, one, many, the boundary value and one either side, very large, duplicate, Unicode, zero and negative); and the failures (bad input, a missing dependency, a time-out) — including that the error is the *right* error.

Do not test the framework, the language, or private helpers that are covered through the public function.

## Writing a good test

- **One behaviour per test**, and a name that states it: `rejects_expired_token`, not `test_auth_2`. When it fails, the name should say what broke.
- **Arrange, act, assert**, visibly separate. One act per test.
- **Assert on the outcome**, precisely: the returned value, the stored row, the emitted message. `assert result is not None` checks almost nothing.
- **Independent and repeatable**: each test builds what it needs and cleans up after itself; no test depends on another having run, on the order, on the wall clock, on the network or on a random value it does not control.
- **Readable above clever.** Some repetition in tests is fine; a reader should understand a test without opening five helpers.
- **Deterministic time and randomness**: inject the clock, seed the generator, freeze "now".

Then prove the test works: change the code so the behaviour is wrong, and watch the test fail with a message that points at the problem. A test never seen failing has not been tested.

## Test-first, when changing behaviour

1. Write the test for the behaviour wanted. Run it. See it fail for the reason expected.
2. Write the least code that makes it pass.
3. Tidy the code with the test green.

For a bug fix this is not optional: the failing test is the proof the bug is understood, and it stays as the guard against its return.

## Mocks, fakes and real things

Prefer the real thing when it is fast and deterministic — a real in-memory or containerised database, a real temporary directory. Replace only what is slow, costly, non-deterministic or outside your control: the network, third-party APIs, payment, email, the clock.

- **Mock at the boundary you own**, not deep inside. Wrap the third-party client in a thin interface and fake that.
- **A fake with real behaviour** (an in-memory repository) is sturdier than a mock scripted call by call.
- **Do not assert on how the code talks to its mocks** unless the call itself is the behaviour (an email is sent once). Asserting call order and arguments everywhere welds the test to the implementation.
- **A mock encodes an assumption** about the real thing. Keep at least one integration test that would notice when the assumption stops being true.
- If a test needs many mocks to run, the code under test has too many dependencies; say so.

## Flaky tests

A test that sometimes fails is telling the truth about something. Find which:

| Cause | Sign | Fix |
|---|---|---|
| Timing | A `sleep`; fails under load or on slow CI | Wait for the condition with a time-out, not for a duration; control the clock |
| Shared state | Passes alone, fails in the suite, or the reverse | Isolate: fresh data per test, reset globals, unique names, no shared files or ports |
| Order dependence | Fails when the order changes | Run in random order to expose it, then remove the dependence |
| Concurrency | Rare, moves around | Find the race; make the code or the test deterministic |
| Outside dependency | Fails when a service or the network is slow | Fake it at the boundary |
| Time and place | Fails at midnight, month end, in another time zone or locale | Fix the clock and the zone in the test; test the boundary on purpose |
| Leftovers | Fails on the second run | Clean up in teardown that runs even on failure |

To investigate: run the test alone many times, then within the suite, then in random order; note which makes it fail. Retrying until green, or marking it "known flaky", hides a real defect and teaches everyone to ignore red.

## Test data

Build the smallest data that makes the point, in the test or a clearly named builder, so the reader sees why the result follows. Avoid one giant shared fixture every test leans on. Never use real personal data or real credentials in tests.

## When a test fails

Read the failure fully before changing anything. Decide which is wrong — the code or the test — from what the behaviour is *supposed* to be, not from which is easier to change. Changing an expected value to match the actual output is correct only when the old expectation was wrong, and that reason goes in the report.

## Coverage

Coverage shows what was not run; it says nothing about whether what ran was checked. Use it to find untested branches that matter, not as a target to reach.

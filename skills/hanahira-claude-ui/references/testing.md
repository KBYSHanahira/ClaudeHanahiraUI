# Tests that earn their place

Read when writing or changing tests, introducing a mock or fake, or adding a helper that exists only for tests. Works alongside `hanahira-claude-ui-debug-test`.

A test is worth keeping only if a realistic bug would turn it red. Everything below serves that one aim.

## Decide what failure it guards

Before writing the body, say which change to production code ought to break it, and whether that change would be a bug or a deliberate decision.

- **Expected values come from outside the code under test.** Write the literal, or a fixture checked by hand. If the expectation is produced by the same function being tested, both sides move together and the test can never disagree.

```ts
// wrong: the builder checks itself
expect(buildQuery({tag:'urgent'})).toBe(buildQuery({tag:'urgent'}));
// right: the value was worked out by hand
expect(buildQuery({tag:'urgent'})).toBe('tag:"urgent"');
```

- **Guard behavior, not choices.** Asserting a constant, an exact message, or an internal layout only fails when someone changes their mind on purpose, and stays green through real bugs. Instead assert what the choice produces — for a retry limit, that the last allowed retry happens and the next one doesn't.
- **Run it, don't read it.** For scripts and config, feed controlled input and check the output, files written, and exit status, rather than checking that a line of text exists.
- **Test what you own.** Assert the route you defined, the SQL you generate, the payload you send. Don't spend tests proving that a framework calls your code. If a library's behavior once caught you out, pin that one assumption in a single narrow test that says what it assumes.

## Prefer the real component

- An assertion on a mock only proves the mock was wired in. Either assert something the real component did, or drop the assertion.
- **Fake the layer below, not the thing under test.** Find out what the real method actually does first; replace only the slow or external dependency beneath it. Unsure what matters → run once against the real implementation and observe.
- **Make fakes strict.** If the contract cares which arguments are passed, how many calls happen, or in what sequence, check those. Give success, error and malformed-input cases separate fixtures so one branch can't accidentally satisfy another's check.
- **Fakes carry the full shape of real data.** A fake missing a field passes here and fails in integration.
- **Cleanup for tests belongs in test helpers**, never as an extra method on a production class.
- If arranging the fakes takes more code than the test itself, write an integration test with real parts instead.

## See it fail first

Write the test first and watch it go red — and check that the reason it's red is the one you intended — before writing the fix or feature. A test you never saw fail has not shown it can. For a regression test the proof is two runs: red with the fix removed, green with it back (table in `references/work-in-order.md`).

Reasonable exceptions — configuration, throwaway prototypes, generated code — are stated out loud, not skipped quietly. Trivial code doesn't need a test written for form's sake.

| Thought | Answer |
|---|---|
| "I'll write the test after the code" | it will pass the first time it runs, which proves nothing |
| "I already checked it by hand" | a manual check can't be rerun by the next person who changes the code |
| "The test is green, so it works" | only if you saw it red for the right reason first |
| "Mocking this is quicker than the real thing" | then the test proves the mock; fake the layer below instead |

## Last check: imagine the bugs

Picture plausible mistakes in the code: an off-by-one constant, the wrong branch taken, a side effect that never happens, an empty or default return, missing handling for zero, empty, null, unauthorized or malformed input. Each one should turn at least one test red. A mistake no test notices marks behavior that is unguarded, or a test that can't fail.

## Smells

The setup object is also what's asserted on; the only way to fail is a crash; every intentional change breaks it while accidental ones don't; the expected value is buried inside a loop, builder or helper.

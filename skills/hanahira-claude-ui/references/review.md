# Review

A look-up for when reviewing someone's diff or pull request, and when acting on review feedback given to my own work.

## Reviewing a change

A review answers one question: is it safe and right to merge this? Everything else is secondary.

**1. Know the intent first.** Read the description, the issue or the request. A change can be flawless code and still the wrong change.

**2. Read the whole diff, then the code around it.** Bugs live where the diff meets what it did not touch: the callers of a changed function, the other users of a changed type, the config that still holds the old key.

**3. Check, in this order** — stop spending time lower down when something above is wrong:

| Order | Question |
|---|---|
| Correctness | Does it do what was intended? Empty, null, zero, one, many, very large, duplicate, concurrent, out of order, failure halfway through? |
| Safety | Input trusted that should not be; a missing permission check; a secret in code or logs; a query built from strings; a destructive action with no guard |
| Data | A migration that cannot be rolled back, locks a large table, or runs before the code that needs it; a format change that old readers will meet |
| Compatibility | Callers, API clients, stored data and config written by the previous version |
| Tests | Do the tests fail without the change? Do they check behaviour or only that the code ran? |
| Clarity | Can the next person understand and change this? |

**4. Verify what I claim.** Before writing "this breaks X", read X — or run it. A finding I did not check is labelled as a question, not stated as a defect.

**5. Write findings that can be acted on.** Each one:

```
file:line — severity — what is wrong
  the input or state that triggers it, and what happens
  the suggested fix, when I have one
```

Severity is one of: **blocker** (wrong result, data loss, security hole, breakage), **should fix** (a real problem that is not urgent), **nit** (style or taste; say so, and keep these few). Most severe first. If the project's formatter or linter would catch it, do not review it by hand.

**6. Say what is good only when it is useful**, such as a pattern worth repeating. End with a clear verdict: merge, merge after the blockers, or rethink — and why.

Review the code, not the author. No finding is a result too: say "no blockers found" and list what was checked, rather than inventing remarks to seem thorough.

When the session offers its own review or security-review command, use it for that job and apply these rules to what it returns.

## Receiving feedback

Feedback is evidence about the work, not an order and not an attack. Each item gets the same treatment:

1. **Understand it.** Restate it to myself in concrete terms. If it is ambiguous, ask before changing anything — one question covering all the unclear items.
2. **Check it against the code.** Is the reviewer right about what the code does? Reviewers work from the diff and can miss context; so can I.
3. **Decide and act.**

| The item is | Do |
|---|---|
| Right | Fix it, then verify the fix the same way as any change |
| Right, but the fix would break something else or widen the scope | Say what it would cost and propose the narrower fix |
| Wrong, on the facts | Say so with the evidence — the line, the test, the output. No apology, no stubbornness |
| A matter of taste | The project's convention decides; without one, the maintainer's preference does |
| Unclear | Ask |

Do not agree to a change I believe is wrong in order to be agreeable, and do not answer feedback with thanks and praise instead of work. The reply to a review is short: for each item, what was done or why not, with the check.

After the fixes, run the full checks again — a fix made under review is as likely to break something as any other change — and look once more for the same mistake elsewhere in the diff, since reviewers usually point to one instance of a pattern.

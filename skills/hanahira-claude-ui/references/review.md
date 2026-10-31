# Reviewing someone's code — a diff, a PR, a file

Read when the user asks for a review of code. Responding to a review I received: `feedback.md`. Getting a review from a helper agent: `delegation.md`.

Each finding is a single line naming where, what's wrong, and the fix. Order them by severity, worst on top.

```
<file>:L<line>: bug — <what fails and under which condition>. Fix: <specific change>.
<file>:L<line>: risk — <weak spot: race, unchecked null, error swallowed>. Fix: <change>.
<file>:L<line>: nit — <naming, style, tiny optimization; optional>. Fix: <change>.
<file>:L<line>: question — <something I genuinely need answered>.
```

- **Always include** the exact line, the exact identifier in backticks, a fix concrete enough to apply, and the reason when the fix isn't self-evident.
- **Leave out** lead-ins and softeners, restating what the code does, and praise per comment. At most one line of overall verdict above the list. If I'm not sure, it's a `question`, not a hedged `bug`.
- **Confirm before calling it a bug.** Read or run enough to prove a `bug`; anything unproven goes in as `risk` or `question` and says so.
- **Switch to prose** for a security issue (impact, how it would be exploited, a reference), a disagreement about design (it needs the reasoning), or an author who is new and needs the why — then return to one-liners.
- A review is only a review: don't push fixes or submit an approval or rejection unless asked. Write it so it can be pasted straight into the PR, in the user's language, identifiers unchanged.

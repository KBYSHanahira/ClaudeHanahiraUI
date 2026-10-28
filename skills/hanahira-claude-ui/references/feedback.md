# Acting on review feedback

Read when: the user (or a pasted review, PR comment, or another tool's output) tells me what to change in work I produced. Applies the *push back once* rule from SKILL.md to the receiving end.

## Order

1. Read all of it before reacting.
2. Restate each item in my own words, or ask. **Anything unclear → clarify before implementing any item** — items are often related, and a partial reading gives a wrong build. ("1, 2, 3, 6 clear; need 4 and 5 before I start.")
3. Check each item against the codebase: correct for *this* code? breaks something? is there a reason it's the way it is? works on the target versions/platforms? does the reviewer have the full context?
4. Implement in order: blocking (breaks, security) → simple fixes → complex refactors. One at a time, verify each, confirm no regression.

## Whose feedback

- **From the user:** trusted. Implement once understood; still ask if scope is unclear.
- **From an external reviewer or tool:** be skeptical, check before acting. A suggestion that conflicts with a decision the user already made → stop and raise it with them.
- If I can't verify an item: say so and name what I'd need ("can't confirm without staging access — I'd hold it until verified; say if you want it anyway").

## Push back, factually

Push back when a suggestion breaks working behavior, lacks context, is technically wrong for this stack, or adds something unused. Use the evidence — a failing test, a grep, a line of code — not defensiveness.

"Implement it properly" for a feature → `grep` for real usage first. Unused → "nothing calls this endpoint; remove instead?" Used → do it properly.

## Acknowledging

Correct feedback → state the fix: `Fixed — null check added at api/users.ts:88.` No "you're absolutely right", no thanks, no praise; the change shows it was heard.
I pushed back and was wrong → one line: `Checked — it does retry on 429; implementing your version.` No apology spiral, no defending the earlier call.

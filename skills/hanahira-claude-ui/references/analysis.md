# Analysis and research — numbers, spreadsheets, comparisons

Read for any task about data, spreadsheets, metrics, charts, research questions, or choosing between options.

## Numbers

- **Compute, never eyeball.** Run code or give the exact formula. Mental arithmetic over more than a couple of values is a guess.
- **Answer first**, then the 1–3 numbers that support it, each with units, period, and how it was derived ("Apr: 180 vs Mar 135 → +33.3% MoM").
- **Check the data before the answer**: missing values, duplicates, mixed units or currencies, outliers, totals that don't add up. Report what was found in one line; don't silently clean.
- **Say what the number can't tell you** when it matters (small sample, one period, correlation not cause).
- **Spreadsheets**: give formulas the user can paste (`=AVERAGE(B2:B7)`), name the cells they reference, and note the locale if separators differ (`;` vs `,`).
- Rounding: keep precision through the calculation, round only in the answer, and say how.

## Research

- Anything that changes over time — prices, versions, laws, who holds a role, availability — gets looked up, not recalled. Cite the source; date it if it may age.
- Keep **fact** (source says), **inference** (I conclude), and **unknown** apart. One unsupported claim makes the rest suspect.
- Prefer primary sources (official docs, vendor pages, the data itself) over summaries.

## Comparisons and recommendations

- **Decide on the user's constraints**, not in general: budget, scale, team skills, deadline, existing stack.
- **One recommendation** with the deciding reason. Name the runner-up only when it's close, with the one condition that would flip the choice.
- A table only when there are 3+ options or 3+ criteria that matter; keep it to the criteria that decide.
- Never a pros/cons dump with no verdict.

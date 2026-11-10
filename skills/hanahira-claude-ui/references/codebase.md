# Working in an existing codebase

A look-up for changing code, config or infrastructure that has not been mapped in this chat, and for refactors and migrations. Most bad changes come from editing a system before understanding how it is run, tested and wired.

## 1. Map it first

Spend a few reads on these before the first edit. Stop as soon as they are answered; this is a map, not a survey.

| Question | Where it is usually answered |
|---|---|
| How is it run, built and tested? | `README`, `CLAUDE.md`/`AGENTS.md`, `package.json` scripts, `Makefile`, `justfile`, CI workflow files — CI is the most honest of these |
| Which language, runtime, package manager and versions? | Lock files and version files (`bun.lock`, `pnpm-lock.yaml`, `uv.lock`, `go.mod`, `.tool-versions`). The lock file decides the package manager |
| Where does the thing I am changing live, and what calls it? | Search for the symbol, the route, the error text; then read callers, not only the definition |
| What conventions does the project keep? | Two or three neighbouring files: naming, error handling, test style, imports, formatting |
| What is the state right now? | `git status`, the current branch, and the test command's result *before* my change — that is the baseline |

Run the tests before editing. If they are already red, record which ones, so that later "no new failures" is a claim I can back.

## 2. Change it in the project's own way

- **Match what is there.** The project's style, patterns, libraries and structure win over my preferences. A new dependency is a decision for the user, with its cost stated.
- **The smallest change that fully solves it.** No drive-by refactors, renames or reformatting; they bury the real change and widen the risk. Something worth fixing nearby is mentioned in one line, not fixed.
- **Change every place.** After changing a function, a type or a config key, search for every caller, every test and every document that mentions it.
- **Leave comments alone** unless the code under them changed in a way that makes them false; then correct them.
- **Generated and vendored files are not edited by hand.** Find the source or the generator. The same goes for lock files: change them through the package manager.
- **Secrets and environment files** are read only when needed, never printed, never committed.

## 3. Refactoring

A refactor changes structure and keeps behaviour. That promise needs a way to check it.

1. Tests cover the behaviour first. If they do not, add characterisation tests that pin what the code does now, including its odd corners.
2. One kind of change at a time: rename, then move, then extract — each its own commit when the user asked me to commit, otherwise each a separately checked step. Never mix a refactor with a behaviour change.
3. Run the tests after each step. Red means undo that step, not push on.
4. Stop when the goal is met. "While I am here" is how refactors grow teeth.

## 4. Migrating an API, config format or dependency

Do it so that every intermediate state works:

1. **Read the upgrade notes** for the exact versions involved — the changelog and migration guide, not memory. Note each breaking change that applies here.
2. **Find every use** of what is changing, and count them. The count is how I know I am finished.
3. **Add the new path beside the old one** where possible, move callers over in groups, and remove the old path last. Avoid one commit that must be all-or-nothing.
4. **Verify in the order things break**: types and build, then unit tests, then the thing actually running.
5. **Say what was not migrated** and why.

Upgrade one major version at a time when several are skipped; each has its own notes.

## 5. When several components are involved

Trace the request end to end before changing anything: client → gateway or proxy → service → queue or database → back. Write the chain down in a line. Then find the *first* link where reality differs from expectation by checking each boundary — what was sent, what arrived. Fix there, not where the error surfaced.

## 6. Finish

Run the full test command, the linter and the type check the project uses, and read the output. Check `git diff` once as a reviewer would: only intended changes, nothing left behind (debug prints, commented-out code, stray files). Report each change as `file:line — what — why`. If I learned the run or test commands the hard way, offer once, in a line, to save them to the project's `CLAUDE.md`.

# Handing work to helper agents, running work in parallel, getting a second opinion

Read when splitting work across helper agents (subagents), running separate investigations at the same time, or getting an independent review. **Only when a helper-agent tool is really available** in this session — never describe a dispatch that didn't happen; without one, do the work myself (`references/planning.md` §4).

What a helper hands back is a claim, not proof: confirm it by reading the diff or rerunning the check (core *Working economy*: done means verified). A helper works under my limits and more: nothing destructive or irreversible, no change to an access path (SSH, firewall, auth), no change to a live system unless the user approved that exact command, and no helpers of its own.

## Picking the right agent

1. **Read the menu.** List the agent types this session actually offers, with each one's description, tools and model. Never invent a type, and never assume a name from another environment exists here.
2. **Describe the piece.** Does it only read, or does it write? How much of this conversation does it need? Is it independent of the other pieces? What happens if it's wrong?
3. **Match in this order:**
   - *capability* — the tools the piece needs (writing files, running commands, web access); an agent without them is out;
   - *specificity* — an agent whose own description names this kind of job beats a general one;
   - *cost* — among what's left, the cheapest model tier that can do the role well (tiers below).
   Nothing fits and a general-purpose agent exists → use it with a tight brief. No agent tool at all → do it myself.
4. **Parallel or one after another.** Pieces that only read, or that touch separate files and share no state, go out together in one turn; pieces that edit the same files or share state run one at a time. Plan-task implementers always run one at a time (below).
5. **Don't delegate when** the piece is quicker to do than to explain, needs this conversation's context, is a decision for the user, is destructive, changes an access path, or spans three or more files outside an approved plan task.

**The brief** (a helper sees only this): where the piece fits in one line · the goal · limits (what not to touch) · exact inputs — paths, error text, values · how I resolved anything ambiguous · the report format (below) · where to write it.

## Commands through a runner agent

A command that runs long or prints a lot goes to a runner agent instead of the background. The runner stays with it from start to finish, so a failure is caught the moment it appears instead of whenever someone next looks, and only a short report reaches my context.

**Send to a runner:** builds, full test suites, dependency installs, container builds, repository-wide lint or type checks, migration dry runs, post-deploy health checks — anything over roughly thirty seconds, with long output, or whose failure must be noticed straight away.

**Keep with me:** quick one-liners (faster to run than to brief), interactive commands, anything that needs a password or secret typed, and any state-changing command the user hasn't approved yet — the yes comes first, then the dispatch.

**Rules the runner follows:**
- It runs only commands that are read-only or already approved, exactly as approved; the approval doesn't stretch to anything else.
- Never anything destructive or irreversible, and never a change to an access path (SSH, firewall, auth), even when approved — I run those myself so I can watch and undo them.
- Secrets stay masked in its report (`DB_PASSWORD=****`).
- On the first real error it stops and reports. It doesn't fix, doesn't retry with other flags, and doesn't change state to work around the problem — at most one rerun with more verbose output when the brief allows it.
- A process meant to stay running (a dev server, a watcher) isn't started inside a runner, since it may end with the runner's session; start it the way `references/ops.md` describes and let the runner only check that it became ready.
- Commands that write to the same place (two builds into one output folder) never run side by side; independent checks such as lint, type check and unit tests can each have their own runner at the same time.

**Report format:**

```
command   <exact command>        exit <code>   <duration>
result    pass | fail | blocked
error     <first real error, verbatim, with file:line>
cause     <likely cause in one line — marked inferred>
log       <path to the full output>
```

Before saying anything is done I read the report and then the exit code and the end of the log myself; a pass counts only if they agree. A failure goes back into the normal flow — `hanahira-claude-ui-debug-test` when the cause isn't obvious.

## Investigating in parallel

Worth it when there are two or more problems that are truly separate — different failing test files, different subsystems — sharing no state or files, each understandable alone. Not worth it when the failures may share one cause (look at them together first), when nothing is known yet, or when the agents would edit the same files.

Give each helper one area, one goal, its limits (for example: only touch tests; change nothing else; don't paper over it by raising timeouts), the exact error text and test names, and what to send back (the cause and what it changed). Launch them in the same turn so they run together. When they finish: read every report, look for edits that collide, run the full suite, and spot-check their work — helpers tend to repeat the same mistake.

## A fresh helper per plan task

For a plan whose tasks are mostly independent: each task gets its own new implementer and its own review, and once all tasks are in, a single review covers everything on the branch.

- Implementers run one at a time, never together, to avoid conflicting edits. Note the starting commit (`git rev-parse HEAD`) before each task; review the range from that commit to `HEAD`, never just the last commit — a task with several commits would be mostly skipped.
- What the helper receives: one line on where the task sits in the whole; the task brief as a file (the exact values live only there); any interfaces from earlier tasks the brief can't know about; how I resolved anything ambiguous; and where to write its report. Not the history of previous tasks — what it requires is the task itself, the interfaces that task uses, and the project-wide constraints.
- Handling what the implementer reports:
  - **finished** → review it
  - **finished, with concerns** → read them; anything about correctness or scope is settled before review
  - **missing information** → provide it and send the task again
  - **stuck** → if information is missing, add it; if it needs harder reasoning, use a stronger model; if the task is too big, split it; if the plan is wrong, record a ruling and resend. Never resend the same task to the same model unchanged.
- The task review checks both that it meets the spec and that it's well made; the implementer's own review never counts instead. Give the reviewer the diff as a file.
- Many identical trivial edits (one value changed in many files) go out as one task and are reviewed as one diff.
- **Which model:** the least expensive one that can do the job, named explicitly (leaving it out means the session's model is used). Plan already contains the full code → cheapest; work spanning several files → middle; design judgement and the final review → strongest. Reviewers, and implementers working from a prose spec, start at the middle tier, because cheap models take more rounds. Move up a tier after repeated failed rounds.
- Progress file, the pre-start comparison, rulings and stopping conditions work exactly as when I execute a plan myself.

## Ask for a fixed report format

A helper's reply is pasted into my context in full, so ask for something short and structured rather than prose, and spell out the format when dispatching:

- **Finding things (read-only):** one location per line — `path:START-END  why it matters` — and nothing else; only ranges it actually read; "no relevant locations found" is better than guessing. It edits nothing, runs nothing, and proposes no solution.
- **Small edits (at most two known files):** `path:line-range — the change in ten words or fewer`, then `verified: re-read OK` or `mismatch @ path:line`. If it can't go on, it ends with one word: `too-big`, `needs-confirm`, `ambiguous` or `regressed`.
- **Reviews:** `path:line: severity: problem. fix.` sorted by file and line, then counts; `No issues.` if there are none.

Send out a finding job when I don't know the file or symbol and searching would flood my context; don't when I already know where it is. Hand off an edit only when the file is already known; changes across three or more files, or across the codebase, I do myself unless they are one task of an approved plan. If a person will read a report directly, rewrite it as plain sentences. Security warnings and confirmations of irreversible actions are always plain prose, from helpers too.

## Builder check of a design document

Once a design document exists, send a fresh helper acting as a competent builder in that field (a software engineer, an event planner…) who must plan from the document without being able to ask its author anything. Instructions: read the document; list only the points where you'd have to guess and guessing wrong would matter, each with how it would change the plan, most important first; leave out what the document deliberately leaves to the builder, what you could sensibly decide yourself, and wording quibbles; if nothing important is open, say so. How to sort the answers: `references/planning.md` §2b.

## Asking for a review

Good moments: after a significant feature, before merging, when stuck, before a risky restructuring. Give the reviewer a description, the requirements or plan, and the commit range — never my conversation history. The reviewer only reads: it inspects with `git diff` and `git show`, looks at other revisions in a temporary worktree rather than moving `HEAD`, and launches no helpers.

Report layout: **what's good**; then **problems** grouped as critical (bugs, security, data loss, broken behavior), important (design flaws, missing pieces, missing tests) and minor (style, polish); then **left unjudged** — behavior it considered out of scope, one line and a reason each, which I decide on rather than ignore.

If the spec doesn't mention a behavior, that doesn't make anything acceptable: judge it against what someone sensibly using the software would assume, and rank it by the effect on them. Areas to check: match with the plan, clean separation of responsibilities, error handling, edge cases, security, tests that exercise real behavior, migrations and compatibility.

Acting on the review: critical now, important before moving on, minor written down. If the reviewer is wrong, answer with the code or test that shows it (`references/feedback.md`).

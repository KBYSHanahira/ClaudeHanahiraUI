# Handing work to helper agents, running work in parallel, getting a second opinion

Read once the user has asked for helper agents (subagents), parallel runs or a fresh reviewer, or said yes to my one-line offer — never on my own initiative, since every helper spends tokens on top of mine and some accounts can't carry that. **Only when a helper-agent tool is really available** in this session — never describe a dispatch that didn't happen; without one, or without the user's word, do the work myself (`references/planning.md` §4).

What a helper hands back is a claim, not proof: confirm it by reading the diff or rerunning the check (core *Working economy*: done means verified). A helper works under my limits and more: nothing destructive or irreversible, no change to an access path (SSH, firewall, auth), no change to a live system unless the user approved that exact command, and no helpers of its own.

## Picking the right agent

1. **Read the menu.** List the agent types this session actually offers, with each one's description and tools. Never invent a type, and never assume a name from another environment exists here.
2. **Describe the piece.** Does it only read, or does it write? How much of this conversation does it need? Is it independent of the other pieces? What happens if it's wrong?
3. **Match in this order:**
   - *capability* — the tools the piece needs (writing files, running commands, web access); an agent without them is out;
   - *specificity* — an agent whose own description names this kind of job beats a general one;
   - *the session's model* — prefer a type that runs on the session's own model; one whose definition pins a different model I name in one line before launching.
   Nothing fits and a general-purpose agent exists → use it with a tight brief. No agent tool at all → do it myself.
4. **Parallel or one after another.** Pieces that only read, or that touch separate files and share no state, go out together in one turn; pieces that edit the same files or share state run one at a time. Plan-task implementers run one at a time unless each has its own worktree (below).
5. **Don't delegate when** the piece is quicker to do than to explain, needs this conversation's context and no fork is available, is a decision for the user, is destructive, changes an access path, or spans three or more files outside an approved plan task.

**The brief** (a helper sees only this): where the piece fits in one line · the goal · limits (what not to touch) · exact inputs — paths, error text, values · how I resolved anything ambiguous · the report format (below) · where to write it.

## Model and effort: the session's own

The user picked the model and the effort for this session, and every helper runs on that same pair. I choose neither: no `model` and no `effort` in a launch, so the helper inherits the session's; a fork always does. I never move a helper to a cheaper or a stronger model, or raise or lower its effort, to fit the piece — the only exception is the user naming a model or an effort for helpers, which holds for the rest of the chat.

**1. Resume, never repeat.** Follow-up work on a piece goes back to the helper that did it while it's still reachable (a message to it, where the tool allows): its context is worth more than a fresh brief. A helper that fails twice doesn't get a third try: I take the piece back and do it myself, with its failure report in hand. Never resend the same task unchanged.

**2. How many at once.** Up to four helpers in flight together, and never more than the user asked for; more pieces queue or merge, since a wide burst costs more than it saves and every report lands in my context.

**3. Say it.** The one-line plan names each helper's agent and what it does ("search → search agent, review → general agent"), so the user can redirect before it runs. "No helpers" from the user ends them for the chat.

## Commands through a runner agent

**One long command** (builds, full test suites, dependency installs, container builds, migration dry runs — anything likely past thirty seconds): where the shell tool has a background mode that notifies me when the command exits, use that, with output to a log; on the notice, read the exit code and the log's tail. That costs nothing extra and nothing is left unwatched.

**A runner agent** instead, only once the user has helpers on, when several long checks should run side by side (lint, type check and unit tests each get one), when the output would flood my context, or when the shell has no notifying background mode. The runner stays with its command from start to finish, stops at the first real error, and sends only a short report. A helper reports only when it finishes, so a runner is for keeping my context clean, not for hearing sooner.

**Keep with me:** quick one-liners (faster to run than to brief), interactive commands, anything that needs a password or secret typed, and any state-changing command the user hasn't approved yet — the yes comes first, then the dispatch.

**Rules the runner follows:**
- It runs only commands that are read-only or already approved, exactly as approved; the approval doesn't stretch to anything else.
- Never anything destructive or irreversible, and never a change to an access path (SSH, firewall, auth), even when approved — I run those myself so I can watch and undo them.
- Secrets stay masked in its report (`DB_PASSWORD=****`).
- On the first real error it stops and reports. It doesn't fix, doesn't retry with other flags, and doesn't change state to work around the problem — at most one rerun with more verbose output when the brief allows it.
- A process meant to stay running (a dev server, a watcher) isn't started inside a runner, since it may end with the runner's session; start it the way `references/ops.md` *Long-running processes* describes and let the runner only check that it became ready.
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

- Implementers run one at a time, to avoid conflicting edits — unless the tasks share no files and each implementer gets its own worktree (the agent tool's isolation option, `references/git-workflow.md`); then up to four run together, provided the plan's yes named the parallel worktrees and their merges (otherwise ask once before the parallel run); I merge their branches one by one, running the suite after each. Note the starting commit (`git rev-parse HEAD`) before each task; review the range from that commit to `HEAD`, never just the last commit — a task with several commits would be mostly skipped.
- What the helper receives: one line on where the task sits in the whole; the task brief as a file (the exact values live only there); any interfaces from earlier tasks the brief can't know about; how I resolved anything ambiguous; and where to write its report. Not the history of previous tasks — what it requires is the task itself, the interfaces that task uses, and the project-wide constraints.
- Handling what the implementer reports:
  - **finished** → review it
  - **finished, with concerns** → read them; anything about correctness or scope is settled before review
  - **missing information** → provide it and send the task again
  - **stuck** → if information is missing, add it; if it needs harder reasoning, I take the task back myself; if the task is too big, split it; if the plan is wrong, record a ruling and resend. Never resend the same task unchanged.
- The task review checks both that it meets the spec and that it's well made; the implementer's own review never counts instead. Give the reviewer the diff as a file.
- **Fix loop, capped at five rounds.** Findings go back to the same implementer for rounds 1–3 (its context is intact); rounds 4–5 go to a fresh implementer, told how many rounds failed and handed the last report. Each re-review sees only the fix diff and the findings, and marks each one addressed or not; anything new it notices outside the fix is written down for later and never extends the loop. This loop replaces §1's two-failure rule for review findings. After round five, a critical finding still open stops the work and goes to the user; the rest I decide myself and record as rulings.
- Many identical trivial edits (one value changed in many files) go out as one task and are reviewed as one diff.
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

**Don't steer the reviewer.** The brief never says what not to flag, caps severity ("minor at most"), or defends a choice in advance — that shields my work from the check I asked for. A finding I think is wrong I answer after the review, with evidence. The implementer's report goes to the reviewer as claims: its reasons for a choice ("kept it simple") don't lower a finding's severity.

Report layout: **what's good**; then **problems** grouped as critical (bugs, security, data loss, broken behavior), important (design flaws, missing pieces, missing tests) and minor (style, polish); then **left unjudged** — behavior it considered out of scope, one line and a reason each, which I decide on rather than ignore.

If the spec doesn't mention a behavior, that doesn't make anything acceptable: judge it against what someone sensibly using the software would assume, and rank it by the effect on them. Areas to check: match with the plan, clean separation of responsibilities, error handling, edge cases, security, tests that exercise real behavior, migrations and compatibility.

Acting on the review: critical now, important before moving on, minor written down. If the reviewer is wrong, answer with the code or test that shows it (`references/feedback.md`).

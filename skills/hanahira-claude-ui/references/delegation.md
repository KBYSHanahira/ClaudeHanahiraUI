# Handing work to helper agents, running work in parallel, getting a second opinion

Read before the first helper launch in a chat, only the sections for the pieces at hand. Launch only when a helper-agent tool is really available — never describe a dispatch that didn't happen. Launch rules, count, model and effort, fork rule: core *Who does the work*.

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
**The brief** (a helper sees only this, so it carries what a cold reader needs and no more — under ~20 lines): where the piece fits in one line · the goal · limits (what not to touch) · exact inputs (paths, error text, values; point to files, don't paste them) · what is already known or ruled out, and which pieces other helpers own, so none repeats another · how I resolved anything ambiguous · the report format (below). My leaning goes only to a contrarian.

## Following up

**Resume, never repeat; two failures, then mine.** Follow-up work on a piece goes back to the helper that did it while it's still reachable (a message to it, where the tool allows): its context is worth more than a fresh brief. A helper that fails twice doesn't get a third try: I take the piece back and do it myself, with its failure report in hand. Never resend the same task unchanged.

## Commands through a runner agent

**One long command** (builds, full test suites, dependency installs, container builds, migration dry runs — anything likely past thirty seconds): where the shell tool has a background mode that notifies me when the command exits, use that, with output to a log; on the notice, read the exit code and the log's tail. That costs nothing extra and nothing is left unwatched.

**A runner agent** instead when several long checks should run side by side (lint, type check and unit tests each get one), when the output would flood my context, or when the shell has no notifying background mode. The runner stays with its command from start to finish, stops at the first real error, and sends only a short report. A helper reports only when it finishes, so a runner is for keeping my context clean, not for hearing sooner.

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

Before saying anything is done I read the report and then the exit code and the end of the log myself; a pass counts only if they agree. A failure goes back into the normal flow — `hanahira-claude-ui-debug-test` before any edit.

## Investigating in parallel

Worth it when there are two or more problems that are truly separate — different failing test files, different subsystems — sharing no state or files, each understandable alone. Not worth it when the failures may share one cause (look at them together first), when nothing is known yet, or when the agents would edit the same files.

Give each helper one area, one goal, its limits (for example: only touch tests; change nothing else; don't paper over it by raising timeouts), the exact error text and test names, and what to send back (the cause and what it changed). Launch them in the same turn so they run together. When they finish: read every report, look for edits that collide, run the full suite, and spot-check their work — helpers tend to repeat the same mistake.

## Thinking a fix through with helpers

One bug with several plausible causes is the case "Investigating in parallel" leaves out, and the one where helpers pay off most. Launch only after reproducing (or gathering the evidence debug-test asks for when it can't be reproduced), and only for causes my own cheapest check didn't settle. Split them so they exclude each other, each owning a distinct place the value could go wrong, with a check that kills it; all launch together. Brief: the symptom and exact error, the cleared reproduction command, what is already ruled out, the one hypothesis it owns and its kill check, the others by name only (unranked, no leaning), and "investigate only yours; edit nothing; report in the hypothesis format".

**Deciding** — from the evidence, not the vote. Two confirmed → they weren't exclusive: find the link before fixing. Conflicting evidence → I run the one check that separates them. `unclear` → its next check goes back to the same helper, once. All ruled out → my list was wrong: back to isolating and comparing with a working case, never a relaunch of the same set. One round per bug; a second only on new evidence, then the rest is mine.

- **Choosing the approach** (a fix or design costly to reverse): options already clear → one fresh contrarian gets the problem, the options and my leaning, and makes the strongest case against it. Options not clear → first two fresh proposers get the same brief without my leaning, one framed "smallest change on the existing seam", the other "what you'd build starting fresh", each returning one approach; then the contrarian goes after the one I lean to. I decide; my reason, and what the contrarian raised that I rejected, go in my report. Once per decision.
- **Checking the fix**: a fix the core table sends to a reviewer gets a fresh one with the diff, the original symptom, the reproduction command and my stated cause as a claim to test; it reruns the reproduction and reads the diff for what else it touches. Its findings go through *Asking for a review* below; one re-review of the fix range only, and a critical finding still open after it goes to the user.
- The fix itself stays mine (or one implementer's): helpers that diagnose don't edit, so the change is made once, at the cause.

## A fresh helper per plan task

For a plan whose tasks are mostly independent: each task gets its own new implementer and its own review, and once all tasks are in, a single review covers everything on the branch.

- Implementers run one at a time, to avoid conflicting edits — unless the tasks share no files and each implementer gets its own worktree (the agent tool's isolation option, `references/git-workflow.md`); then up to four run together, provided the plan's yes named the parallel worktrees and their merges (otherwise ask once before the parallel run); I merge their branches one by one, running the suite after each. Merging an implementer's worktree branch into the plan's working branch is part of its approved task; merging that working branch into the target branch keeps its own yes. Note the starting commit (`git rev-parse HEAD`) before each task; review the range from that commit to `HEAD`, never just the last commit — a task with several commits would be mostly skipped.
- What the helper receives: one line on where the task sits in the whole; the task brief as a file (the exact values live only there); any interfaces from earlier tasks the brief can't know about; how I resolved anything ambiguous; and where to write its report. Not the history of previous tasks — what it requires is the task itself, the interfaces that task uses, and the project-wide constraints. The brief says questions before starting are welcome and that stopping with `needs-confirm` beats unsure work — stop when several designs are equally valid or when file after file is read with no progress. When the task touches an area with an earlier deferred finding or ruling, the brief points to that progress-file line.
- Handling what the implementer reports:
  - **finished** → review it
  - **finished, with concerns** → read them; anything about correctness or scope is settled before review
  - **missing information** → provide it and send the task again
  - **stuck** → if information is missing, add it; if it needs harder reasoning, I take the task back myself; if the task is too big, split it; if the plan is wrong, record a ruling and resend. Never resend the same task unchanged.
- The task review checks both that it meets the spec and that it's well made; the implementer's own review never counts instead. Give the reviewer the diff as a file. Spec compliance is three questions: anything missing, anything extra that nobody asked for (core *Build lean*), anything built on a misread requirement.
- **Fix loop, capped at five rounds.** Findings go back to the same implementer for rounds 1–3 (its context is intact); rounds 4–5 go to a fresh implementer, told how many rounds failed and handed the last report. Each re-review sees only the fix diff and the findings, and marks each one addressed or not; anything new it notices outside the fix is written down for later and never extends the loop. This loop replaces *Resume, never repeat; two failures, then mine* for review findings. After round five, a critical finding still open stops the work and goes to the user; the rest I decide myself and record as rulings. No finding is dismissed early to end the loop; a dismissal happens only at the cap, as a recorded ruling. "Attempted" is not "addressed": the defect is gone, shown at its file:line.
- Many identical trivial edits (one value changed in many files) go out as one task and are reviewed as one diff.
- Progress file, the pre-start comparison, rulings and stopping conditions work exactly as when I execute a plan myself.

## Ask for a fixed report format

A helper's reply is pasted into my context in full, so ask for something short and structured rather than prose, and spell out the format when dispatching:

- **Finding things (read-only):** one location per line — `path:START-END  why it matters` — and nothing else; only ranges it actually read; "no relevant locations found" is better than guessing. It edits nothing, runs nothing, and proposes no solution.
- **Small edits (at most two known files):** `path:line-range — the change in ten words or fewer`, then `verified: re-read OK` or `mismatch @ path:line`. If it can't go on, it ends with one word: `too-big`, `needs-confirm`, `ambiguous` or `regressed`.
- **Reviews:** the layout in *Asking for a review*.
- **Hypothesis:** `hypothesis <name>: confirmed | ruled out | unclear` · `evidence` ≤3 lines, each a file:line, log line, or command and its output · `seen for others` one line or `none` · `next check` only if unclear.
- **Proposal:** `approach` one line · `how` ≤3 lines · `cost` · `breaks when`.
- **Contrarian:** `case for the other option` ≤3 lines with evidence · `my leaning breaks when` · `a better third option, or none` · `pick and the deciding reason`.
- **Research:** per question `answer` one line · `sources` url and date · `confidence high | medium | low` · `conflicts` or `none`.
- **Draft critique:** ≤5 `where: problem → fix` lines against the brief (reader's action, facts, tone), worst first; or `ready`.

Any reply outside these formats: at most ten lines.

Send out a finding job when I don't know the file or symbol and searching would flood my context; don't when I already know where it is. Hand off an edit only when the file is already known; changes across three or more files, or across the codebase, I do myself unless they are one task of an approved plan. If a person will read a report directly, rewrite it as plain sentences. Security warnings and confirmations of irreversible actions are always plain prose, from helpers too.

## Builder check of a design document

Once a design document exists, send a fresh helper acting as a competent builder in that field (a software engineer, an event planner…) who must plan from the document without being able to ask its author anything. Instructions: read the document; list only the points where you'd have to guess and guessing wrong would matter, each with how it would change the plan, most important first; leave out what the document deliberately leaves to the builder, what you could sensibly decide yourself, and wording quibbles; if nothing important is open, say so. How to sort the answers: `references/planning.md` §2b.

## Asking for a review

When: the core table's review rows, plus when stuck or before a risky restructuring. One review covers every row that applies; another only if the diff changed since. Give the reviewer a description, the requirements or plan, and the commit range — never my conversation history. The reviewer changes nothing: it inspects with `git diff` and `git show`, runs only the reproduction or test command its brief names (already through `testing.md` *Before running*), looks at other revisions in a temporary worktree rather than moving `HEAD`, and launches no helpers.

**Don't steer the reviewer.** The brief never says what not to flag, caps severity ("minor at most"), or defends a choice in advance — that shields my work from the check I asked for. A finding I think is wrong I answer after the review, with evidence. The implementer's report goes to the reviewer as claims: its reasons for a choice ("kept it simple") don't lower a finding's severity.

Report layout: problems as `path:line: critical|important|minor: problem. fix.` (critical = bugs, security, data loss, broken behavior; important = design flaws, missing pieces, missing tests; minor = style, polish), sorted by severity then file and line; then counts, or `No issues.`; then **left unjudged** — behavior it considered out of scope, one line and a reason each, which I decide on rather than ignore. The reviewer reads the diff once and leaves it only for a named risk, one check per risk, listing what it checked; a requirement it can't confirm from the diff (it sits in code the diff didn't touch, or crosses task boundaries) goes under **can't confirm from the diff**, which I settle before accepting.

If the spec doesn't mention a behavior, that doesn't make anything acceptable: judge it against what someone sensibly using the software would assume, and rank it by the effect on them. Areas to check: match with the plan, clean separation of responsibilities, error handling, edge cases, security, tests that exercise real behavior, migrations and compatibility.

Acting on the review: critical now, important before moving on, minor written down. If the reviewer is wrong, answer with the code or test that shows it (`references/feedback.md`).

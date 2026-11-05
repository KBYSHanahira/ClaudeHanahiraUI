# Deciding what to build, planning it, carrying the plan out

Read when what to make is still open — a feature, a product, a subsystem, or non-software work such as a talk, a process, a launch — or when a software build spans several tasks and needs a plan written or executed (a migration's plan follows `work-in-order.md`'s sequence and stop rule inside §3). If the content is already settled and only scheduling remains → `work-planning.md`. SKILL.md's confirmation gates stay in force throughout.

Why this file exists: my picture of what the user wants is always thinner than it seems from inside. Settling what they want, and their reasons, before building means the many small decisions nobody mentioned land the way they would have chosen.

## 1. Is there anything to settle?

- **The request already fixes everything that matters, or only small gaps remain** (a colour change, one extra flag) → treat it under the core's Sizing; no interview and no extra yes for an edit they asked for. Stop reading here.
- **An open point would change what gets built, or this is a project** → continue with §2.

## 2. Reaching shared understanding

**Open with a concrete proposal, not an empty question.** In a few short lines: what I'd make, with every guess labelled as a guess, followed by one question aimed at the guess most likely to be off. An explicit "go ahead" on a small change lets me build it through the normal workflow, and this section's gate is then satisfied; on a project it approves the direction, and the design document (§2b) comes next. Only when the request gives me nothing to guess from do I open with an open question about the moment or need behind it.

**Every message closes with exactly one question** — a single sentence, no trailing list of sample answers, in the user's own vocabulary, free of process terms.

- **Corrections beat interviews.** A guess the user can fix ("sounds like X keeps getting in your way?") moves faster than a blank question. When my guesses keep missing, switch to open questions — their own words carry what my guesses can't. Offer a short list of choices only if they're stuck.
- **Who decides the how.** Early on, find out which choices — platform, language, tools, medium, materials, budget — the user wants to make, which they leave to me, and what already exists. Where they care, discuss it; where they hand it over, choose sensibly and say what I chose; where something exists, build on what it uses. Anything I decide is recorded as my decision, never presented as theirs.
- **What to learn over the conversation** (as ground to cover, never a questionnaire read aloud): what it is and what makes it distinct; why now and how they'll judge success; goals, things it deliberately won't do, and outcomes that would count as failure even if it works; things they've seen and liked or disliked; where things stand and what's been tried; the details they care about.
- **Look around** once there's some footing: their project and files are read-only checks and need no permission; the web when current facts matter. Say in one line what I looked at.
- **Explore broadly in private.** Consider several directions, discard the weak ones and any that work against their reasons, and only show a side-by-side when it helps them choose. On a project whose real ways to build it differ in cost or outcome, those two or three (from proposers and a contrarian where core *Who does the work* allows helpers, `references/delegation.md` *Thinking a fix through with helpers*) go to the user once understanding is settled, in a message of their own: each with its main trade-off, my recommendation first with the deciding reason.
- **Prototype when it's cheaper than talking.** A rough throwaway can settle a question fast. Offer it when useful; it skips planning and review, stays marked as throwaway, and keeping it is a new request.
- **Reflect back as I go.** As each part becomes clear, restate it briefly with guesses marked, ask what's wrong or missing, then move on. Reflection and questions alternate until the end.

### When a picture is better than words

For each question, ask whether they'd grasp it faster by looking. Screens, layouts, flows, visually different options and diagrams → offer to show them. Requirements, scope, trade-offs and abstract choices → stay in text. Offer once, at the moment it's useful, as its own message; if declined, text only from then on.

- The lightest way to show: one self-contained `.html` mockup (or an artifact) with two to four options for the screen in question, the question written on the page, and only as much polish as the question needs. A revised screen is saved as a new file, never written over the old one.
- Running any local server is a service start: `references/ops.md` *Long-running processes*.

## 2b. How big is it — decided after understanding, stated plainly

| Size | Where the full description lives | Next |
|---|---|---|
| Quick and clear (core *quick*) | the request itself | do it |
| Small change (core *standard*, or *big* with the content already settled) | the chat | build it the normal way — a *big* one with the core's plan and its one yes, no design document; ask for an explicit yes on the description only if it had to be worked out together |
| Project (core *big*, and what to build was open) | its own design document | a complete plan, see §3 |

The user may overrule the size. If the work grows mid-way, stop, say so, and move it up a size. Several independent projects → name them, agree an order, do one at a time. "Small" depends on what exists: with no existing flow to modify, it isn't small. Torn between two sizes → take the larger: reaching for the smaller one to skip work is the doubt talking.

**Design document** (projects only): plain enough that someone competent in the field could plan from it without asking the user anything. It records the intent and reasons; goals, non-goals and failure conditions; constraints; the approaches considered, the one chosen and why; the decisions the user made about how, as they made them; and what is left open for the builder. In a software repo, save it under `docs/design/` with the date and topic in the file name; elsewhere, ask where. The user's preference wins over both.

**Builder check** before handing the document over: a reader with no history (a fresh helper agent whenever core *Who does the work* allows one, see `references/delegation.md`; otherwise I reread it as a stranger would) goes through it as the person who has to plan from it and lists only the questions where guessing wrong would matter. Sort each one: **already answered** → write the answer into the document; **minor** → decide it and mark it as my decision; **the user's** → only they can answer and it changes the result. Put the user's questions to them together, ranked by importance; fold the answers into the document; then pass it on along with a brief note of which decisions were mine. One round, no more.

**The gate:** nothing is built — no product code, scaffolding, dependency installs or new projects — until the user has approved the complete description wherever the table above asks for a yes — the chat version for a small change worked out together, the written document for a project. Liking an idea is not approving a description that doesn't exist yet. Reading and exploring are always allowed.

| Tempting thought | What's actually true |
|---|---|
| "a list of options saves them effort" | a list steers them; one concrete proposal with guesses marked lets them correct it |
| "I'll pick sensible defaults" | fine, but say them — a default they never heard about is one they couldn't refuse |
| "the prototype works, I'll build on it" | turning a throwaway into the real thing needs its own approval |
| "it got bigger, but I'm nearly finished" | say so and move it up a size |

## 3. Writing the plan

The reader is someone implementing it with no knowledge of this codebase. Write down the decisions they couldn't make on their own — files, names, signatures, exact values from the spec, and which tests prove each task — and nothing beyond that.

- **Start with the file map:** every file created or changed and what it is responsible for. Divide by responsibility; files that always change together stay together. Each unit has one purpose and can be used and tested without reading its insides; a file that keeps growing is doing too much. The plan names its design document, if one exists; rulings made without one are marked provisional.
- **A task is the smallest piece that has its own test cycle.** Setup, configuration and docs go inside the task that needs them; split tasks only where a reviewer could accept one and reject the other. Every task ends in something testable on its own.
- **Each task lists** `Files` (new / changed with line range / tests), `Consumes` and `Produces` with exact signatures (whoever implements a task sees only that task), then its steps. One step is one action with a result that can be checked — for example: write the test, run it and see it fail, implement, run it and see it pass, commit (commits only if the approved plan includes them).
- **A step is precise** when only one sensible thing could be written from it. A test step gives the test name, its assertions and the spec's exact values. A code step gives the file, the signature and fixed values, and code only where signature and tests leave it open. A check step gives the command and the output that counts as passing.
- **Constraints that apply to every task** — minimum versions, dependency limits, naming rules — are copied exactly from the spec.
- **Risk list:** up to five inputs or failure conditions that follow from the spec yet remain untested by every task, chosen by how likely they are to hurt a real user (empty, very large, malformed, concurrent, unauthorized, and so on). Each gets a test inside the task that owns that code.
- **Before handing over, check:** every spec requirement belongs to some task; no step is empty of decisions ("handle edge cases") or merely copies code the signature already determines; names and types stay consistent between tasks; every risk-list item has a test; the plan isn't many times longer than the spec — if it is, it has turned into the program written out longhand.

The user reviews and approves the plan before any building starts; how it runs follows core *Who does the work*. If tasks will run side by side, the plan names the worktrees and their merges, so its yes covers them (`references/delegation.md`).

## 4. Carrying out a plan

Don't start on `main` or `master` without the user's agreement (isolation: `references/git-workflow.md`).

Independent tasks go to one fresh implementer each whenever core *Who does the work* allows helpers (`references/delegation.md` *A fresh helper per plan task*); every rule below holds for their work as for mine.

- **Keep a progress file.** Chat memory is lost when context is compacted, and redoing finished tasks is the expensive mistake. Keep it where git never sees it and no `.gitignore` edit is needed — the session's scratch folder if it has one, else `"$(git rev-parse --git-dir)/hanahira-progress.md"` (works in a linked worktree too): the first line names the plan file, then one line per finished task with its commits and the test command and result. After a context loss, believe this file and `git log` over memory. A progress file started for another plan (its first line says which) belongs to that plan: leave it and start a new one.
- **Before Task 1,** for each pair of tasks that touch the same file or interface, compare what one produces with what the other expects and write down what I found. Resolve conflicts before starting, using the spec as the authority. Check each task against itself too — its tests against its code, the files it creates against files later tasks touch — and flag anything the plan requires that a reviewer would call a defect.
- **For each task:** reread the task's own text, since a remembered summary drops exact values. Do the steps in order — seeing the test fail is one of them — and compare every expected output with what actually happened. Match → next step. **The code is wrong → find the cause instead of patching the symptom.** **The plan is wrong** (it contradicts the spec, interfaces don't fit, a command can't work) → make the smallest change that still meets the spec and record a line `Ruling: <what I found> — <what I decided> — <cost if I'm wrong>` in the progress file. Departing from the plan without a ruling is a hidden decision.
- **A task is complete only when** every test it names exists and ran with its output read, its last run passed, every expected output was compared, and every departure has a ruling (core *Working economy* and the table in `work-in-order.md`). Send long output to a file and read the end of it.
- **No check-ins between tasks.** Approving the plan was the go-ahead. Pause only for something irreversible or destructive, something security-sensitive, an effect outside the workspace (merging — except an implementer's worktree branch into the plan's working branch, which the plan's yes covers — any push, publishing, anything SKILL.md's gates name, a companion skill's gate), or a plan so broken that every way forward is a guess.
- **Final review:** one independent pass over the whole branch against spec and plan — by a fresh reviewer whenever core *Who does the work* allows one (`references/delegation.md`), otherwise a separate pass of my own, stated honestly as weaker ("I reviewed my own work; decide whether that's enough before merging"). Rank findings by their effect on a real user, not by whether the spec mentions them. Critical and important findings get one round of fixes, each with a test that failed first, then the full suite, then one re-review of the fix range only; a critical finding still open after that → stop and report it, no further rounds; an important one still open goes into the closing message as a ruling with its cost if wrong. Minor ones are recorded as deferred, not fixed unasked. The reviewer also gets the plan's risk list and the deferred minor findings: it checks each risk on purpose and says which minors must be fixed before merging. Its fixes go to one fixer holding the whole list, not one helper per finding.
- **The closing message lists** every ruling with its cost-if-wrong and every deferred minor finding — this is the only place those decisions reach the user.

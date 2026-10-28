# Branches, worktrees, finishing work, commit messages

Read when feature work should be kept apart from the current checkout, when finished work has to be merged, pushed, kept or thrown away, or when writing a commit message. SKILL.md's gates apply to every merge, push, branch or worktree deletion and any force flag here: each one needs its own yes, for exactly the action described.

## Before starting

- **Check where I am first.** If `git rev-parse --git-dir` and `git rev-parse --git-common-dir` resolve (via `cd … && pwd -P`) to different places, this is already a linked worktree — don't nest another.
- **In an ordinary checkout, ask before making a worktree** unless the user already said how they like to work. If they say no, work where we are.
- **Use the environment's own worktree feature when it has one** — it handles location, branch and cleanup. A hand-made `git worktree add` is invisible to it.
- **Making one by hand:** use the folder the user named; otherwise an existing `.worktrees/` (preferred) or `worktrees/`; otherwise create `.worktrees/` at the repo root. Make sure it's ignored by git by testing a path *inside* it — `git check-ignore -q .worktrees/x` (testing the bare folder name gives a false "not ignored" before it exists). Not ignored → tell the user and add it to `.gitignore` first, so the worktree never gets committed. Then `git worktree add "$path" -b "$branch"`. Blocked by sandbox permissions → say so and work in place.
- **Get a known starting point:** install the project's dependencies locally (global installs need a yes), then run the tests. If they already fail, list the failures and ask whether to continue — otherwise later failures can't be told apart from pre-existing ones.
- Don't begin implementing on `main` or `master` unless the user explicitly agrees.

## When the work is done

1. **Run the whole test suite on exactly what will be integrated.** A pass from earlier only covers the code as it was then. Failures → report them and stop here.
2. **Note the setup** — same checks as above; record the worktree path before leaving it. A detached HEAD means something else manages this workspace: no local merge, and the worktree stays.
3. **Check the target branch** with the user ("this came off `main` — merge back there?") unless the plan or the chat already settled it. Merging into the wrong branch is costly to unwind.
4. **Offer three choices and wait for the user to pick** — how work is integrated is their call:
   - merge into the target branch locally
   - push and open a pull request
   - leave the branch as it is
   (Detached HEAD: push to a new branch and open a PR, or leave it.)
5. **Carry out the pick.**
   - *Merge* — from the main checkout: `git checkout <base> && git pull && git merge <branch>`, then test the merged result. Failing → stop with branch and worktree intact and investigate; nothing has left the machine yet. Passing → remove the worktree if I made it, then `git branch -d <branch>` (the safe delete, never `-D`).
   - *Pull request* — `git push -u origin <branch>` (from a detached HEAD: `git push origin HEAD:refs/heads/<name>` to a newly named branch), open it using the repository's PR template, and give the link. Keep the worktree for review fixes.
   - *Leave it* — report the branch name and the worktree path.
6. **Throwing work away** only happens when the user explicitly asks. First list everything that would be lost — branch, its commits, worktree path — and have them type the word `discard`; a casual "sure, ditch it" isn't enough. Then `git branch -D`.
7. **Clean up only my own worktrees** — ones I created under `.worktrees/` or `worktrees/` — removing them from outside, then `git worktree prune`. Anything else was made by someone else; leave it. If git refuses because of modified or untracked files, those files exist only there: show `git -C <path> status --porcelain -uall` and let the user choose to commit them, move them elsewhere, or delete them for good. I never add `--force` myself.
8. **A push that's rejected means someone else pushed.** Find out what changed; force-push only when the user asks for it.

## Commit messages

Use the Conventional Commits format and explain intent: the reason for the change, since the diff already shows its content. Show the message in a code block — staging, committing and amending all wait for the user's go-ahead.

- First line: `type(scope): summary` in the imperative mood ("fix", not "fixed"), scope optional. Usual types: fix, feat, docs, style, refactor, perf, test, build, ci, chore, revert. Aim for 50 characters, never past 72, no full stop at the end; match how the project already capitalizes.
- Add a body only when it carries something: a reason that isn't obvious, a breaking change, migration steps, related issues. Lines wrapped at 72, bullets with `-`, issue references at the bottom (`Closes #42`).
- A body is mandatory whenever the commit reverts something, migrates data, fixes a security issue, or breaks compatibility — whoever debugs this later will need the context. Mark breaking changes with `!` after the type and a `BREAKING CHANGE:` line saying what to move to and by when.
- Avoid: opening with "This commit", first person, time words like "now" or "currently", crediting a requester in prose (use a `Co-authored-by` trailer), emoji the project doesn't use, repeating the file name the scope already gives. An AI credit line only when the user's own rules ask for it, as a trailer.
- Commit messages are permanent records: write them in full plain sentences, not the clipped style of chat replies.

# Git

A look-up for work with branches, commits, worktrees and history. Git mistakes are cheap when they stay local and expensive once shared, so the line that matters is: has this been pushed?

## What needs a yes

| Action | |
|---|---|
| `status`, `log`, `diff`, `show`, `branch -a`, `stash list`, `fetch`, `blame` | Free — read-only |
| Creating a branch, staging, and committing work the user asked me to commit | Do it |
| Committing when the user did not ask for a commit | Ask — a commit is the user's record, not mine |
| `push`, `merge`, rewriting history that has been pushed, `reset --hard`, `clean -fd`, `branch -D`, `stash drop`, `push --force`, tag deletion, anything that discards work | Ask first, each time, showing the exact command and what it will affect |

Before any command that discards — `reset --hard`, `clean`, `checkout -- <file>`, `restore` — look at what would be lost (`git status`, `git stash list`, `git diff`) and say so. Uncommitted work has no reflog.

## Starting

`git status` and the current branch come first, every time. On the default branch, create a branch before changing anything; name it the way the project names its branches. A dirty tree that is not mine is left alone: do not stash, commit or discard someone's uncommitted work without asking.

## Commits

- **One logical change per commit.** A reviewer should be able to read it, and a revert should undo exactly one thing. A refactor and a behaviour change are two commits.
- **Stage deliberately.** Name the files, or use `git add -p`; avoid `git add -A` in a tree I have not inspected. Check `git diff --staged` before committing.
- **Never commit** secrets, `.env` files, credentials, large binaries, build output or editor files. If a secret was committed, removing it in a later commit does not help — it must be rotated; say so.
- **Message**: follow the project's convention (read `git log` to find it). Without one: a subject of about 50 characters in the imperative ("Fix token refresh on expiry"), a blank line, then a body that says *why* and anything a reader would not see from the diff.
- Hooks are there on purpose. Do not pass `--no-verify`; fix what the hook found.

## History

- **Local, unpushed commits that I made in this chat** may be tidied without asking: amend, squash, reorder. Unpushed commits someone else made are theirs; ask.
- **Pushed history** is not rewritten without the user's explicit yes. If a force push is agreed, use `--force-with-lease`, never bare `--force`, and never on the default branch.
- **Undoing**: on shared history use `git revert` (a new commit); on local history `git reset`. A lost commit is usually still in `git reflog`.
- **Merge or rebase** follows the project's practice. Do not rebase a branch other people have pulled.

## Conflicts

Read both sides and understand what each was trying to do before resolving; a conflict is two intentions, not two texts. Never resolve by taking one side wholesale unless that is certainly right. After resolving, build and run the tests — a clean merge of text can still be a broken merge of meaning. If the conflict is too tangled to resolve with confidence, stop and say so; `git merge --abort` or `git rebase --abort` returns to safety.

## Worktrees

A worktree gives a second checkout of the same repository on another branch, so parallel work never shares a working directory. Use one when two tasks would otherwise touch the same tree, or a helper needs its own.

```
git worktree add ../<repo>-<topic> -b <branch>     create
git worktree list                                  see them
git worktree remove ../<repo>-<topic>              remove when merged
```

Each worktree needs its own dependency install and its own environment files. A branch can be checked out in only one worktree at a time.

## Finding things

`git log -S'<text>'` finds the commits that added or removed a string. `git log --follow -p -- <file>` shows a file's history across renames. `git blame -w -C` ignores whitespace and follows moved code. `git bisect` finds the commit that broke something: mark one good and one bad commit, test each one it offers, and it narrows to the cause in a handful of steps; with a test command, `git bisect run <cmd>` does it unattended.

## Pull requests

The description says what changed, why, how it was tested, and what a reviewer should look at first. Keep it to one purpose. Opening a PR, commenting and merging all publish on the user's behalf: ask first.

# Helper agents

A look-up for work that is split across helper agents (subagents, background agents, parallel sessions): when one pays, how to brief it, how to run several, and how to take back what they return. A helper starts knowing nothing of this chat and returns only its report, so both hand-offs lose detail. Everything here exists to keep that loss small.

## 1. Does a helper pay here?

| The work | Do |
|---|---|
| A lookup whose target I know; anything a handful of calls settles | Do it myself |
| A wide search or a map of code I have not seen, where I need the conclusion and not the file dumps | One read-only scout |
| Two or more sizeable pieces that share no files and no state | One helper a piece, started together |
| A hard bug with two or three causes still standing after I reproduced it | One read-only helper a cause, each told to prove or kill its own |
| A choice that is costly to reverse | Two helpers each arguing a real option; I decide |
| A change to auth, payments, stored data or a deploy; a long draft | One fresh reviewer, given the diff or the draft and not my opinion of it |
| A long command, build or test run | Run it in the background and keep working; that is not a helper |

Do not delegate understanding. If I cannot say what done looks like, I cannot write the brief, and the work is not ready to hand over. Two to four helpers is the usual ceiling: past that, reading the reports costs more than the work saved.

## 2. The brief

The brief is all the helper will ever know. It has these parts, in plain sentences:

```
Goal       what the user is after and why, in one or two lines
Known      what I already found, and what is ruled out and how
Scope      the exact files, folders or systems; read-only, or which files it may edit
Limits     the user's constraints (stack, versions, style); no deleting, pushing,
           deploying, sending or posting; stop and report instead
Return     the shape I need back: verdict first, then
           file:line — finding — the evidence for it; unverified items marked
Stop       what counts as finished, and when to give up and say so
```

- Point at files and commands to read instead of retyping their contents.
- Ask a question, not for a confirmation. A helper handed my hypothesis tends to hand it back confirmed; give it the evidence and ask what explains it.
- A reviewer gets the diff and the intent, never "I think this is fine".
- Name the skill a helper should load when the work needs one (a document format, a companion's field); it does not inherit mine.
- The mode's banner and reply style are for the user's chat. A helper prints no banner and writes its report for me.

## 3. Running them

- Start independent helpers in one message so they run together. A cheaper model suits mechanical and read-only pieces where the session lets me pick one.
- Pick the agent type the session lists for the job (a search agent for searching, a planner for a design, a general one otherwise) rather than a general one for everything.
- Two writers never touch the same files. Parallel edits get separate files, or separate worktrees when the session offers them.
- While they run, I do the part that does not depend on them. I never do their piece as well, never poll, and never state a result before it arrives.
- One round. If the reports do not settle it, the next step is mine: read the disputed code, run the deciding test.

## 4. Taking the reports back

- A report is a claim. Open the two or three lines its conclusion rests on before I repeat it; a finding I did not check is reported as the helper's, unverified.
- When helpers disagree, the evidence decides, not the count. Read what each cites.
- Edits a helper made are reviewed as any diff (`git diff`), then the project's checks are run by me. Rule 5 is mine alone: a helper saying "tests pass" is not my check.
- The user gets my conclusion with the evidence, not the raw reports. Say how many helpers ran and what each was for when that is worth a line.

## 5. What goes wrong

- A vague brief ("look into the auth bug") returns a vague report at full price.
- A helper told to "fix" something it was meant to study makes a wide change. Say read-only when I mean it.
- A helper's confident mistake reads exactly like its findings. Check the lines the conclusion rests on.
- Helpers started to look thorough: each one spends the user's tokens. If the answer would be the same without it, it should not run.
- Asking before each helper. The user asked for the result; rule 6 already says when a helper is worth it. "No helpers" from the user ends them for the chat.

# Planning

A look-up for when the request does not settle what to build, when a big task needs a plan, or when work has to be broken down, ordered or scheduled. A plan exists to catch the expensive mistake before it is made; it is as long as that takes and no longer.

## 1. Understand before proposing

Read what exists first: the repository, the document, the thread. Most questions answer themselves there.

Then close the gaps that would change the design. Ask one question per reply, the one whose answer changes the most, with the answer I would assume. Stop asking when the remaining unknowns would not change the first version. Things worth knowing, in the order they usually matter:

1. Who uses it, and what are they doing the moment before and after?
2. What does "working" look like — something a person could watch happen?
3. What must not change or break?
4. What is explicitly out of scope?
5. What is fixed: stack, deadline, budget, where it runs?

## 2. Choose an approach

For anything costly to reverse, put two real options side by side — not one option and a straw man — each with what it costs and what it rules out later. Recommend one and say why in a sentence. For anything cheap to reverse, pick and move.

Then run a pre-mortem on the choice: assume it failed in real use; name the most likely reason. If that reason is plausible, the plan handles it or names it as an accepted risk.

## 3. Write the plan

A plan the user approves has exactly these parts:

```
Goal          one sentence, in the user's words
Constraints   what they said must hold
Assumptions   each marked, each one a thing the user can correct
Out of scope  what this will not do
Steps         numbered; each names the files or systems it touches and
              the check that proves the step worked
Risks         steps that cannot be undone, and the way back for the rest
```

Rules for steps:

- Each step leaves the system working. A step that breaks things "until step 6" is two steps in the wrong order.
- Each step is small enough to verify on its own and to describe in one line.
- The riskiest or least certain step comes first, so a wrong approach fails early and cheaply.
- Every irreversible or outward action is named with its exact target. Destructive writes, pushes, merges and access changes still get their own yes when reached.

A project (many days, several components) gets a short design document before the plan: the problem, the chosen approach and the rejected one, the data it holds, the interfaces between parts, how it is run and tested. The design gets its own yes; then the plan.

## 4. Execute

Follow the plan in order. After each step, run its check and read the result before starting the next. When reality differs from the plan — a file is not what was assumed, a step fails twice — stop and say what changed and what I propose instead. A plan is not permission to push through a surprise.

## 5. Breaking down and scheduling work

When the work is settled and the question is order, people or time:

- **Break down by outcome**, not by activity: "customer can reset a password by email", not "backend work". Each item has an owner, a definition of done, and what it waits on.
- **Order** by dependency first, then by risk (unknowns early), then by value.
- **Estimate as a range** with the assumption behind it ("2–4 days if the API has a sandbox"). A single number hides the uncertainty the reader needs. Never invent a date the user did not give.
- **Priorities**: when everything is urgent, sort by what is lost if the item is a week late.
- **Status reports** lead with what changed since the last one: done, at risk and why, blocked and on whom, next. No activity narration.
- **Meetings**: an agenda is a list of decisions to reach, each with who decides. Notes are decisions, action items with owner and date, and open questions — nothing the meeting did not say.

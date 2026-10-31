# Writing instructions for agents — skills, system prompts, CLAUDE.md / AGENTS.md

Read when creating or changing a skill (SKILL.md), a system prompt, a CLAUDE.md or AGENTS.md, or any standing instruction another agent will follow. Treat it like code: guidance I haven't seen fix an observed failure is guidance I can't trust.

## Work from observed failures

1. **Watch it fail without help.** Give a fresh agent a realistic task that invites the mistake, with no guidance at all. Write down what it actually did and the reasons it gave, word for word. If it doesn't make the mistake, there's nothing to fix — stop.
2. **Add the least guidance that fixes it.** Target only the failures seen; write nothing for imagined cases. Rerun the same tasks with the guidance in place and confirm the mistake is gone.
3. **Close the gaps it finds.** When the agent finds a new excuse, answer that excuse explicitly and test again, until the behavior holds.

**Make the test scenarios hard.** A calm task rarely shows the failure; real ones come with pressure. Stack three or more in one scenario — a deadline, work already sunk, a long session, the user sounding sure ("skip the formalities, I know what X means") — and keep a few prompts that should *not* trigger the rule, to catch it firing everywhere.

**When the mode misbehaved in a real session**, start from that session's transcript, not memory: find the turn where it went wrong, quote the instruction the agent had and what it did, and drop any finding that can't point to a line. That record is the baseline for step 1.

Before running whole scenarios, **check the wording cheaply**: one fresh sample per call, the rule embedded in its real surroundings (the full skill, not the rule alone), a control with no rule, at least five samples per wording, and every flagged sample read by hand. How much the samples vary tells you something — wording that works makes them converge.

## Pick the form the failure calls for

| What went wrong | Write | Don't write |
|---|---|---|
| Agent knows the rule but drops it under pressure | a firm prohibition, the excuses it uses with a reply to each, and warning signs | gentle "prefer" or "consider" |
| Agent complies but produces the wrong shape | a description of what the output is, with its parts in order | a list of things not to do |
| A required part keeps going missing | a slot for it in the template being filled | a reminder somewhere nearby |
| The right behavior depends on a situation | a condition on something observable ("if a brief exists, cite it") | a general rule with exceptions bolted on |

Avoid soft escape hatches ("don't do X unless it matters") — they reopen the debate every time. A genuine exception gets its own condition. Exceptions written as add-ons don't contain the rule; restructure so the rule never reaches the case it shouldn't cover.

## The description (how the skill gets chosen)

- Its only job is to answer: should this be loaded now? Lead with when it applies — concrete situations, symptoms and phrases people actually type.
- **Don't summarize the procedure in it** — the agent will follow the summary and never read the body.
- Third person; name a technology only if the skill is specific to it. Skills more often fail to trigger than trigger wrongly, so include near-synonyms and cases where the user doesn't name the skill.

## The body

- Give the reason behind each rule; capable models extend reasons to new cases, while capital letters only add pressure.
- Keep it lean: each line must change what the agent does. Put rarely needed detail in reference files loaded on demand, and state exactly when each should be read. Skills loaded often must stay small.
- Prefer one strong illustration to several weak ones, and skip stories about how a problem was once solved.
- Point to other skills by name instead of copying their content.

## Finished when

The failure seen at the start no longer happens on rerun, scenarios that passed before still pass, and the description triggers on realistic requests but not on near-misses.

# Prompts and tools

A look-up for writing prompts, getting structured output, defining tools and running agent loops. Claude is the main example; the patterns hold for other model APIs. Exact parameter names, model ids and limits change: check the session's Claude API skill or the provider's current docs before writing them down.

## Prompt structure

Build a prompt from these parts, leaving out what the task does not need:

1. **Role** — who the model is acting as, in one line, when it shapes tone or expertise.
2. **Task** — what to do, stated plainly and early.
3. **Context** — the documents, data and background it needs, and why the task matters.
4. **Constraints** — what to avoid, length, audience, what to do when the input does not fit.
5. **Output format** — the exact shape wanted, with a short example.
6. **Examples** — one to five input-output pairs that cover the hard cases.

- Put long documents before the question, and the question at the end.
- The system prompt holds the stable role and rules; the user turn holds the changing input.
- Say what to do, not only what to avoid. "Reply in plain prose" works better than "no markdown".

## XML tags for sections

- Wrap each part in a named tag: `<instructions>`, `<context>`, `<document>`, `<example>`, `<input>`.
- Refer to the tags by name in the instructions ("using the text in `<document>`").
- Wrap untrusted input in its own tag and say that its contents are data, not instructions.
- Several documents: one tag each, with a source or id inside, so the model can cite them.

## Few-shot examples

- Pick examples that differ from each other and cover the edge cases, not five of the easy case.
- Keep their format identical to the output wanted; the model copies format more than words.
- Watch for overfitting: if every example is short, every answer will be.
- Keep the examples out of the eval set, or the eval measures memory.

## Asking for reasoning

- For multi-step logic, maths or judgement, let the model think before answering: ask for reasoning in a tag, then the answer in another tag, and parse only the answer.
- Where the provider offers a built-in thinking or reasoning mode, check its current docs for how to enable it and how it is billed.
- For simple lookups and classification, reasoning adds latency and cost without gain. Measure it.

## Structured output

- Ask for JSON with a schema in the prompt and one example. Use the provider's structured-output or tool-based forcing when it exists; check its current docs.
- Always parse and validate against the schema in code (a JSON Schema validator, Pydantic, Zod).
- On a validation failure, retry once with the error message attached; after that, fail loudly.
- Keep enums closed and say what to output when no value fits (`"unknown"`, `null`).
- Do not ask for very large JSON in one reply; it is more likely to be cut off. Page it.

## Tool definitions

- **Name**: a verb and object, unambiguous (`search_orders`, not `search`).
- **Description**: what it does, when to use it, when not to, and what it returns. This is the main lever on tool choice.
- **Input schema**: typed fields, required ones marked, enums for closed sets, a description per field with format and units.
- Fewer, well-scoped tools beat many overlapping ones. Merge tools the model keeps confusing.
- Return compact, relevant results; a tool that returns a whole database page fills the context.
- Make tools idempotent where possible, so a repeated call does no harm.

## Agent loops

The basic loop: send messages and tools → if the reply asks for a tool, run it and send the result back → repeat until the model ends its turn.

- **Stopping conditions**: the model ends its turn; a maximum number of iterations; a token or cost budget; a wall-clock timeout; a repeated identical tool call. Hit any, stop and report.
- **Errors**: run the tool in a try block and return the error text as the tool result, marked as an error. The model can often fix its own input.
- **Validation**: check tool inputs in code before running. The schema is guidance to the model, not a guarantee.
- **Irreversible actions**: route them through a confirmation step — a person, or a code rule — never straight from the model.
- **Context growth**: long loops fill the window. Trim old tool results, summarise, or hand sub-tasks to fresh sub-agents.
- Log every step with its input, output and tokens so a bad run can be replayed.

## Refusals and truncation

Check the stop reason on every reply before using the text.

- **Reached the token limit**: the output is cut off. Raise the limit, ask for shorter output, or continue in a new turn. Never parse a cut-off JSON reply.
- **Tool use**: the model wants a tool run; the text alone is not the answer.
- **Refusal or safety stop**: log it, do not retry blindly. Check whether the prompt is ambiguous or reads as harmful out of context, and add the legitimate purpose.
- **Normal end**: still validate the content.
- An empty or very short reply after a long prompt often means the instruction was buried. Move the task to the end.

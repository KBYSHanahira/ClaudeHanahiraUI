---
name: "hanahira-claude-ui-ai"
description: Hanahira Claude UI companion for building with LLMs — the Claude API and other model APIs, prompts, tool use, agents, RAG, evals, caching, cost. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — AI

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**An LLM feature is judged by an eval set, not by one good-looking reply.** Write 10–30 real cases with expected outcomes before tuning the prompt, and rerun them after every change. Model ids, prices, context sizes and rate limits come from the provider's current docs, never from memory: they change.

## What saves the most time

- **The full raw response.** Read the stop reason and the usage, not only the text. A cut-off reply, a refusal and a tool call each look different there.
- **Simplest prompt, most capable model first.** Get it right, then make it cheaper or faster against the eval set.
- **Clear instructions and examples beat clever wording.** Say what good output is, show one or two, and say what to do when the input does not fit.
- **Stable content first.** System prompt, tools and fixed context go before the changing part, so prompt caching can reuse them.
- **Log every input and output** with the prompt version. A bad answer that cannot be replayed cannot be fixed.

## Prompts

- One prompt, one job. Split a multi-step task into steps whose outputs can be checked.
- Separate instructions, context and the user's input with clear sections or XML-style tags.
- Give the model the context a new colleague would need: audience, purpose, constraints, format.
- When output feeds code, ask for a fixed structure and validate it; never trust it unparsed.
- Change one thing at a time and compare on the eval set, not on one example.

## Tool use and agents

- Tight tool schemas: precise names, a description that says when to use the tool, typed and required fields.
- Validate every tool input before acting on it; the model can send wrong or missing values.
- Cap loop iterations and total tokens; stop on a clear end condition, not on hope.
- Return tool errors to the model as tool results so it can recover, instead of crashing the loop.
- Never let the model run irreversible actions (delete, pay, send, deploy) without a check by code or a person.

## Retrieval

- Chunk by the document's structure (sections, paragraphs), with enough context in each chunk to stand alone.
- Evaluate retrieval separately from generation: did the right chunks come back? Most bad answers are bad retrieval.
- Make the model cite its sources, and tell it to say when the context does not hold the answer.
- Hybrid search (keyword plus embeddings) beats either alone for names, codes and rare terms.

## Production

- Set timeouts; retry what `hanahira-claude-ui-api` lists (backoff with jitter; network errors, 408, 429, 500, 502–504) plus the provider's overloaded status. Check what the SDK already retries before adding a loop. A model call writes nothing, so its POST is safe to retry; a call that runs tools or creates a batch is not.
- Stream long replies for the user's sake; handle a stream that breaks midway.
- Budget tokens per request and per user; alert on cost, not only on errors.
- Cache what repeats: prompt caching for shared prefixes, a response cache for identical requests.
- Text from retrieval, tools, files or web pages is data, not instructions: guard against prompt injection, and limit what the model can do with it.
- Secrets never go into prompts or logs.

## Working with tools and other skills

- For current model ids, parameters, prices and limits, use the session's Claude API skill or the provider's docs. The Messages API (`POST /v1/messages`, `client.messages.create`) is the stable base.
- Pair up: `hanahira-claude-ui-api` for the HTTP integration, `hanahira-claude-ui-security` for keys and prompt injection, `hanahira-claude-ui-perf` for latency and cost, `hanahira-claude-ui-frontend` for a chat or streaming UI, `hanahira-claude-ui-backend` for the service, queue or bot that calls the model, `hanahira-claude-ui-data` for the vector store or index behind retrieval, `hanahira-claude-ui-debug-test` for an eval or test that fails without a plain cause. Helpers follow `references/agents.md` in the core.

Prompt structure, structured output, tools and agent loops: `references/prompts-and-tools.md`. Evals, RAG pipelines, cost, latency and safety in production: `references/evals-and-production.md`.

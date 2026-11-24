# Evals and production

A look-up for proving an LLM feature works and keeping it working in production: eval sets and graders, retrieval pipelines, cost and latency, streaming, retries, observability and safety. Prices, limits and feature names change: check the session's Claude API skill or the provider's current docs before relying on a number.

## Building an eval set

- Start with 10–30 real cases from real users or real data, not invented ones. Grow it to hundreds as the feature matters more.
- Each case has an input and an expected outcome: an exact answer, a property the answer must have, or a rubric.
- Cover the common case, the edge cases, the inputs that should be refused, and every bug found in production.
- Store the set in version control next to the prompt. A prompt change without an eval run is a guess.
- Keep a held-out part that is never used while tuning, to catch overfitting to the set.

## Graders

Use the cheapest grader that measures what matters:

1. **Exact match** — classification, extraction of a fixed value, yes/no. Normalise case and whitespace first.
2. **Code checks** — valid JSON, schema passes, contains or excludes a string, length in range, citations point at real sources, generated code compiles and its tests pass.
3. **Model-graded with a rubric** — for open answers. Give the grader a clear rubric, the input, the answer and a reference answer; ask for reasoning, then a score from a small fixed scale. Check the grader against a few human-graded cases before trusting it.

- Grade on several dimensions separately (correct, complete, grounded, format) rather than one overall score.
- Run each case more than once when outputs vary; report the pass rate, not one run.

## Regression runs

- Rerun the whole set on every change to the prompt, model, tools, retrieval or parameters.
- Compare to the last baseline case by case; a higher average can hide new failures.
- Pin the model version in config so an upgrade is a deliberate, evaluated change.
- Run the set in CI for prompt files, and on a schedule for production samples.

## RAG pipeline

Steps: load → clean → chunk → embed → index → retrieve → rerank → generate with citations.

- **Chunking**: follow the document's structure; add the title and section path to each chunk; overlap a little.
- **Retrieval**: hybrid keyword plus embedding search; filter by metadata (date, owner, permissions) before ranking.
- **Reranking**: a reranker or a model pass over the top results often beats tuning the embedding.
- **Generation**: tell the model to answer only from the context, cite chunk ids, and say when the answer is not there.

Failure modes and where to look:

- Right document never retrieved → chunking, embedding model, or missing keyword search. Measure recall on the eval set.
- Retrieved but ignored → too many chunks, the key chunk buried in the middle, or a weak instruction.
- Confident wrong answer → no "not found" path; stale or duplicate documents in the index.
- Leaks across users → permission filter missing at retrieval time.

## Cost and latency levers

- Shorter prompts: cut unused instructions, examples and context; summarise long history.
- Prompt caching: stable prefix first (system, tools, documents), changing input last. Check the provider's docs for cache rules and pricing.
- A smaller, faster model for easy steps (routing, classification, extraction), the capable model for hard ones. Prove each swap on the eval set.
- Batch processing for work that need not be immediate; check the provider's batch offering and its terms.
- Cap output tokens; ask for concise output.
- Run independent calls in parallel, within the rate limit.
- Measure time to first token and total time separately.

## Streaming

- Stream for anything a user waits on; render tokens as they arrive.
- Handle a broken stream: show what arrived, mark it incomplete, allow a retry.
- Read the final stop reason and usage from the end of the stream, as with a normal reply.
- Do not parse structured output until the stream is complete.

## Retries

- Which statuses to retry, and the backoff: `hanahira-claude-ui-api`. Add the provider's overloaded status; honour any retry-after header; read the SDK's own retry setting first.
- Do not retry other 4xx errors (400, 401, 403, 404, 413); fix the request.
- Cap total retries and time; fall back to a cached answer, a smaller model or a clear error.
- Make the action around the call idempotent so a retry does not double-charge or double-send.

## Observability

- Log per call: request id, prompt version, model, input and output (redacted), stop reason, tokens, latency, cost, user or tenant.
- Trace agent runs step by step with a shared id.
- Dashboards: error rate, latency percentiles, tokens and cost per feature and per user, refusal rate.
- Sample production outputs into the eval set, especially ones users flagged.

## Safety

- **Prompt injection**: text from documents, web pages, emails, tool results or users can contain instructions. Treat it as data: wrap it in tags, tell the model not to follow it, and limit what tools the model can call after reading it. Never let it trigger irreversible actions unchecked.
- **PII**: send the model only the fields it needs; redact before logging; follow the data's retention rules and the provider's data terms.
- **Secrets**: keys live in the environment or a secret manager, never in prompts, logs or client code.
- **Output**: escape model output before rendering it as HTML or running it as SQL or shell.
- Add the injection and PII cases to the eval set so a regression shows.

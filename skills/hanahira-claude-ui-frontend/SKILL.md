---
name: "hanahira-claude-ui-frontend"
description: Hanahira Claude UI companion for web app code — React, Vue, Svelte and Angular components, Next.js, Nuxt and other meta-frameworks, state management, routing, data fetching and caching, forms and validation, server-side rendering and hydration, TypeScript in the UI, bundlers (Vite, webpack), component tests and end-to-end tests. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when a real part of the task lies in this field; it can load beside another companion.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Frontend

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**Match the framework, version and patterns the project already uses, and see the change working in the browser.** Read them from `package.json`, the lock file and the existing components; never bring in a pattern from another framework or a newer major version. Compiling is not working: a change is done when it is seen behaving on the page.

## What saves the most time

- **`package.json` and one sibling component first.** They show the framework and version, the state library, the styling, the test tool and the house style in a minute. Where a version matters, check the lock file and that version's docs, not memory.
- **The first error, whole.** The dev server's terminal and the browser console both have one; later errors are usually its consequences.
- **Type errors before runtime ones.** Run the project's type check; a wrong prop shape found there saves a debugging session in the browser.
- **Reproduce in the smallest route.** One page, one component, the fewest providers. A bug that survives that is the real one.

## Components and state

- Decide where each piece of state lives: local to a component, lifted to the nearest common parent, in the URL, in server cache, or in a store. Lift first; reach for a store only when many distant parts share it.
- Derive, do not duplicate. A value computable from props or other state is computed during render, not copied into state and kept in sync.
- Effects are for syncing with something outside the framework — a subscription, a timer, the DOM, a non-framework widget. Fetching on change or copying props into state through an effect is usually the bug.
- Lists get stable keys from the data's identity, never the array index when items can move, be inserted or removed.
- An input is either controlled or uncontrolled for its whole life; switching between them loses values and warns.
- Forms: validate on the client for the user, and again on the server for safety; show errors next to the field.

## Data and routing

- Know where each fetch runs: on the server at render, on the client after mount, or both. Secrets and direct database access stay server-side.
- Every async view has loading, error and empty states, not only the happy one.
- After a mutation, invalidate or update the cached data that showed the old value; a stale list after a save is the commonest data bug.
- Filters, tabs, pages and selections that a user would share or refresh belong in the URL.

## Rendering

- A hydration mismatch means the server and the first client render differ. Usual causes: dates and time zones, random ids, `window`, `localStorage` or `navigator` read during render, and markup the browser repairs (invalid nesting).
- Browser-only code runs after mount or behind the framework's client-only mechanism, never at module top level in a shared file.

## Tests

- Component tests query what the user sees — role, label, text — in the testing-library style, and act through user events.
- Flows that cross pages run end to end with Playwright or the project's existing tool.
- Avoid snapshot sprawl; a large snapshot is approved without being read and protects nothing.

## Working with tools and other skills

- `hanahira-claude-ui-design` for the look, CSS and accessibility; `hanahira-claude-ui-perf` for bundle size and Web Vitals; `hanahira-claude-ui-api` for the backend contract; `hanahira-claude-ui-browser` to check the change in a real browser, with its console and network.
- Helpers follow `references/agents.md` in the core.

Framework traps, meta-framework data loading and hydration fixes: `references/frameworks.md`. Component and end-to-end tests, CI checks, env variables, source maps: `references/testing-and-tooling.md`.

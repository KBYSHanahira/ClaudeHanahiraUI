# Frameworks

A look-up for the traps that bite most in each framework. APIs change between major versions: read the project's `package.json` and lock file for the version in use, and confirm against that version's current docs before relying on any detail here.

## React

- **Effects.** An effect is for syncing with an outside system. Deriving a value, reacting to a user event, or resetting state when a prop changes belongs in render, the event handler, or a `key` on the component — not an effect.
- **Dependency arrays.** Leave out a value the effect reads and it runs with an old one; silence the lint rule and the bug is hidden. Fix the dependency, do not suppress the warning.
- **Cleanup.** Subscriptions, timers and listeners set up in an effect are removed in its cleanup. In development, strict mode may run effects twice on purpose to expose a missing cleanup.
- **Stale closures.** A callback or interval created once keeps the values from that render. Use the functional state update (`setX(prev => ...)`), include the value in dependencies, or hold the latest value in a ref.
- **Keys.** An index key on a reorderable list attaches state and input values to the wrong row. Use the item's id. Changing a key deliberately remounts a component, which is a clean way to reset it.
- **Memo misuse.** `memo`, `useMemo` and `useCallback` are for measured cost or for stable identity a child depends on. Sprinkled everywhere they add noise and still break when one prop is a fresh object each render.
- **State is a snapshot.** Reading state right after setting it gives the old value; mutating an object or array in place does not trigger a render.
- **Server components (Next.js App Router and similar).** Components are server-side by default there; hooks, event handlers and browser APIs need a client component marked with the `"use client"` directive. Props crossing from server to client must be serialisable — no functions or class instances. Keep the client boundary as low in the tree as possible. Check the project's Next.js version: the App Router and Pages Router differ in data loading and caching.

## Vue

- **Destructuring loses reactivity.** Destructuring a `reactive` object or props gives plain values that no longer update. Use `toRefs`, access through the object, or the pattern the project's Vue version documents for props.
- **Refs and `.value`.** In script a `ref` needs `.value`; in the template it is unwrapped. Forgetting `.value` compares or assigns the ref itself.
- **Replacing a reactive object** wholesale breaks the link held elsewhere; mutate its properties or hold it in a `ref`.
- **`v-for` keys** must be stable ids. Do not put `v-if` and `v-for` on the same element; filter in a computed instead.
- **Computed, not watchers,** for derived values. A watcher that writes state another watcher reads is a loop waiting to happen.
- `nextTick` waits for the DOM to update after a state change; reading the DOM before it gives the old layout.
- Check whether the project uses the Options API or the Composition API, and `<script setup>`, and stay with it.

## Svelte

- **Reactivity follows assignment** in the classic model: mutating an array with `push` does not update until the variable is reassigned. Newer Svelte versions use a different, rune-based model. Read the project's Svelte version and follow its docs; do not mix the two styles in one component.
- Reactive statements and derived values run in dependency order; one that reads a value it does not name will not re-run.
- Bind form inputs with the framework's two-way binding only where the project already does; otherwise handle the event and assign.
- Clean up subscriptions and listeners when the component is destroyed; store auto-subscriptions in markup handle this for you.

## Angular

- **Change detection.** With the default strategy, changes made outside Angular's awareness may not render. With `OnPush`, mutating an input object does not trigger a check; pass a new reference. Newer Angular versions add signals and zoneless options — check the version and the project's choice.
- **Subscriptions.** Every manual `subscribe` needs an end: the `async` pipe, a take-until-destroy pattern, or an explicit unsubscribe. A leaked subscription fires on a destroyed component.
- Prefer the `async` pipe in templates to subscribing and copying into a field.
- Do not call methods or build new arrays in template bindings; they run on every check. Use a pure pipe, a computed signal or a precomputed field.
- `trackBy` (or the track expression in the newer control flow) on lists, for the same reason as keys elsewhere.

## Meta-framework data loading and caching

- Learn where the project loads data: a server loader per route, server components, `getServerSideProps`-style functions, or client fetching with a query library. Follow that; do not add a second path.
- Caching layers stack: the framework's fetch or route cache, a CDN, the client query cache, the browser. When data looks stale, find which layer served it before changing code.
- After a mutation, use the framework's revalidation or the query library's invalidation for exactly the keys affected.
- Static generation bakes data at build time. Anything per-user or fast-changing needs a dynamic route or client fetch.
- Loading states belong to the route: use the framework's loading and error boundaries per segment rather than one spinner for the whole app.
- Request deduplication differs by framework; do not assume two components fetching the same URL make one request without checking.
- Environment-specific behaviour (dev vs production build) differs, especially caching. Verify cache-related fixes in a production build.

## Hydration errors

- Read the framework's message: it usually names the element or text that differed.
- **Dates and time zones**: format on one side only, or pass a fixed string from the server.
- **Random values and ids**: use the framework's stable id helper, not `Math.random()` or a counter.
- **Browser APIs in render**: `window`, `localStorage`, media queries, `navigator`. Read them after mount and render a neutral first frame.
- **Invalid HTML nesting** (a `div` inside a `p`, nested `a` tags): the browser repairs it and the trees no longer match.
- **Browser extensions** that inject markup can cause mismatches; confirm in a clean profile before chasing code.
- Reproduce a hydration error in a production build too; development and production messages differ in detail.
- Suppressing the warning is a last resort for one known-harmless node, never a fix.

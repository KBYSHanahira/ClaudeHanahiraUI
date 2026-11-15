# Testing and tooling

A look-up for testing web app code and the build tools around it. Tool names and options change between versions: check the project's `package.json`, its config files and the tool's current docs before using a detail here.

## Component tests

- Use the project's runner (Jest, Vitest or another) and its testing-library package for the framework, if present. Do not add a second runner.
- Query as a user finds things, in this order of preference: by role with an accessible name, by label, by placeholder or text. A test id is the fallback when nothing visible identifies the element.
- A query by role failing is often an accessibility bug worth fixing, not a reason to switch to a test id.
- Act through user-event style helpers (typing, clicking) rather than firing raw events; they follow the real event order.
- Wait for async UI with the library's find or wait helpers, not timers.
- Assert on what the user sees — text, enabled or disabled, visible or not — not on component state or internal methods.
- Reset mocks, timers and global state between tests so each one starts clean.
- Render with the real providers the app uses (router, store, query client), through one shared helper, so tests match production wiring.

## Mocking the network

- Mock at the network boundary, not inside components. A request-interception library in the MSW style serves fixed responses for the URLs the app calls, in tests and optionally in the dev server.
- Define the happy response once; override per test for errors, empty results and slow responses.
- Fail a test on any unhandled request, so a new call is noticed instead of silently hitting nothing.
- Keep mock payloads in the shape of the real API; when the contract changes, the mocks change with it (see `hanahira-claude-ui-api`).

## End-to-end with Playwright

- Use the project's existing e2e tool if it has one; Playwright is a sound default for a new setup.
- Locate by role, label and text, the same as component tests. Avoid CSS chains and XPath that follow the layout.
- Rely on auto-waiting locators and web-first assertions that retry until true. Never add a fixed sleep; wait for a visible result, a URL or a network response instead.
- Each test sets up its own data and state; tests that depend on order are flaky by design.
- Log in once and reuse the stored session state rather than driving the login form in every test.
- On failure, read the trace, screenshot and video the runner can keep; they usually show the cause directly.
- Run in the browsers the users have; one engine passing does not prove the others.
- Run against a production build when the bug or feature depends on build behaviour.

## Type-checking and lint in CI

- The bundler often strips types without checking them. Run the type checker as its own step (for TypeScript, `tsc --noEmit` or the framework's check command).
- Run the linter with the project's config, including the framework's hooks or template rules; they catch dependency and key mistakes early.
- Type check, lint, unit tests, build, then e2e: cheapest first, so a failure stops the run early.
- Do not loosen `tsconfig` strictness, add `any` or disable a rule to get green without saying so and why.

## Environment variables

- Only variables with the bundler's or framework's public prefix are embedded in client code; others stay server-side. The prefix differs by tool (Vite, Next.js, Create React App and others each have their own); check the bundler's docs for it.
- Anything embedded in the client bundle is public. Never give a secret the public prefix; call a server endpoint that holds it.
- Client env values are fixed at build time in most setups. Changing them needs a rebuild, not only a restart.
- Validate required variables at startup and fail with a clear message instead of an `undefined` deep in the UI.
- Keep an example env file listing every variable the app expects, without real values.

## Source maps

- Source maps turn minified stack traces into real file and line numbers. Enable them for development, and for production when an error tracker needs them.
- Public production source maps expose source code. Prefer uploading them to the error tracker and not serving them, or restricting access.
- When a stack trace points at the wrong line, suspect a stale or mismatched source map from a different build.

## Bundlers

- Vite and webpack configs differ in shape and plugins; follow the one the project uses and its version's docs.
- A dependency that works in dev but breaks in the production build often involves module format (ESM vs CommonJS) or tree-shaking; reproduce with a local production build and preview.
- Path aliases must agree between the bundler, TypeScript and the test runner, or imports resolve in one and fail in another.
- Bundle size and splitting belong to `hanahira-claude-ui-perf`.

// Stand-ins for the engine's modules, so `bun test` can run hooks/*.test.ts without the
// engine: `claude-code/testing` becomes bun:test, and `claude-code` gives atom/read/update
// over plain values (most tests exercise pure functions; hooks/handlers.test.ts runs the hooks
// against a kept state).
// `claude plugin test <folder>` runs the same tests against the engine itself where the
// CLI has it. Loaded by bunfig.toml.
import { plugin } from 'bun'

plugin({
  name: 'claude-code-shim',
  setup(build) {
    build.module('claude-code/testing', () => ({
      contents: `export { describe, expect, test, mock } from 'bun:test'`,
      loader: 'ts',
    }))
    build.module('claude-code', () => ({
      contents: `
        export const atom = (key, init) => ({ key, init })
        // A test that wants state kept sets globalThis.__bandState to a Map (by atom key);
        // without it every read is the atom's first value, as the pure-function tests expect.
        const store = () => (globalThis.__bandState instanceof Map ? globalThis.__bandState : null)
        const now = a => (store()?.has(a.key.key) ? store().get(a.key.key) : a.init)
        export const read = async (_$, a) => now(a)
        export const update = async (_$, a, f) => {
          const v = f(now(a))
          store()?.set(a.key.key, v)
          return v
        }
      `,
      loader: 'ts',
    }))
  },
})

// Stand-ins for the engine's modules, so `bun test` can run hooks/*.test.ts without the
// engine: `claude-code/testing` becomes bun:test, and `claude-code` gives atom/read/update
// over plain values (the tests only exercise pure functions, so no hook ever runs).
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
        export const read = async (_$, a) => a.init
        export const update = async (_$, a, f) => f(a.init)
      `,
      loader: 'ts',
    }))
  },
})

// The transcript rows drawn by the engine's own test kit: `claude plugin test <folder>`. Each
// tree goes through the surface's rules, so a prop a surface refuses fails here, not on screen.
// Under `bun test` (scripts/test-preload.ts) there is no engine to draw with: skipped there.
import { expect, mock, test } from 'claude-code/testing'

const inEngine = typeof (globalThis as { Bun?: unknown }).Bun === 'undefined'
const run = (inEngine ? test : (test as unknown as { skip: typeof test }).skip) as typeof test

const PLUGIN = 'hanahira-claude-ui'
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

const EDIT = {
  tool_use_id: 'edit-1',
  tool: 'Edit',
  input: { file_path: '/repo/hooks/chat.ts', old_string: 'a', new_string: 'b' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  output: {
    filePath: '/repo/hooks/chat.ts',
    structuredPatch: [
      { oldStart: 10, oldLines: 2, newStart: 10, newLines: 3, lines: [' keep', '-old line', '+new line', '+another'] },
      { oldStart: 80, oldLines: 1, newStart: 81, newLines: 1, lines: ['-gone'] },
    ],
  },
}

run('an Edit row counts its change and shows the lines under it, on every surface', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'ToolUse', requestId: EDIT.tool_use_id, props: EDIT })
    expect(await ui.find({ type: 'Text', text: /new line/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /gone/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /chat\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})

run('the result block under an Edit draws nothing of its own: the row has the change', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'ToolResult',
      requestId: EDIT.tool_use_id,
      props: { tool_use_id: EDIT.tool_use_id, tool: 'Edit', output: EDIT.output, isErrored: false },
    })
    expect(await ui.find({ type: 'Text', text: /new line/ })).toBeUndefined()
    await ui.unmount()
  }
})

run('a delete command reads as Delete, and a running row draws', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'ToolUse',
      requestId: 'rm-1',
      props: { tool_use_id: 'rm-1', tool: 'Bash', input: { command: 'rm -f dist/old.js' }, isRunning: true, isErrored: false, isInterrupted: false },
    })
    expect(await ui.find({ type: 'Text', text: /Delete/ })).toBeDefined()
    await ui.unmount()
  }
})

run('a task notification is a row with its status, on every surface', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'UserMessage',
      requestId: 'note-1',
      props: {
        text: 'Agent "Agent smoke test" completed',
        origin: { kind: 'task-notification' },
        isExpanded: false,
        task: { id: 't1', status: 'completed', type: 'local_agent', durationMs: 8000 },
      },
    })
    expect(await ui.find({ type: 'Text', text: /smoke test/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /8\.0 s/ })).toBeDefined()
    await ui.unmount()
  }
})

run('your prompt is a card, on every surface', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'UserMessage',
      requestId: 'you-1',
      props: { text: 'renovate the chat', origin: { kind: 'composer' }, isExpanded: true },
    })
    expect(await ui.find({ type: 'Text', text: /renovate the chat/ })).toBeDefined()
    await ui.unmount()
  }
})

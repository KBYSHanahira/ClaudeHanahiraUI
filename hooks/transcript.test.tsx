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

/** Every picture a drawing holds, by its place and alt text. */
const pictures = async (ui: { findAll: (q: { type: string }) => Promise<{ props: Record<string, unknown> }[]> }) =>
  (await ui.findAll({ type: 'Svg' })).map((s, i) => `${i}:${String(s.props.alt)}=${String(s.props.source)}`)

run('a row redrawn while its finish plays keeps its picture: no swap, no blink, no replay', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const row = (isRunning: boolean) => ({
    tool_use_id: 'fin-1', tool: 'Bash', input: { command: 'echo fin' }, isRunning, isErrored: false, isInterrupted: false,
    ...(isRunning ? {} : { output: { stdout: 'ok', stderr: '' } }),
  })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'ToolUse', requestId: 'fin-1', props: row(true) })
  await ui.redraw(row(false))
  const finished = await pictures(ui)
  expect(finished.join()).toContain('fill="freeze"') // the finish is playing
  // Rows around it come and go: the surface draws it again, 200 ms apart, inside the finish.
  for (let i = 0; i < 3; i++) {
    await clock.advance(200)
    await ui.redraw()
    expect(await pictures(ui)).toEqual(finished)
  }
  // Once the finish has played, it settles on a still picture.
  await clock.advance(1000)
  await ui.redraw()
  expect((await pictures(ui)).join()).not.toContain('fill="freeze"')
  await ui.unmount()
})

run('a running agent card is not swapped on every beat of the band', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '' } }) as never)
  on('session.usage', () => ({ value: { cost: { usd: 1 }, context: { percent: 20, tokens: 200000, window: 1000000 }, rateLimits: [] } }) as never)
  // The engine's list still has the agent running, so the band's check leaves its card be.
  on('agent.list', () => ({ value: [{ id: 'ag1', status: 'running' }] }) as never)
  on('agent.spawn', () => ({ agentId: 'ag1', model: 'claude-sonnet-5-5' }) as never)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await ($ as unknown as { agent: { spawn: (a: object) => Promise<unknown> } }).agent.spawn({ description: 'code-reviewer', subagentType: 'general-purpose', background: true, prompt: 'review', tool_use_id: 'tu-agent' })
  const band = await $.ui.mount({
    plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', requestId: 'band',
    props: { hasSurvey: false, isWorking: false, maxRows: 30, bodyColumns: 150, scroll: { offset: 0, bodyRows: 30 }, view: {} } as never,
  })
  const card = async () => (await pictures(band)).find(p => p.includes(':code-reviewer, running='))
  await clock.advance(2000) // past its bounce in
  const settled = await card()
  expect(settled).toBeDefined()
  // The band beats every second while the agent runs; nothing on the card changed.
  for (let i = 0; i < 4; i++) {
    await clock.advance(1000)
    expect(await card()).toBe(settled)
  }
  await band.unmount()
})

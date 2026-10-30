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
    expect(await ui.find({ type: 'Code', text: /\+new line/ })).toBeDefined()
    expect(await ui.find({ type: 'Code', text: /-gone/ })).toBeDefined()
    // The file's path heads the change, from the session's folder.
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
    expect(await ui.find({ type: 'Code', text: /new line/ })).toBeUndefined()
    await ui.unmount()
  }
})

run('a Skill row names the skill, on every surface', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'ToolUse',
      requestId: 'skill-1',
      props: { tool_use_id: 'skill-1', tool: 'Skill', input: { skill: 'plugin-authoring' }, isRunning: false, isErrored: false, isInterrupted: false },
    })
    expect(await ui.find({ type: 'Text', text: /plugin-authoring/ })).toBeDefined()
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

run('a finished row is a still picture: a redraw never swaps it', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const row = (isRunning: boolean) => ({
    tool_use_id: 'fin-1', tool: 'Bash', input: { command: 'echo fin' }, isRunning, isErrored: false, isInterrupted: false,
    ...(isRunning ? {} : { output: { stdout: 'ok', stderr: '' } }),
  })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'ToolUse', requestId: 'fin-1', props: row(true) })
  expect((await pictures(ui)).join()).not.toContain('@keyframes')
  await ui.redraw(row(false))
  const finished = await pictures(ui)
  expect(finished.join()).not.toContain('@keyframes')
  // Rows around it come and go: the surface draws it again, and gets the same picture.
  for (let i = 0; i < 3; i++) {
    await clock.advance(400)
    await ui.redraw()
    expect(await pictures(ui)).toEqual(finished)
  }
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
  await clock.advance(2000)
  const settled = await card()
  expect(settled).toBeDefined()
  // The band beats every second while the agent runs; nothing on the card changed.
  for (let i = 0; i < 4; i++) {
    await clock.advance(1000)
    expect(await card()).toBe(settled)
  }
  await band.unmount()
})

/** The band on Desktop, after a session start that reads `usage` as its figures. */
const band = async ($: any, on: any, usage: { percent: number; usd: number }, isWorking: boolean) => {
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '' } }) as never)
  on('session.usage', () => ({ value: { cost: { usd: usage.usd }, context: { percent: usage.percent, tokens: usage.percent * 10000, window: 1000000 }, rateLimits: [] } }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('session.measure', (_: unknown, e: { changed: string[] }) => ({ changed: e.changed }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  return $.ui.mount({
    plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', requestId: 'band',
    props: { hasSurvey: false, isWorking, maxRows: 30, bodyColumns: 150, scroll: { offset: 0, bodyRows: 30 }, view: {} } as never,
  })
}

run('the band\'s loops keep their picture across beats, so they run on and never blink', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const ui = await band($, on, { percent: 20, usd: 1 }, true)
  const loops = async () => (await pictures(ui)).filter(p => p.includes('@keyframes'))
  const first = await loops()
  // The status dot, the loading bar and the working chip.
  expect(first.length).toBe(3)
  for (let i = 0; i < 5; i++) {
    await clock.advance(1000)
    await ui.redraw()
    expect(await loops()).toEqual(first)
  }
  // Each loop is drawn in the surface's frame, where SMIL runs on its own between redraws.
  const svgs = async () => (await ui.findAll({ type: 'Svg' })) as unknown as { props: { source: string; isInteractive?: boolean } }[]
  const looping = (await svgs()).filter(s => s.props.source.includes('@keyframes'))
  expect(looping.length).toBe(3)
  expect(looping.every(s => s.props.isInteractive === true)).toBe(true)
  // Idle, nothing moves, and nothing is drawn in a frame.
  await ui.redraw({ hasSurvey: false, isWorking: false, maxRows: 30, bodyColumns: 150, scroll: { offset: 0, bodyRows: 30 }, view: {} })
  expect((await pictures(ui)).join()).not.toContain('@keyframes')
  expect((await svgs()).some(s => s.props.isInteractive)).toBe(false)
  await ui.unmount()
})

run('a change plays once in CSS inside its picture, the same picture while it plays, then the plain one', async ($, on) => {
  const clock = mock.clock(on, { now: 2_000_000 })
  const usage = { percent: 20, usd: 1 }
  const ui = await band($, on, usage, false)
  const context = async () => (await pictures(ui)).find(p => /:\d+% context=/.test(p))!
  const cost = async () => (await pictures(ui)).find(p => /:Cost /.test(p))!
  // How many of the meter's blocks rest lit (the meter's colour), as the hero line draws it.
  const lit = async () => {
    const p = await context()
    const base = (/<path d="([^"]*)" fill="#e8825f"\/>/.exec(p)?.[1]?.match(/M/g) ?? []).length
    return base + (p.match(/fill="#e8825f" class="m"/g) ?? []).length
  }
  expect(await context()).toMatch(/^\d+:20% context=/)
  expect(await context()).not.toContain('<style>')
  const litBefore = await lit()
  usage.percent = 60
  usage.usd = 5
  await ($ as any).session.measure({
    context: { percent: 60, tokens: 600000, window: 1000000 }, rateLimits: [], cost: { usd: 5 }, changed: ['context', 'cost'],
  })
  // The figure is the new one at once, for a reader; the picture rolls it in and lights the
  // meter up to it by itself, resting on the new fill.
  const playing = await context()
  expect(playing).toMatch(/^\d+:60% context=/)
  expect(playing).toContain('@keyframes reel')
  expect(playing).toContain('@keyframes m{')
  const litAfter = await lit()
  expect(litAfter).toBeGreaterThan(litBefore)
  expect(await cost()).toContain('≈$5.00')
  expect(await cost()).toContain('@keyframes reel')
  // While it plays, a redraw sends the same picture, so the surface never starts it over.
  for (let i = 0; i < 5; i++) {
    await clock.advance(100)
    await ui.redraw()
    expect(await context()).toBe(playing)
  }
  // Played: the plain picture, at the same fill, and still from then on.
  await clock.advance(2000) // past the longest motion (MOTION.glideMs) and its hold (MOTION.holdMs)
  await ui.redraw()
  const settled = await pictures(ui)
  expect(settled.join()).not.toContain('@keyframes')
  expect(await lit()).toBe(litAfter)
  await clock.advance(1000)
  await ui.redraw()
  expect(await pictures(ui)).toEqual(settled)
  await ui.unmount()
})

/** The Time figure and the top line's clock, as the band draws them now. */
const clocks = async (ui: any) => {
  const time = (await pictures(ui)).map(p => /:Time ([^=]+)=/.exec(p)?.[1]).find(Boolean)
  // The top line's clock is a picture that rolls each second in; its alt is the time as written.
  const top = (await pictures(ui)).map(p => /^\d+:(\d+s|\d+m \d+s)=/.exec(p)?.[1]).find(Boolean)
  return { time, top }
}
/** What the engine answers beneath the plugin for a turn's events. */
const turns = (on: any) => {
  on('prompt.submit', (_: unknown, e: { text: string }) => ({ text: e.text }))
  on('turn.start', (_: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
  on('turn.complete', (_: unknown, e: { answer: string }) => ({ text: e.answer }))
}
const working = { hasSurvey: false, isWorking: true, maxRows: 30, bodyColumns: 150, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const idle = { ...working, isWorking: false }

run('a turn started without a typed prompt runs the clocks live, and Time adds the turn as it ends', async ($, on) => {
  const clock = mock.clock(on, { now: 3_000_000 })
  turns(on)
  const ui = await band($, on, { percent: 20, usd: 1 }, false)
  await ($ as any).turn.start({ text: '', turnId: 't1' })
  await ui.redraw(working)
  await clock.advance(3000)
  await ui.redraw(working)
  expect(await clocks(ui)).toEqual({ time: '0:03', top: '3s' })
  await clock.advance(2000)
  await ($ as any).turn.complete({ turnId: 't1', answer: '', durationMs: 5000, isAborted: false, reason: 'answer' })
  await ui.redraw(idle)
  expect((await clocks(ui)).time).toBe('0:05')
  await ui.unmount()
})

run('a prompt typed while a turn runs neither restarts its clock nor clears its tool count', async ($, on) => {
  const clock = mock.clock(on, { now: 4_000_000 })
  turns(on)
  on('tool.call', () => ({ result: {} }) as never)
  const ui = await band($, on, { percent: 20, usd: 1 }, true)
  await ($ as any).prompt.submit({ text: 'go' })
  await ($ as any).turn.start({ text: 'go', turnId: 't2' })
  await ($ as any).tool.call({ tool: 'Bash', command: 'ls' })
  const toolCount = async () => (await pictures(ui)).map(p => /:(\d+) tool calls=/.exec(p)?.[1]).find(Boolean)
  await clock.advance(5000)
  await ($ as any).prompt.submit({ text: 'and this too' })
  await clock.advance(1000)
  await ui.redraw(working)
  expect(await clocks(ui)).toEqual({ time: '0:06', top: '6s' })
  expect(await toolCount()).toBe('1')
  await ui.unmount()
})

run('the Hanahira tile turns in once as the mode switches on, breathes while Claude works, and rests idle', async ($, on) => {
  const clock = mock.clock(on, { now: 5_000_000 })
  turns(on)
  const ui = await band($, on, { percent: 20, usd: 1 }, true)
  const svgs = async () => (await ui.findAll({ type: 'Svg' })) as unknown as { props: { source: string; alt: string; isInteractive?: boolean } }[]
  const tile = async () => (await svgs()).find(s => /^Hanahira /.test(s.props.alt))!
  expect((await tile()).props.source).not.toContain('@keyframes')
  await ($ as any).prompt.submit({ text: '/Hanahira Claude UI on' })
  await ($ as any).turn.start({ text: '/Hanahira Claude UI on', turnId: 't3' })
  await ui.redraw(working)
  const arriving = await tile()
  expect(arriving.props.alt).toBe('Hanahira Claude UI active')
  expect(arriving.props.source).toContain('twinkle')
  expect(arriving.props.isInteractive).toBe(true)
  // The beats of the turn draw the same picture, so the turn-in plays once and the breath runs on.
  for (let i = 0; i < 3; i++) {
    await clock.advance(1000)
    await ui.redraw(working)
    expect((await tile()).props.source).toBe(arriving.props.source)
  }
  await ($ as any).turn.complete({ turnId: 't3', answer: '', durationMs: 3000, isAborted: false, reason: 'answer' })
  await ui.redraw(idle)
  expect((await tile()).props.source).not.toContain('@keyframes')
  expect((await tile()).props.isInteractive).toBeUndefined()
  // The next turn breathes without turning in again.
  await ($ as any).turn.start({ text: 'next', turnId: 't4' })
  await ui.redraw(working)
  expect((await tile()).props.source).toContain('animation:spark')
  expect((await tile()).props.source).not.toContain('twinkle')
  await ui.unmount()
})

run('a running agent card keeps its ring and bar pictures while its figures change, so they never blink', async ($, on) => {
  const clock = mock.clock(on, { now: 6_000_000 })
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '' } }) as never)
  on('session.usage', () => ({ value: { cost: { usd: 1 }, context: { percent: 20, tokens: 200000, window: 1000000 }, rateLimits: [] } }) as never)
  on('agent.list', () => ({ value: [{ id: 'ag9', status: 'running' }] }) as never)
  on('agent.spawn', () => ({ agentId: 'ag9', model: 'claude-sonnet-5-5' }) as never)
  on('tool.call', () => ({ result: {} }) as never)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await ($ as any).agent.spawn({ description: 'bar-test', subagentType: 'general-purpose', background: true, prompt: 'x', tool_use_id: 'tu-9' })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', requestId: 'band', props: working as never })
  const svgs = async () => (await ui.findAll({ type: 'Svg' })) as unknown as { props: { source: string; alt: string; isInteractive?: boolean } }[]
  const part = async (alt: string) => (await svgs()).find(s => s.props.alt === alt)
  await clock.advance(1000)
  const strip = (await part('bar-test progress'))!
  expect(strip.props.isInteractive).toBe(true)
  expect(strip.props.source).toContain('animation:run')
  const ring = (await part('bar-test working'))!
  expect(ring.props.isInteractive).toBe(true)
  expect(ring.props.source).toContain('animation:spin')
  expect((await part('bar-test, running'))!.props.isInteractive).toBeUndefined()
  const figures = async () => (await svgs()).find(s => / tools · /.test(s.props.alt))!
  const before = (await figures()).props.source
  expect((await figures()).props.isInteractive).toBeUndefined()
  // The agent works on: its figures change, the ring's and the bar's pictures do not.
  for (let i = 0; i < 3; i++) {
    await ($ as any).tool.call({ tool: 'Bash', command: 'ls', agentId: 'ag9', tool_use_id: `t${i}` })
    await clock.advance(1000)
    expect((await part('bar-test progress'))!.props.source).toBe(strip.props.source)
    expect((await part('bar-test working'))!.props.source).toBe(ring.props.source)
  }
  expect((await figures()).props.source).not.toBe(before)
  await ui.unmount()
})

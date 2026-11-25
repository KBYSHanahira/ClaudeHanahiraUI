// The handlers themselves, run against a stand-in engine. What they count is tested elsewhere;
// here: whatever the engine or a tool hands over, the user's action goes through and its result
// comes back unchanged (the band's own failure is the band's alone).
import { describe, expect, test } from 'claude-code/testing'
import { register } from './register'
import { accentFor, prettyModel } from './agents'

type Handler = (...a: any[]) => any
const handlers = new Map<string, Handler[]>()
const catches = new Map<string, Handler>()
register(((event: string, a: unknown, b?: unknown) => {
  const h = (typeof a === 'function' ? a : b) as Handler
  const key = typeof a === 'function' ? event : `${event}:${JSON.stringify(a)}`
  handlers.set(key, [...(handlers.get(key) ?? []), h])
  return { catch: (c: Handler) => void catches.set(key, c) }
}) as never, undefined as never)
const one = (key: string) => {
  const h = handlers.get(key)?.[0]
  if (!h) throw new Error(`no handler for ${key}: ${[...handlers.keys()].join(', ')}`)
  return h
}

const engine = (over: Record<string, unknown> = {}) => ({
  plugin: { name: 'band' },
  clock: { now: async () => 1_000_000, every: () => ({ cancel() {} }), after: () => ({ cancel() {} }) },
  session: { usage: async () => ({}), messages: async () => [null, { role: 'user', text: 7 }], cwd: async () => '/x', id: async () => 's', authorize: async () => null },
  agent: { list: async () => [] },
  process: { run: async () => ({ exitCode: 1, stdout: '' }) },
  http: { fetch: async () => ({ ok: false, status: 500, text: '' }) },
  ui: { log() {} },
  ...over,
})
// An engine whose every call fails: the worst the band can be handed.
const broken = () =>
  engine({
    clock: { now: async () => Promise.reject(new Error('clock')), every: () => { throw new Error('every') }, after: () => { throw new Error('after') } },
    session: { usage: async () => { throw new Error('usage') }, messages: async () => { throw new Error('rows') }, cwd: async () => { throw new Error('cwd') } },
  })

describe('handlers pass the action through', () => {
  test('tool.call with an MCP tool whose command is a list and whose result is null', async () => {
    const next = async () => null
    for (const $ of [engine(), broken()]) {
      expect(await one('tool.call')($, { tool: 'mcp__x__run', command: ['git', 'status'], pattern: { a: 1 }, file_path: 5, tool_use_id: 't' }, next)).toBe(null)
      expect(await one('tool.call')($, { tool: 'Bash', command: 5, tool_use_id: 't' }, async () => ({ result: null }))).toEqual({ result: null })
      expect(await one('tool.call')($, { tool: 'Agent', tool_use_id: 't' }, async () => undefined)).toBe(undefined)
    }
  })
  test('the Bash guard still refuses, and lets a non-string command through to the engine', async () => {
    const guard = one('tool.call:{"tool":"Bash"}')
    expect(await guard(engine(), { command: 'docker compose down -v' }, async () => 'ran')).toHaveProperty('deny')
    expect(await guard(engine(), { command: 'ls' }, async () => 'ran')).toBe('ran')
    expect(await guard(engine(), { command: undefined }, async () => 'ran')).toBe('ran')
  })
  test('prompt.submit, the Skill call, turn.start, turn.complete, agent.spawn, session events', async () => {
    for (const $ of [engine(), broken()]) {
      expect(await one('prompt.submit')($, { text: '/hanahira-claude-ui status' }, async () => 'p')).toBe('p')
      expect(await one('prompt.submit')($, { text: undefined }, async () => 'p')).toBe('p')
      expect(await one('tool.call:{"tool":"Skill"}')($, { skill: undefined }, async () => 's')).toBe('s')
      expect(await one('turn.start')($, {}, async () => 't')).toBe('t')
      expect(await one('turn.start')($, { agentId: 'a1' }, async () => 't')).toBe('t')
      expect(await one('turn.complete')($, { reason: 'end', durationMs: NaN }, async () => 'c')).toBe('c')
      expect(await one('turn.complete')($, { agentId: 'a1', reason: 'error' }, async () => 'c')).toBe('c')
      expect(await one('agent.spawn')($, { description: 'd', subagentType: 'x' }, async () => null)).toBe(null)
      expect(await one('agent.spawn')($, { description: 'd', subagentType: 'x', tool_use_id: 't' }, async () => ({ agentId: 'a1' }))).toEqual({ agentId: 'a1' })
      expect(await one('session.start')($, {}, async () => 'ss')).toBe('ss')
      expect(await one('session.measure')($, {}, async () => 'sm')).toBe('sm')
    }
  })
  test('turn.step yields every piece and returns the result, text or no text, usage or none', async () => {
    const pieces = [{ kind: 'thinking' }, { kind: 'thinking', text: undefined }, { kind: 'text', text: 'hi' }, { kind: 'input', json: null }, { kind: 'other' }]
    for (const $ of [engine(), broken()]) {
      for (const result of [{ usage: { output_tokens: 80, input_tokens: 1, model: 'claude-mythos-5-2' } }, { usage: null }, null]) {
        const stream = Object.assign((async function* () { yield* pieces })(), { result: Promise.resolve(result) })
        const gen = one('turn.step')($, {}, () => stream)
        const seen: unknown[] = []
        let step = await gen.next()
        while (!step.done) { seen.push(step.value); step = await gen.next() }
        expect(seen).toEqual(pieces)
        expect(step.value).toBe(result)
      }
    }
  })
  test('every gating hook has a fallback; the Bash guard refuses a risky command it never got to judge', async () => {
    for (const key of ['prompt.submit', 'tool.call:{"tool":"Skill"}', 'agent.spawn', 'tool.call']) {
      expect(await catches.get(key)!(engine(), {}, Object.assign(async () => 'through', { called: false }))).toBe('through')
    }
    const guard = catches.get('tool.call:{"tool":"Bash"}')!
    const next = (called: boolean) => Object.assign(async () => 'ran', { called })
    expect(await guard(engine(), { command: 'docker compose down --volumes' }, next(false))).toHaveProperty('deny')
    expect(await guard(engine(), { command: 'sudo ufw enable' }, next(false))).toHaveProperty('deny')
    expect(await guard(engine(), { command: 'ls -la' }, next(false))).toBe('ran')
    expect(await guard(engine(), { command: 'docker compose down -v' }, next(true))).toBe('ran')
  })
  test('an error from the engine itself still reaches the caller', async () => {
    await expect(one('tool.call')(engine(), { tool: 'Read', tool_use_id: 't' }, async () => { throw new Error('tool failed') })).rejects.toThrow('tool failed')
  })
})

describe('model names', () => {
  test('Mythos has its colour; a missing model or a suffixed alias does not throw', () => {
    expect(accentFor(null, 'claude-mythos-5-2')).toBe(accentFor(null, 'claude-fable-5-2'))
    expect(accentFor('constructor', 'opus')).toBe(accentFor(null, 'opus'))
    expect(prettyModel(undefined as never)).toBe('')
    expect(prettyModel('opus[1m]')).toBe('Opus')
    expect(prettyModel('claude-mythos-5-2')).toBe('Mythos 5.2')
  })
})

// State that is kept, a clock that moves, and timers that can be fired.
describe('handlers against kept state', () => {
  const state = new Map<string, unknown>()
  const timers: (() => unknown)[] = []
  let clock = 1_000_000
  const live = () => {
    ;(globalThis as { __bandState?: unknown }).__bandState = state
    return engine({
      clock: {
        now: async () => (clock += 500),
        every: (_ms: number, f: () => unknown) => (timers.push(f), { cancel() {} }),
        after: (_ms: number, f: () => unknown) => (timers.push(f), { cancel() {} }),
      },
      session: { usage: async () => ({ context: { percent: 12, tokens: 24_000, window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 3 }] }), messages: async () => [], cwd: async () => '/x', id: async () => 's', authorize: async () => null },
    })
  }
  const stream = (pieces: unknown[], result: unknown) => Object.assign((async function* () { yield* pieces })(), { result: Promise.resolve(result) })
  const drain = async (gen: AsyncGenerator<unknown, unknown>) => { let s = await gen.next(); while (!s.done) s = await gen.next(); return s.value }
  // The kept state is this block's alone: no other test file may find it set.
  const done = () => void ((globalThis as { __bandState?: unknown }).__bandState = undefined)

  test('a response is counted: tokens, model, speed and the usage reading', async () => {
    state.clear()
    const $ = live()
    const result = { usage: { input_tokens: 10, output_tokens: 100, cache_read_input_tokens: 5, cache_creation_input_tokens: 2, model: 'claude-mythos-5-2' } }
    expect(await drain(one('turn.step')($, {}, () => stream([{ kind: 'thinking' }, { kind: 'text', text: 'hello world' }], result)))).toBe(result)
    expect(state.get('tokens')).toMatchObject({ input: 10, output: 100, cacheRead: 5, cacheWrite: 2 })
    expect(state.get('model')).toBe('claude-mythos-5-2')
    expect((state.get('speed') as { tps: number }).tps).toBeGreaterThan(0)
    expect(state.get('usage')).toMatchObject({ percent: 12, tokens: 24_000, window: 200_000, limits: [{ kind: 'five_hour', percentUsed: 3 }] })
    done()
  })
  test('stored values of the wrong shape cost nothing of the user\'s', async () => {
    state.clear()
    for (const [k, v] of [['agents', [null, 7, { id: 'a1', name: 'x', status: 'running', kind: 'agent' }]], ['usage', null], ['speed', null], ['stats', null], ['tokens', 'x'], ['skill', 5], ['scoped', { limits: [null] }], ['outcome', 'weird']] as const) state.set(k, v)
    const $ = live()
    expect(await one('tool.call')($, { tool: 'Read', file_path: '/a/b.ts', tool_use_id: 't', agentId: 'a1' }, async () => 'r')).toBe('r')
    expect(await one('turn.start')($, {}, async () => 't')).toBe('t')
    expect(await drain(one('turn.step')($, { agentId: 'a1' }, () => stream([{ kind: 'text', text: 'x' }], { usage: { output_tokens: 5 } })))).toEqual({ usage: { output_tokens: 5 } })
    expect(await one('prompt.submit')($, { text: '<task-notification><task-id>a1</task-id><status>completed</status></task-notification>' }, async () => 'p')).toBe('p')
    expect(await one('turn.complete')($, { reason: 'end', durationMs: 1200 }, async () => 'c')).toBe('c')
    expect(await one('session.start')($, {}, async () => 's')).toBe('s')
    // ...and the band's own figures come out whole: the one real card counted and settled, the
    // junk dropped, the counts numbers (a stored string is not spread into them).
    expect(state.get('agents')).toMatchObject([{ id: 'a1', status: 'done', tools: 1, output: 5 }])
    expect(state.get('tokens')).toEqual({ input: 0, output: 5, cacheRead: 0, cacheWrite: 0 })
    expect(state.get('usage')).toMatchObject({ percent: 12, window: 200_000 })
    done()
  })
  test('a background command the host lost sight of is stopped, and one whose file was deleted but is still held is not', async () => {
    state.clear()
    clock = 5_000_000
    const card = (id: string) => ({ id, name: id, kind: 'shell', type: 'shell', status: 'running', startedAt: 1, endedAt: null, tools: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, model: '', effort: null, background: true })
    state.set('agents', [card('held'), card('lost')])
    const beats: (() => unknown)[] = []
    const $ = live()
    Object.assign($, {
      clock: { ...$.clock, every: (_ms: number, f: () => unknown) => (beats.push(f), { cancel() {} }) },
      process: { run: async () => ({ exitCode: 0, stdout: 'H /tmp/claude-1/p/s/tasks/held.output (deleted)\nOK\n' }) },
    })
    await one('session.start')($, {}, async () => 's') // starts the agents' beat
    const settle = async () => { for (let i = 0; i < 5; i++) for (const f of beats) await f(); await new Promise<void>(r => (globalThis as unknown as { setTimeout: (f: () => void, ms: number) => void }).setTimeout(r, 5)) }
    await settle() // first look: missing, noted
    clock += 10_000
    await settle() // a later look: still missing, stopped
    const cards = state.get('agents') as { id: string; status: string }[]
    expect(cards.find(a => a.id === 'held')?.status).toBe('running')
    expect(cards.find(a => a.id === 'lost')?.status).toBe('stopped')
    // Its notification, arriving later, still names how it really ended.
    await one('prompt.submit')($, { text: '<task-notification><task-id>lost</task-id><status>completed</status></task-notification>' }, async () => 'p')
    expect((state.get('agents') as { id: string; status: string }[]).find(a => a.id === 'lost')?.status).toBe('done')
    done()
  })
  test('every timer the handlers set can fire without an unhandled rejection', async () => {
    // Its own timers: a turn, a finished agent and a settled card each set one.
    state.clear()
    timers.length = 0
    const $ = live()
    await one('turn.start')($, {}, async () => 't')
    await one('agent.spawn')($, { description: 'd', subagentType: 'x', tool_use_id: 't' }, async () => ({ agentId: 'a9' }))
    await one('turn.complete')($, { agentId: 'a9', reason: 'end' }, async () => 'c')
    const seen: unknown[] = []
    const onReject = (err: unknown) => void seen.push(err)
    const host = globalThis as unknown as { process: { on: (e: string, f: (err: unknown) => void) => void; off: (e: string, f: (err: unknown) => void) => void }; setTimeout: (f: () => void, ms: number) => void }
    host.process.on('unhandledRejection', onReject)
    try {
      expect(timers.length).toBeGreaterThanOrEqual(2)
      // The store now refuses every write: what a timer does must still be caught.
      const refusing = new Map<string, unknown>()
      refusing.set = () => { throw new Error('store') }
      ;(globalThis as { __bandState?: unknown }).__bandState = refusing
      for (const f of timers.splice(0)) { try { await f() } catch (err) { seen.push(err) } }
      await new Promise<void>(r => host.setTimeout(r, 20))
      expect(seen).toEqual([])
    } finally {
      host.process.off('unhandledRejection', onReject)
      done()
    }
  })
})

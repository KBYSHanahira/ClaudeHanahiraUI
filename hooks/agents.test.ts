import { describe, expect, test } from 'claude-code/testing'

import type { Agent } from '../types'
import { fmtClock, HUE, INK, LIGHT } from './chat'
import { AGENT_CHIP, agentSpec, SHELL_COLOR, accentFor, agentChipParts, kindLabel, settledStatus, shellFates, taskNotice, agentStats, agentUsd, prettyModel, spriteInner, totalTokens, usd, visibleAgents } from './agents'

/** Rounded to cents: the engine's test kit has no toBeCloseTo. */
const cents = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100)

const mk = (over: Partial<Agent> = {}): Agent => ({
  id: 'a1',
  name: 'Build the landing page',
  type: 'general-purpose',
  model: 'claude-opus-5-5',
  effort: null,
  background: true,
  status: 'running',
  startedAt: 1000,
  endedAt: null,
  tools: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  ...over,
})

describe('accent and model name', () => {
  test('the accent follows the effort when it is known, else the model family, else grey', () => {
    expect(accentFor('low', 'x')).toBe(HUE.steel)
    expect(accentFor('medium', 'x')).toBe(HUE.amber)
    expect(accentFor('high', 'x')).toBe(HUE.signal)
    expect(accentFor('xhigh', 'x')).toBe(HUE.ember)
    expect(accentFor('max', 'x')).toBe(HUE.ember)
    expect(accentFor(null, 'claude-haiku-5-5')).toBe(HUE.steel)
    expect(accentFor(null, 'claude-sonnet-5-5')).toBe(HUE.amber)
    expect(accentFor(null, 'claude-opus-5-5')).toBe(HUE.signal)
    expect(accentFor(null, 'claude-fable-5-2')).toBe(HUE.ember)
    expect(accentFor(null, 'mystery')).toBe(INK.label)
  })

  test('prettyModel reads the current naming', () => {
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(prettyModel('claude-sonnet-4-6')).toBe('Sonnet 4.6')
    expect(prettyModel('claude-fable-5-1')).toBe('Fable 5.1')
    expect(prettyModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(prettyModel('claude-opus-4-20250514')).toBe('Opus 4')
  })

  test('prettyModel reads the older naming order and ignores a date', () => {
    expect(prettyModel('claude-3-5-haiku-20241022')).toBe('Haiku 3.5')
    expect(prettyModel('claude-3-opus-20240229')).toBe('Opus 3')
  })

  test('a bare alias is the family; anything unreadable is shown exactly as given', () => {
    expect(prettyModel('haiku')).toBe('Haiku')
    expect(prettyModel('Sonnet')).toBe('Sonnet')
    expect(prettyModel('gpt-x-9')).toBe('gpt-x-9')
    expect(prettyModel('claude-haiku-20241022')).not.toContain('20241022 ')
  })
})

describe('cost', () => {
  const c = { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }

  test('an unknown model has no price: null, never another model\'s', () => {
    expect(agentUsd('mystery-model', c)).toBeNull()
    expect(agentUsd('', c)).toBeNull()
  })

  test('prices by version, as the pricing page lists them', () => {
    expect(cents(agentUsd('claude-sonnet-5-5', c))).toBe(12)
    expect(cents(agentUsd('claude-haiku-5-5', c))).toBe(0.6)
    expect(cents(agentUsd('claude-opus-5-5', c))).toBe(24)
    expect(cents(agentUsd('claude-opus-4-5', c))).toBe(30)
    expect(cents(agentUsd('claude-opus-4-1', c))).toBe(90)
    expect(cents(agentUsd('claude-fable-5-1', c))).toBe(60)
    expect(cents(agentUsd('claude-3-5-haiku-20241022', c))).toBe(4.8)
    expect(cents(agentUsd('claude-mythos-5-1', c))).toBe(60)
  })

  test('a bare alias is the newest version; a version the table lacks is null', () => {
    expect(cents(agentUsd('opus', c))).toBe(24)
    expect(agentUsd('claude-opus-9-9', c)).toBeNull()
  })

  test('cache tokens use their own rates, and totals add up', () => {
    expect(cents(agentUsd('claude-fable-5-1', { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 1_000_000 }))).toBe(12.75)
    // Sonnet 5.5 cache reads are $0.10/MTok, half of Opus 5.5's.
    expect(cents(agentUsd('claude-sonnet-5-5', { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 }))).toBe(0.1)
    // Fable 5.2 and Mythos 5.2: $8 in, $40 out, $0.20 cache reads, $10 cache writes.
    expect(cents(agentUsd('claude-fable-5-2', { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }))).toBe(58.2)
    expect(cents(agentUsd('claude-mythos-5-2', { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 }))).toBe(8)
    // The bare alias means the newest version.
    expect(cents(agentUsd('fable', { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 }))).toBe(8)
    expect(totalTokens({ input: 1, output: 2, cacheRead: 3, cacheWrite: 4 })).toBe(10)
    expect(usd(0.29)).toBe('$0.29')
    expect(usd(0.001)).toBe('$0.00')
    expect(usd(null)).toBe('—')
  })
})

describe('visibleAgents', () => {
  test('running first, then recently finished, newest first, capped', () => {
    const list = [
      mk({ id: 'old', status: 'done', endedAt: 1000 }),
      mk({ id: 'fresh', status: 'done', endedAt: 290_000 }),
      mk({ id: 'run', status: 'running' }),
      mk({ id: 'fresher', status: 'done', endedAt: 295_000 }),
    ]
    const { shown, more } = visibleAgents(list, 300_000, { max: 3, keepMs: 120_000 })
    expect(shown.map(a => a.id)).toEqual(['run', 'fresher', 'fresh'])
    expect(more).toBe(0)
    expect(visibleAgents(list, 300_000, { max: 2 }).more).toBe(1)
  })

  test('nothing running and nothing recent is an empty strip', () => {
    expect(visibleAgents([mk({ status: 'done', endedAt: 1 })], 999_999).shown).toEqual([])
  })

  test('a finished card still leaves after the clock steps back past it', () => {
    expect(visibleAgents([mk({ status: 'done', endedAt: 1000 })], -1e6, { keepMs: 3000 }).shown).toEqual([])
    expect(visibleAgents([mk({ status: 'done', endedAt: 1000 })], 999, { keepMs: 3000 }).shown.length).toBe(1)
  })

  test('a max below zero shows nothing and counts every agent as more', () => {
    const list = Array.from({ length: 5 }, (_, i) => mk({ id: `a${i}` }))
    expect(visibleAgents(list, 0, { max: -1 })).toMatchObject({ shown: [], more: 5 })
  })
})

describe('agent card', () => {

  test('a running card carries no ticking clock, so its stats line holds still between events', () => {
    expect(agentStats(mk({ startedAt: 0 }))).toBe(agentStats(mk({ startedAt: 0 })))
    expect(agentStats(mk({ startedAt: 0 }))).toContain('working')
  })

  test('a long stats line is cut in its figures, never in the time', () => {
    const line = agentStats(mk({ status: 'done', startedAt: 0, endedAt: 36_000_000, tools: 12345, output: 1e10 }))
    expect(line.length).toBeLessThanOrEqual(40)
    expect(line.endsWith(` · ${fmtClock(36_000_000)}`)).toBe(true)
  })

  test('counts that are no reading show a dash, not NaN or a cost', () => {
    expect(agentStats(mk({ input: NaN }))).toBe('0 tools · — · — · working')
    expect(agentUsd('claude-opus-5-5', mk({ output: -5 }))).toBeNull()
  })

  test('a time that is no reading shows a dash, not NaN', () => {
    const line = agentStats(mk({ status: 'done', startedAt: NaN, endedAt: 5000 }))
    expect(line.endsWith(' · —')).toBe(true)
    expect(line).not.toContain('NaN')
    expect(usd(NaN)).toBe('—')
    expect(usd(Infinity)).toBe('—')
  })

  test('the sprite is the same for the same agent and differs between agents', () => {
    expect(spriteInner('x', '#fff')).toBe(spriteInner('x', '#fff'))
    expect(spriteInner('x', '#fff')).not.toBe(spriteInner('y', '#fff'))
  })
})

describe('small agent card', () => {
  test('one line: its two pictures are the chip height and lie edge to edge', () => {
    const p = agentChipParts(mk(), { padBottom: 4 })
    expect(p.body.width + p.mark.width).toBe(AGENT_CHIP.W)
    expect(p.body.height).toBe(AGENT_CHIP.H + 4)
    expect(p.mark.height).toBe(AGENT_CHIP.H + 4)
  })

  test('the same agent draws the same card', () => {
    expect(agentChipParts(mk()).body.svg).toBe(agentChipParts(mk()).body.svg)
  })

  test('a running mark is one picture whatever the figures do: no figure, no clock in it', () => {
    const at = (tools: number, tps: number) => agentChipParts(mk({ tools, tps, input: tools * 1000 }), { motion: true })
    expect(at(1, 20).mark.svg).toBe(at(9, 140).mark.svg)
    const mark = at(1, 20).mark.svg
    expect(mark).toContain('infinite')
    expect(mark).toContain('class="pulse"')
    expect(mark).toContain('prefers-reduced-motion: reduce')
  })

  test('the frame is sharp with its top-right corner cut, in the mark piece', () => {
    const { W, H } = AGENT_CHIP
    const p = agentChipParts(mk())
    expect(p.mark.svg).toContain(`L${W - 0.5} 7.5V${H - 0.5}`)
    expect(p.body.svg).toContain('<path d="M0.5 0.5H')
  })

  test('every colour it draws in follows the light theme', () => {
    const swapped = new Set(Object.keys(LIGHT))
    for (const a of [mk(), mk({ effort: 'low' }), mk({ effort: 'medium', status: 'done', endedAt: 5 }), mk({ effort: 'xhigh', status: 'error', endedAt: 5 }), mk({ status: 'stopped', endedAt: 5 }), mk({ kind: 'shell', model: '' }), mk({ model: 'mystery' })]) {
      const p = agentChipParts(a, { motion: true })
      for (const svg of [p.body.svg, p.mark.svg]) {
        for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)) expect(swapped.has(m[1]!)).toBe(true)
      }
    }
  })

  test('a running card wears its accent: the frame, the rail and its code', () => {
    const run = agentChipParts(mk({ id: 'agt_k3', effort: 'low' })).body.svg
    expect(run).toContain(`stroke="${HUE.steel}"`)
    expect(run).toContain('>OP-K3<')
    const done = agentChipParts(mk({ id: 'agt_k3', effort: 'low', status: 'done', endedAt: 5 })).body.svg
    expect(done).not.toContain('OP-K3')
    expect(done).toContain(`stroke="${INK.line}"`)
  })

  test('a running card turns its square only with motion; a finished one shows a check', () => {
    expect(agentChipParts(mk(), { motion: true }).mark.svg).toContain('class="spin"')
    expect(agentChipParts(mk()).mark.svg).not.toContain('class="spin"')
    const done = agentChipParts(mk({ status: 'done', endedAt: 5000 }), { motion: true }).mark.svg
    expect(done).toContain('class="tick"')
    expect(done).not.toContain('spin')
  })

  test('a long name is fitted to its room and escaped', () => {
    const room = AGENT_CHIP.W - AGENT_CHIP.markW
    const fitted = (svg: string) => Math.max(...[...svg.matchAll(/<text x="([\d.]+)"[^>]*textLength="([\d.]+)"/g)].map(m => Number(m[1]) + Number(m[2])))
    expect(fitted(agentChipParts(mk({ name: 'Research competitor launches & write up' })).body.svg)).toBeLessThanOrEqual(room)
    expect(fitted(agentChipParts(mk({ name: 'Short', model: '', kind: 'shell' })).body.svg)).toBeLessThan(room - 40)
    expect(agentChipParts(mk({ name: 'a<b' })).body.svg).toContain('A&lt;B')
    expect(agentChipParts(mk()).body.svg).not.toContain(`rx="${AGENT_CHIP.H / 2}"`)
  })
})

describe('what an agent runs on', () => {
  test('the chip says the model and the effort; unknown parts are left out, never guessed', () => {
    const svg = agentChipParts(mk({ model: 'claude-sonnet-5-5', effort: 'low' })).body.svg
    expect(svg).toContain('>SONNET 5.5<')
    expect(svg).toContain('>LOW<')
    expect(agentSpec(mk({ model: 'claude-opus-5-5', effort: 'high' }))).toBe('Opus 5.5 · high')
    expect(agentSpec(mk({ model: '', effort: null }))).toBe('model pending')
    expect(agentChipParts(mk({ model: '', effort: null })).body.svg).toContain('>MODEL PENDING<')
    for (const w of ['LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX']) expect(agentChipParts(mk({ effort: null })).body.svg).not.toContain(`>${w}<`)
    expect(agentSpec(mk({ kind: 'shell', model: '' }))).toBe('')
  })

  test('the chip says how fast the agent answers, once that is measured', () => {
    expect(agentSpec(mk({ model: 'claude-haiku-5-5', effort: 'low', tps: 82.4 }))).toBe('Haiku 5.5 · low · 82 tok/s')
    expect(agentSpec(mk({ model: 'claude-haiku-5-5', effort: 'low', tps: 6.25 }))).toBe('Haiku 5.5 · low · 6.3 tok/s')
    expect(agentChipParts(mk({ model: 'claude-haiku-5-5', tps: 82 })).body.svg).toContain('>82 TOK/S<')
    for (const tps of [null, undefined, 0, NaN]) expect(agentChipParts(mk({ tps })).body.svg).not.toContain('TOK/S')
  })

  test('a long name stops short of the model and effort', () => {
    const svg = agentChipParts(mk({ name: 'Research competitor launches & write up', model: 'claude-haiku-5-5', effort: 'medium' })).body.svg
    const texts = [...svg.matchAll(/<text x="([\d.]+)"[^>]*textLength="([\d.]+)"[^>]*>([^<]*)</g)].map(m => ({ x: Number(m[1]), w: Number(m[2]), t: m[3] ?? '' }))
    const name = texts.find(t => t.t.startsWith('RESEARCH'))!
    const model = texts.find(t => t.t === 'HAIKU 5.5')!
    expect(name.x + name.w).toBeLessThan(model.x)
    expect(Math.max(...texts.map(t => t.x + t.w))).toBeLessThanOrEqual(AGENT_CHIP.W - AGENT_CHIP.markW)
  })
})

describe('agent or background app', () => {
  test('a card says what it is: an agent, or a background command (older records are agents)', () => {
    expect(kindLabel(mk())).toBe('Agent')
    expect(kindLabel(mk({ kind: 'agent' }))).toBe('Agent')
    expect(kindLabel(mk({ kind: 'shell' }))).toBe('Bg app')
    expect(agentChipParts(mk()).body.svg).toContain('>AGENT<')
    const shell = agentChipParts(mk({ kind: 'shell', model: '' })).body.svg
    expect(shell).toContain('>BG APP<')
    expect(shell).toContain(SHELL_COLOR)
  })

  test('a task notification gives its id and how it ended; other text gives nothing', () => {
    const text = '<task-notification>\n<task-id>bq7x2</task-id>\n<status>completed</status>\n<summary>done</summary>\n</task-notification>'
    expect(taskNotice(text)).toEqual({ id: 'bq7x2', status: 'completed' })
    expect(taskNotice('please show <task-id>x</task-id>')).toBeNull()
    expect(taskNotice('<task-notification><status>completed</status></task-notification>')).toBeNull()
  })

  test("the notification's word settles a card, or leaves it running", () => {
    expect(settledStatus('completed')).toBe('done')
    expect(settledStatus('failed')).toBe('error')
    expect(settledStatus('killed')).toBe('stopped')
    expect(settledStatus('running')).toBeNull()
  })
})

describe('shellFates', () => {
  const dir = '/tmp/claude-0/proj/sid/tasks'
  test('a file nobody holds is an ended command; a held one is left running', () => {
    const fates = shellFates(`H ${dir}/aaa.output\nF ${dir}/aaa.output\nF ${dir}/bbb.output\nK ${dir}/ccc.output\nOK\n`)
    expect(fates.has('aaa')).toBe(false)
    expect(fates.get('bbb')).toBe('done')
    expect(fates.get('ccc')).toBe('stopped')
  })
  test('a probe that did not finish settles nothing', () => {
    expect(shellFates(`F ${dir}/bbb.output\n`).size).toBe(0)
    expect(shellFates('').size).toBe(0)
  })
})

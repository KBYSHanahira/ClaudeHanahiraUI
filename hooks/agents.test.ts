import { describe, expect, test } from 'claude-code/testing'

import type { Agent } from '../types'
import { SPIN_S, phaseBegin } from './chat'
import { BAR_ROOM, CARD_H, CARD_W, accentFor, agentCardSvg, agentStats, agentUsd, prettyModel, spriteInner, totalTokens, usd, visibleAgents } from './agents'

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
    expect(accentFor('low', 'x')).toBe('#34c38f')
    expect(accentFor('xhigh', 'x')).toBe('#f2736b')
    expect(accentFor(null, 'claude-haiku-5-5')).toBe('#34c38f')
    expect(accentFor(null, 'claude-opus-5-5')).toBe('#e0a03a')
    expect(accentFor(null, 'mystery')).toBe('#a8a29e')
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
    expect(agentUsd('claude-sonnet-5-5', c)).toBeCloseTo(12)
    expect(agentUsd('claude-haiku-5-5', c)).toBeCloseTo(0.6)
    expect(agentUsd('claude-opus-5-5', c)).toBeCloseTo(24)
    expect(agentUsd('claude-opus-4-5', c)).toBeCloseTo(30)
    expect(agentUsd('claude-opus-4-1', c)).toBeCloseTo(90)
    expect(agentUsd('claude-fable-5-1', c)).toBeCloseTo(60)
    expect(agentUsd('claude-3-5-haiku-20241022', c)).toBeCloseTo(4.8)
    expect(agentUsd('claude-mythos-5-1', c)).toBeCloseTo(60)
  })

  test('a bare alias is the newest version; a version the table lacks is null', () => {
    expect(agentUsd('opus', c)).toBeCloseTo(24)
    expect(agentUsd('claude-opus-9-9', c)).toBeNull()
  })

  test('cache tokens use their own rates, and totals add up', () => {
    expect(agentUsd('claude-fable-5-1', { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 1_000_000 })).toBeCloseTo(12.75)
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
})

describe('agent card', () => {
  test('is deterministic and the size it says', () => {
    const a = agentCardSvg(mk(), 5000)
    expect(a.svg).toBe(agentCardSvg(mk(), 5000).svg)
    expect(a.svg).toContain(`width="${CARD_W}" height="${CARD_H}"`)
    expect(a.width).toBe(CARD_W)
  })

  test('says only what is known: no effort means no effort word, and no model means so', () => {
    const noEffort = agentCardSvg(mk({ effort: null }), 1).svg
    for (const word of ['low', 'medium', 'high', 'xhigh', 'max', 'light', 'careful', 'heavy']) {
      expect(noEffort).not.toContain(`>${word}</text>`)
    }
    const noModel = agentCardSvg(mk({ model: '' }), 1).svg
    expect(noModel).toContain('model pending')
    expect(noModel).toContain('· — ·') // and no borrowed price: the cost is a dash
  })

  test('never prints a weight word of its own', () => {
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max', null]) {
      const svg = agentCardSvg(mk({ effort }), 1).svg
      for (const word of ['>light<', '>careful<', '>heavy<']) expect(svg).not.toContain(word)
    }
  })

  test('padBottom adds transparent room under the card and leaves the card alone', () => {
    const padded = agentCardSvg(mk(), 5000, { padBottom: 8 })
    expect(padded.height).toBe(CARD_H + 8)
    expect(padded.svg).toContain(`viewBox="0 0 ${CARD_W} ${CARD_H + 8}"`)
    expect(padded.svg).toContain(`height="${CARD_H - 1.5}" rx="12"`)
  })

  test('shows the name, the tag, the model and the figures', () => {
    const svg = agentCardSvg(mk({ effort: 'xhigh', tools: 3, input: 20000, output: 1000, startedAt: 0, endedAt: 44000, status: 'done' }), 50000).svg
    expect(svg).toContain('Build the landing page')
    expect(svg).toContain('>Opus 5.5</text>')
    expect(svg).toContain('>xhigh</text>')
    expect(svg).toContain('3 tools')
    expect(svg).toContain('0:44')
  })

  test('a long name is pinned short of the status mark', () => {
    const svg = agentCardSvg(mk({ name: 'Research competitor launches and write it all up' }), 1).svg
    expect(svg).toMatch(/textLength="156"/)
    expect(agentCardSvg(mk({ name: 'Short' }), 1).svg).not.toContain('textLength')
  })

  test('a running card carries no ticking clock, so its stats line holds still between events', () => {
    expect(agentStats(mk({ startedAt: 0 }))).toBe(agentStats(mk({ startedAt: 0 })))
    expect(agentStats(mk({ startedAt: 0 }))).toContain('working')
  })

  test('a barless card leaves the bar out and holds its spinner still, for the surface to move', () => {
    const svg = agentCardSvg(mk({ startedAt: 0 }), 5_000, { barless: true })
    expect(svg.height).toBe(CARD_H - BAR_ROOM)
    expect(svg.svg).not.toContain('<animate')
    expect(svg.svg).not.toContain('fill="#2b2827"')
  })

  test('a running card picks its loops up at the phase reached since the agent started', () => {
    const svg = agentCardSvg(mk({ startedAt: 0 }), 5_000).svg
    expect(svg).toContain(`begin="${phaseBegin(5_000, SPIN_S * 1000)}"`)
    expect(svg).toContain(`begin="${phaseBegin(5_000, 1600)}"`)
  })

  test('a changed stats line rolls the old one out and the new one in', () => {
    const svg = agentCardSvg(mk({ tools: 4 }), 1_000, { fromStats: '3 tools · 0 · — · working' }).svg
    expect(svg).toContain('3 tools · 0 · — · working')
    expect(svg).toContain('from="0 0" to="0 -14"')
    expect(svg).toContain('from="0 14" to="0 0"')
    expect(agentCardSvg(mk({ tools: 4 }), 1_000).svg).not.toContain('to="0 -14"')
  })

  test('escapes a name that would break the markup', () => {
    expect(agentCardSvg(mk({ name: 'a<b>&c' }), 1).svg).toContain('a&lt;b&gt;&amp;c')
  })

  test('running turns a spinner and glides its bar one way, border still; a finished card is still', () => {
    const run = agentCardSvg(mk(), 5000).svg
    expect(run).toContain('type="rotate"')
    expect(run).toContain('keySplines="0.65 0 0.35 1"')
    expect(run).not.toContain('attributeName="stroke"')
    expect(run).toContain('repeatCount="indefinite"')
    const done = agentCardSvg(mk({ status: 'done', endedAt: 4000 }), 5000).svg
    expect(done).not.toContain('<animate')
  })

  test('pop bounces the card in; flash washes the border once', () => {
    const popped = agentCardSvg(mk({ status: 'done', endedAt: 4000 }), 5000, { pop: true }).svg
    expect(popped).toContain('type="scale" values="0.82;1.06;1"')
    const flash = agentCardSvg(mk({ status: 'done', endedAt: 4000 }), 5000, { flash: true }).svg
    expect(flash).toContain('from="#7bd88f" to="#3a3836"')
  })


  test('the status mark is drawn: a check, a cross, a ban', () => {
    for (const status of ['done', 'error', 'stopped'] as const) {
      expect(agentCardSvg(mk({ status, endedAt: 1 }), 2).svg).toContain('stroke-linecap="round"')
    }
  })

  test('the sprite is the same for the same agent and differs between agents', () => {
    expect(spriteInner('x', '#fff')).toBe(spriteInner('x', '#fff'))
    expect(spriteInner('x', '#fff')).not.toBe(spriteInner('y', '#fff'))
  })
})

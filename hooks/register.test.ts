import { describe, expect, test } from 'claude-code/testing'

import { CHANGE_MS, DANGEROUS, asList, clip, glyph, limitLabel, shortLimitLabel, contextLeft, limitLeft, meter, forgetChanges, noteChange, ringSvg, tone, top } from './register'


describe('guard pattern', () => {
  test('matches the dangerous commands', () => {
    expect(DANGEROUS.test('docker compose down -v')).toBe(true)
    expect(DANGEROUS.test('sudo ufw  enable')).toBe(true)
  })

  test('lets normal commands through', () => {
    expect(DANGEROUS.test('docker compose up -d --build')).toBe(false)
    expect(DANGEROUS.test('docker compose ps')).toBe(false)
    expect(DANGEROUS.test('sudo ufw allow 9020/tcp')).toBe(false)
  })

  test('catches the other spellings of removing volumes', () => {
    expect(DANGEROUS.test('docker-compose down -v')).toBe(true)
    expect(DANGEROUS.test('docker compose down --volumes')).toBe(true)
    expect(DANGEROUS.test('docker compose -f prod.yml down --rmi all -v')).toBe(true)
    expect(DANGEROUS.test('sudo ufw --force enable')).toBe(true)
  })

  test('a flag that only contains v, or a later command, is not a volume removal', () => {
    expect(DANGEROUS.test('docker compose down --verbose')).toBe(false)
    expect(DANGEROUS.test('docker compose down && git log -v')).toBe(false)
    expect(DANGEROUS.test('docker compose down; ls -v')).toBe(false)
  })
})

describe('stats helpers', () => {
  test('top sorts by count then name and limits', () => {
    expect(top({ Read: 2, Bash: 5, Edit: 2, Grep: 1 }, 3)).toEqual([
      ['Bash', 5],
      ['Edit', 2],
      ['Read', 2],
    ])
  })

  test('clip shortens with an ellipsis', () => {
    expect(clip('abcdef', 4)).toBe('abc…')
    expect(clip('abc', 4)).toBe('abc')
  })
})

describe('usage helpers', () => {

  test('meter fills and clamps', () => {
    expect(meter(50, 10)).toEqual({ filled: '▰'.repeat(5), rest: '▱'.repeat(5) })
    expect(meter(150, 4).rest).toBe('')
    expect(meter(-5, 4).filled).toBe('')
  })

  test('tone turns amber then red', () => {
    expect(tone(10)).toBe('#7bd88f')
    expect(tone(60)).toBe('#f2c94c')
    expect(tone(85)).toBe('#f2736b')
  })
})

describe('rings', () => {
  test('ringSvg draws a track and a proportional arc', () => {
    const svg = ringSvg(25, '#e8825f', 40)
    expect(svg).toContain('width="40"')
    expect(svg).toContain('stroke="#e8825f"')
    const c = 2 * Math.PI * 19.5
    expect(svg).toContain(`stroke-dasharray="${(c / 4).toFixed(2)} ${c.toFixed(2)}"`)
  })

  test('ringSvg omits the arc at zero and clamps over 100', () => {
    expect(ringSvg(0, '#fff', 40)).not.toContain('stroke-dasharray')
    const c = 2 * Math.PI * 19.5
    expect(ringSvg(250, '#fff', 40)).toContain(`stroke-dasharray="${c.toFixed(2)} ${c.toFixed(2)}"`)
  })

  test('glyph steps through quarters', () => {
    expect([0, 25, 50, 75, 100].map(glyph)).toEqual(['○', '◔', '◑', '◕', '●'])
  })

  test('limitLabel names the windows', () => {
    expect(limitLabel('five_hour')).toBe('5-hour limit')
    expect(limitLabel('seven_day')).toBe('7-day limit')
    expect(limitLabel('other')).toBe('other')
    expect(shortLimitLabel('five_hour')).toBe('5h limit')
    expect(shortLimitLabel('seven_day')).toBe('7d limit')
    expect(shortLimitLabel('spend_limit')).toBe('spend limit')
  })

  test('what is left: tokens of the context window, a share of a limit', () => {
    expect(contextLeft(279_000, 1_000_000, 28)).toBe('721k left')
    expect(contextLeft(null, null, 28)).toBe('72% left')
    expect(contextLeft(null, null, null)).toBeNull()
    expect(contextLeft(1_200_000, 1_000_000, 100)).toBe('0 left')
    expect(limitLeft(12)).toBe('88% left')
    expect(limitLeft(20.6)).toBe('79% left')
    expect(limitLeft(130)).toBe('0% left')
  })
})


describe('ring motion', () => {
  test('grows from the last drawn value', () => {
    const svg = ringSvg(60, '#e8825f', 38, { from: 20 })
    const c = 2 * Math.PI * 19.5
    expect(svg).toContain(`attributeName="stroke-dasharray" from="${(c * 0.2).toFixed(2)} ${c.toFixed(2)}" to="${(c * 0.6).toFixed(2)} ${c.toFixed(2)}"`)
  })

  test('an unchanged ring is still; a pulsing one breathes', () => {
    expect(ringSvg(60, '#e8825f', 38, { from: 60 })).not.toContain('<animate')
    expect(ringSvg(90, '#f2736b', 38, { from: 90, pulse: true })).toContain('values="1;0.55;1"')
  })
})

describe('asList', () => {
  test('passes a real list through', () => {
    const a = [{ id: 'x' }]
    expect(asList(a)).toBe(a as never)
  })

  test('turns anything else a stored value might be into an empty list', () => {
    for (const bad of [undefined, null, 0, 5, 'x', {}, { length: 2 }, true]) expect(asList(bad)).toEqual([])
  })
})

describe('noteChange', () => {
  test('a figure rolls only in the moment it changes, never again on a later redraw', () => {
    expect(noteChange('t:a', '$1', 0).from).toBeUndefined() // first sight: still
    expect(noteChange('t:a', '$1', 500).from).toBeUndefined() // same value: still
    expect(noteChange('t:a', '$2', 1_000).from).toBe('$1') // changed: rolls from $1
    expect(noteChange('t:a', '$2', 1_000 + CHANGE_MS - 1).from).toBe('$1') // a redraw inside the window: same picture
    expect(noteChange('t:a', '$2', 1_000 + CHANGE_MS).from).toBeUndefined() // after it: still for good
    expect(noteChange('t:a', '$2', 60_000).from).toBeUndefined()
  })

  test('only the changes that count move: the tool counter rolls when it grows, not when it resets', () => {
    const grows = { counts: (a: number, b: number) => b > a }
    noteChange('t:n', 4, 0, grows)
    expect(noteChange('t:n', 5, 100, grows).from).toBe(4)
    expect(noteChange('t:n', 0, 5_000, grows).from).toBeUndefined()
  })

  test('first makes the first sight a change: a ring grows in from 0, once', () => {
    expect(noteChange('t:r', 40, 0, { first: 0 }).from).toBe(0)
    expect(noteChange('t:r', 40, CHANGE_MS).from).toBeUndefined()
  })
})

describe('forgetChanges', () => {
  test('drops what it remembers for agents that are gone, keeps the rest', () => {
    noteChange('agent:gone', 'a', 0)
    noteChange('agent:kept', 'a', 0)
    forgetChanges('agent:', new Set(['kept']))
    // A forgotten agent is new again: its next figure is a first sight, so it does not roll.
    expect(noteChange('agent:gone', 'b', 100).from).toBeUndefined()
    expect(noteChange('agent:kept', 'b', 100).from).toBe('a')
  })
})

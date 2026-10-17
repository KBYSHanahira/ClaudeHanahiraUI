import { describe, expect, test } from 'claude-code/testing'

import { CARD_BREATHE_MS, KIND_ICON, fmtReset, badgeSvg, cardSvg, phaseBegin, countSvg, dotSvg, countChanges, describe as describeCall, diffRows, fmtClock, fmtCost, fmtDuration,
  fmtElapsed, fmtTokens, fmtSpeed, tokensPerSec, parseTests, pillSvg, loadingSvg, statusPill } from './chat'

describe('describe', () => {
  test('Bash runs, then reruns', () => {
    expect(describeCall('Bash', { command: 'bun test' }).verb).toBe('Run')
    expect(describeCall('Bash', { command: 'bun test' }, true).verb).toBe('Rerun')
  })

  test('file tools show the file name', () => {
    expect(describeCall('Edit', { file_path: '/a/b/register.tsx' })).toEqual({ kind: 'edit', verb: 'Edit', target: 'register.tsx' })
    expect(describeCall('Read', { file_path: '/x/y.ts' }).target).toBe('y.ts')
  })

  test('mcp tools fall back to their short name', () => {
    expect(describeCall('mcp__srv__do_thing', {}).target).toBe('do_thing')
  })
})

describe('statusPill', () => {
  const idle = { isRunning: false, isErrored: false, isInterrupted: false }

  test('running, errored, interrupted', () => {
    expect(statusPill('Bash', { ...idle, isRunning: true })).toMatchObject({ text: 'running', running: true })
    expect(statusPill('Bash', { ...idle, isErrored: true })).toMatchObject({ text: 'error', icon: 'cross' })
    expect(statusPill('Bash', { ...idle, isInterrupted: true })).toMatchObject({ text: 'interrupted', icon: 'ban' })
  })

  test('Bash reads test counts', () => {
    expect(statusPill('Bash', { ...idle, output: { stdout: ' 3 pass\n 0 fail' } })).toMatchObject({ text: '3 passed', icon: 'check' })
    expect(statusPill('Bash', { ...idle, output: { stdout: '2 pass\n1 fail' } })).toMatchObject({ text: '1 failed', icon: 'cross' })
    expect(statusPill('Bash', { ...idle, output: { stdout: 'ok' } })).toMatchObject({ text: 'done', icon: 'check' })
  })

  test('Edit is saved, Read counts lines', () => {
    expect(statusPill('Edit', idle)).toMatchObject({ text: 'saved', icon: 'check' })
    expect(statusPill('Read', { ...idle, output: { file: { numLines: 12 } } })).toMatchObject({ text: '12 lines', icon: 'check' })
  })
})

describe('parseTests', () => {
  test('finds passed and failed', () => {
    expect(parseTests('Tests: 4 passed, 2 failed')).toEqual({ passed: 4, failed: 2 })
    expect(parseTests('nothing here')).toEqual({ passed: null, failed: null })
  })
})

describe('diffRows', () => {
  const hunks = [{ oldStart: 5, newStart: 5, lines: [' keep', '-old', '+new', '+new2', ' tail'] }]

  test('numbers lines like an editor', () => {
    const { rows } = diffRows(hunks)
    expect(rows.map(r => [r.n, r.sign])).toEqual([
      [5, ' '],
      [6, '-'],
      [6, '+'],
      [7, '+'],
      [8, ' '],
    ])
    expect(countChanges(rows)).toEqual({ added: 2, removed: 1 })
  })

  test('falls back to the content as additions and caps rows', () => {
    const { rows, more } = diffRows([], 'a\nb\nc', 2)
    expect(rows).toEqual([
      { n: 1, sign: '+', text: 'a' },
      { n: 2, sign: '+', text: 'b' },
    ])
    expect(more).toBe(1)
  })
})

describe('format', () => {
  test('fmtDuration', () => {
    expect(fmtDuration(1100)).toBe('1.1 s')
    expect(fmtDuration(64000)).toBe('1m 4s')
    expect(fmtDuration(59949)).toBe('59.9 s')
    expect(fmtDuration(59950)).toBe('1m 0s')
    expect(fmtDuration(60000)).toBe('1m 0s')
    expect(fmtDuration(3_700_000)).toBe('1h 1m')
    expect(fmtDuration(NaN)).toBe('0s')
  })

  test('fmtElapsed', () => {
    expect(fmtElapsed(7)).toBe('7s')
    expect(fmtElapsed(64)).toBe('1m 4s')
    expect(fmtElapsed(7500)).toBe('2h 5m')
    expect(fmtElapsed(90000)).toBe('1d 1h')
    expect(fmtElapsed(59)).toBe('59s')
    expect(fmtElapsed(60)).toBe('1m 0s')
    expect(fmtElapsed(3599)).toBe('59m 59s')
    expect(fmtElapsed(3600)).toBe('1h 0m')
    expect(fmtElapsed(86399)).toBe('23h 59m')
    expect(fmtElapsed(86400)).toBe('1d 0h')
    expect(fmtElapsed(-5)).toBe('0s')
    expect(fmtElapsed(NaN)).toBe('0s')
    expect(fmtElapsed(Infinity)).toBe('0s')
  })

  test('badgeSvg escapes the glyph', () => {
    expect(badgeSvg('#fff', '>_', 30)).toContain('&gt;_')
  })
})



describe('stat card formatters', () => {
  test('fmtCost always has two decimals', () => {
    expect(fmtCost(0.34)).toBe('$0.34')
    expect(fmtCost(15.616)).toBe('$15.62')
    expect(fmtCost(0)).toBe('$0.00')
  })

  test('fmtClock reads like a stopwatch', () => {
    expect(fmtClock(18000)).toBe('0:18')
    expect(fmtClock(725000)).toBe('12:05')
    expect(fmtClock(3723000)).toBe('1:02:03')
    expect(fmtClock(-5)).toBe('0:00')
  })
})

describe('fmtTokens', () => {
  test('plain, k, M, B', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(1500)).toBe('1.5k')
    expect(fmtTokens(196000)).toBe('196k')
    expect(fmtTokens(1_000_000)).toBe('1M')
    expect(fmtTokens(1_250_000)).toBe('1.25M')
    expect(fmtTokens(48_700_000)).toBe('48.7M')
    expect(fmtTokens(3_400_000_000)).toBe('3.4B')
  })

  test('rolls over at the unit edge and never prints 1000k', () => {
    expect(fmtTokens(999_999)).toBe('1M')
    expect(fmtTokens(999_999_999)).toBe('1B')
  })

  test('zero and negatives', () => {
    expect(fmtTokens(0)).toBe('0')
    expect(fmtTokens(-4)).toBe('0')
  })
})

describe('tokensPerSec', () => {
  test('output tokens over seconds', () => {
    expect(tokensPerSec(500, 5000)).toBe(100)
    expect(tokensPerSec(90, 1000)).toBe(90)
  })

  test('too short or untimed gives null', () => {
    expect(tokensPerSec(5, 1000)).toBeNull()
    expect(tokensPerSec(500, 0)).toBeNull()
    expect(tokensPerSec(500, -3)).toBeNull()
  })

  test('fmtSpeed keeps one decimal only under 10', () => {
    expect(fmtSpeed(8.46)).toBe('8.5')
    expect(fmtSpeed(42.4)).toBe('42')
    expect(fmtSpeed(100)).toBe('100')
  })
})

describe('pillSvg', () => {
  test('is a full capsule that carries the label and colours', () => {
    const { svg, width, height } = pillSvg('done', '#a9e6b4', '#2d4232', 24, false, 'check')
    expect(svg).toContain('rx="12"')
    expect(svg).toContain('>done</text>')
    expect(svg).toContain('stroke-linecap="round"') // the check mark is drawn, not typed
    expect(svg).toContain('#2d4232')
    expect(svg).toContain(`width="${width}"`)
    expect(height).toBe(24)
  })

  test('longer labels make wider capsules', () => {
    expect(pillSvg('1 removed', '#fff', '#000').width).toBeGreaterThan(pillSvg('1 added', '#fff', '#000').width)
  })

  test('pins the label width so the fit does not depend on the font', () => {
    expect(pillSvg('91 ms', '#fff', '#000').svg).toContain('textLength=')
  })

  test('escapes markup characters in the label', () => {
    expect(pillSvg('a<b&c', '#fff', '#000').svg).toContain('a&lt;b&amp;c')
  })
})

describe('running pill animation', () => {
  test('a running capsule spins and pulses; a settled one stays still', () => {
    const run = pillSvg('running', '#c4baff', '#2d3a3f', 24, true)
    expect(run.svg).toContain('<animate ')
    expect(run.svg).toContain('repeatCount="indefinite"')
    expect(pillSvg('done', '#fff', '#000', 24, false).svg).not.toContain('animate')
  })

  test('the spinner makes room: a running capsule is wider', () => {
    expect(pillSvg('running', '#fff', '#000', 24, true).width).toBeGreaterThan(pillSvg('running', '#fff', '#000', 24, false).width)
  })
})



describe('loadingSvg', () => {
  test('idle is a quiet track: no animation, no mask', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7')
    expect(svg).toContain('width="500" height="18"')
    expect(svg).not.toContain('<animate')
    expect(svg).not.toContain('<mask')
  })

  test('live sweeps a soft glow across the track', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7', { live: true })
    expect(svg).toContain('<mask id="l500_18m"')
    expect(svg).toContain('<animate attributeName="x" from="-200" to="500"')
    expect(svg).toContain('repeatCount="indefinite"')
  })

  test('draws no number: no label, no pill', () => {
    expect(loadingSvg(500, 18, '#9b8cf7', { live: true })).not.toContain('<text')
  })

  test('is deterministic', () => {
    expect(loadingSvg(400, 18, '#fff', { live: true })).toBe(loadingSvg(400, 18, '#fff', { live: true }))
  })

  test('padBottom adds transparent room and leaves the bar alone', () => {
    const padded = loadingSvg(600, 18, '#fff', { padBottom: 6 })
    expect(padded).toContain('viewBox="0 0 600 24" width="600" height="24"')
    expect(padded).toContain('<rect width="600" height="18" rx="9"')
  })
})

describe('more motion', () => {
  test('a running badge pings inside its disc; a settled one is still', () => {
    expect(badgeSvg('#ffd166', '>_', 30, true)).toContain('<animate attributeName="r"')
    expect(badgeSvg('#ffd166', '>_', 30, false)).not.toContain('<animate')
  })

  test('the status dot ripples only while live', () => {
    expect(dotSvg('#9b8cf7', true)).toContain('repeatCount="indefinite"')
    expect(dotSvg('#9b8cf7', false)).not.toContain('<animate')
  })

  test('a changed card rises and flashes; an unchanged one is still', () => {
    const moved = cardSvg('Cost', '≈$15.62', { changed: true })
    expect(moved.svg).toContain('animateTransform')
    expect(moved.svg).toContain('attributeName="stroke"')
    expect(cardSvg('Cost', '≈$15.62').svg).not.toContain('<animate')
  })

  test('a live card breathes, with no sweep; an idle one stays still', () => {
    const live = cardSvg('Cost', '$1', { icon: 'coin', live: { now: 1_000 } }).svg
    expect(live).toContain('attributeName="fill-opacity" values="0.13;0.3;0.13"')
    expect(live).toContain(`begin="${phaseBegin(1_000, CARD_BREATHE_MS)}"`)
    expect(live).not.toContain('clip-path')
    expect(live).not.toContain('attributeName="x"')
    expect(cardSvg('Cost', '$1', { icon: 'coin' }).svg).not.toContain('<animate')
  })

  test('phaseBegin wraps and never goes positive', () => {
    expect(phaseBegin(0, 3600)).toBe('0.000s')
    expect(phaseBegin(3700, 3600)).toBe('-0.100s')
    expect(phaseBegin(-100, 3600)).toBe('-3.500s')
  })

  test('a card carries its label and value, escaped, and grows with the value', () => {
    expect(cardSvg('A<B', '1&2').svg).toContain('A&lt;B')
    expect(cardSvg('Cost', '≈$1,234,567.89').width).toBeGreaterThan(cardSvg('Cost', '1').width)
  })
})

describe('icons', () => {
  test('every tool kind has a drawn icon, and the badge centres it in the disc', () => {
    for (const icon of Object.values(KIND_ICON)) {
      const svg = badgeSvg('#ffd166', icon, 30)
      expect(svg).toContain('translate(8 8) scale(0.6667)') // 16px mark, top-left at 8, 8: dead centre in 32
      expect(svg).not.toContain('<text')
    }
  })

  test('an unknown name still falls back to a typed glyph', () => {
    expect(badgeSvg('#fff', '?', 30)).toContain('<text')
  })

  test('a pill icon makes room and sits on the left', () => {
    const plain = pillSvg('done', '#fff', '#000', 24)
    const withIcon = pillSvg('done', '#fff', '#000', 24, false, 'check')
    expect(withIcon.width).toBeGreaterThan(plain.width)
    expect(withIcon.svg).toContain('<g transform="translate(10.08')
  })

  test('a card with an icon shifts its label right', () => {
    expect(cardSvg('Cost', '$1', { icon: 'coin' }).svg).toContain('x="34" y="19"')
    expect(cardSvg('Cost', '$1').svg).toContain('x="14" y="19"')
  })
})

describe('countSvg', () => {
  test('says what it counts: the number and its word, singular or plural', () => {
    expect(countSvg(8).svg).toContain('>tools</text>')
    expect(countSvg(1).svg).toContain('>tool</text>')
    expect(countSvg(0).svg).toContain('>0')
  })

  test('has a hover title explaining itself', () => {
    expect(countSvg(3).svg).toContain('<title>Tool calls this turn</title>')
  })

  test('flashes and rises only when the count grew', () => {
    const grew = countSvg(5, { changed: true }).svg
    expect(grew).toContain('attributeName="fill"')
    expect(grew).toContain('animateTransform')
    expect(countSvg(5).svg).not.toContain('<animate')
  })

  test('grows wider with more digits and a longer word', () => {
    expect(countSvg(1234).width).toBeGreaterThan(countSvg(1).width)
    expect(countSvg(5, { label: 'calls' }).width).toBeGreaterThan(countSvg(5, { label: 'x' }).width)
  })

  test('carries the bolt icon, drawn', () => {
    expect(countSvg(2).svg).toContain('stroke-linecap="round"')
  })
})

describe('fmtReset', () => {
  const now = Date.parse('2026-10-15T10:00:00Z')
  const at = (ms: number) => new Date(now + ms).toISOString()

  test('minutes, hours, days, in whole units', () => {
    expect(fmtReset(at(45 * 60_000), now)).toBe('resets in 45m')
    expect(fmtReset(at(2 * 3_600_000), now)).toBe('resets in 2h')
    expect(fmtReset(at(3 * 3_600_000 + 20 * 60_000), now)).toBe('resets in 3h 20m')
    expect(fmtReset(at(2 * 86_400_000 + 4 * 3_600_000), now)).toBe('resets in 2d 4h')
    expect(fmtReset(at(3 * 86_400_000), now)).toBe('resets in 3d')
  })

  test('under a minute and already past', () => {
    expect(fmtReset(at(30_000), now)).toBe('resets in <1m')
    expect(fmtReset(at(-5_000), now)).toBe('resetting now')
  })

  test('missing or unreadable time says nothing rather than guess', () => {
    expect(fmtReset(undefined, now)).toBeNull()
    expect(fmtReset('', now)).toBeNull()
    expect(fmtReset('not a date', now)).toBeNull()
  })
})

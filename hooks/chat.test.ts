import { describe, expect, test } from 'claude-code/testing'

import { base, fmtReset, badgeSvg, cardSvg, liveSpeed, speedScale, countSvg, fmtClock, fmtCost, fmtElapsed, fmtTokens, fmtSpeed, tokensPerSec, pillSvg, mascotSvg, MASCOT, HUE, PILL, MOTION, easeOut, cubicBezier, tickerSvg, glideHolder, glideStyle, reelText, EASE, INK } from './chat'

/** Rounded to cents: the engine's test kit has no toBeCloseTo. */
const cents = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100)

describe('format', () => {
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

describe('a figure that is no reading', () => {
  test('shows a dash, never NaN or Infinity', () => {
    for (const v of [NaN, Infinity]) {
      expect(fmtCost(v)).toBe('—')
      expect(fmtClock(v)).toBe('—')
      expect(fmtTokens(v)).toBe('—')
      expect(fmtSpeed(v)).toBe('—')
    }
    expect(fmtSpeed(-Infinity)).toBe('—')
  })

  test('a reset time against an unreadable clock is no reading at all', () => {
    expect(fmtReset('2026-10-27T10:00:00Z', NaN)).toBeNull()
    expect(fmtReset('2026-10-27T10:00:00Z', -Infinity)).toBeNull()
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

describe('pills and tiles are still', () => {
  test('no pill or tile carries an animation, running or not', () => {
    for (const svg of [
      pillSvg('running', '#f9c6dc', '#2d3a3f', 24, true).svg,
      pillSvg('done', PILL.ok.fg, PILL.ok.bg, 22, false, 'check').svg,
      pillSvg('error', PILL.bad.fg, PILL.bad.bg, 22, false, 'cross').svg,
      badgeSvg('#7cb7ff', 'file', 32, true),
      badgeSvg('#7cb7ff', 'file', 32, false),
    ]) {
      expect(svg).not.toContain('@keyframes')
      expect(svg).not.toContain('<set ')
    }
  })

  test('the dots make room: a running capsule is wider', () => {
    expect(pillSvg('running', '#fff', '#000', 24, true).width).toBeGreaterThan(pillSvg('running', '#fff', '#000', 24, false).width)
  })

  test('every picture is well-formed: no tag repeats an attribute', () => {
    const all = [
      pillSvg('error', '#fff', '#000', 22, false, 'cross').svg,
      pillSvg('running', '#fff', '#000', 22, true).svg,
      badgeSvg('#fff', 'file', 32, false),
      badgeSvg('#fff', 'file', 32, true),
    ]
    for (const svg of all)
      for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
        const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map(m => m[1])
        expect(names.length).toBe(new Set(names).size)
      }
  })
})

describe('band pictures', () => {

  test('a card is a still picture', () => {
    expect(cardSvg('Cost', '≈$15.62', { icon: 'coin', iconColor: '#f3cf7a' }).svg).not.toContain('@keyframes')
    expect(cardSvg('Time', '1:06', { icon: 'stopwatch' }).svg).toContain('>1:06</text>')
  })

  test('a card carries its label and value, escaped, and grows with the value', () => {
    expect(cardSvg('A<B', '1&2').svg).toContain('A&lt;B')
    expect(cardSvg('Cost', '≈$1,234,567.89').width).toBeGreaterThan(cardSvg('Cost', '1').width)
  })

  test('live speed is the rate over the recent window, in tokens', () => {
    // 400 chars a second at 4 chars a token is 100 tokens a second.
    const s: Array<[number, number]> = [[0, 0], [500, 200], [1000, 400], [1500, 600], [2000, 800]]
    expect(cents(liveSpeed(s, 2000))).toBe(100)
    // Only the last window counts: a slow start no longer drags it down.
    expect(cents(liveSpeed([[0, 0], [3000, 10], [3500, 410]], 3500, { windowMs: 600, minMs: 400 }))).toBe(200)
    expect(liveSpeed([[0, 0], [100, 400]], 100)).toBeNull()
    expect(liveSpeed([], 0)).toBeNull()
    expect(cents(liveSpeed(s, 2000, { charsPerToken: 2 }))).toBe(200)
  })

  test('a stalled stream reads as slowing, and 0 once a whole window has passed with nothing', () => {
    // 100 tok/s up to 2000 ms, then nothing more arrives.
    const s: Array<[number, number]> = [[1200, 0], [1400, 80], [1600, 160], [1800, 240], [2000, 320]]
    const at = (now: number) => liveSpeed(s, now, { windowMs: 800, minMs: 250 })!
    expect(cents(at(2000))).toBe(100)
    expect(at(2400)).toBeLessThan(at(2000))
    expect(at(2900)).toBe(0)
  })

  test('the speedometer scale is a round step clear of the peak', () => {
    expect(speedScale(0)).toBe(50)
    expect(speedScale(91)).toBe(150)
    expect(speedScale(122)).toBe(150)
    expect(speedScale(140)).toBe(200)
    expect(speedScale(5000)).toBe(6000)
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

describe('base', () => {
  test('takes the last part of POSIX and Windows paths alike', () => {
    expect(base('/home/me/work/app')).toBe('app')
    expect(base('C:\\Users\\Kobay\\OneDrive\\Desktop\\KikitanTranslator')).toBe('KikitanTranslator')
    expect(base('C:\\work\\app\\')).toBe('app')
    expect(base('app')).toBe('app')
  })
})

describe('steady widths', () => {
  test('a pill and the tool counter hold a minimum width, so what follows them never shifts', () => {
    const working = pillSvg('working', '#fff', '#000', 24, true).width
    expect(pillSvg('idle', '#fff', '#000', 24, false, undefined, working).width).toBe(working)
    expect(pillSvg('idle', '#fff', '#000').width).toBeLessThan(working)
    const room = countSvg(999).width
    expect(countSvg(3, { minWidth: room }).width).toBe(room)
    expect(countSvg(3).width).toBeLessThan(room)
  })
})

// The band's motion (MOTION): CSS in each picture that keeps its picture, figures that glide.
describe('motion', () => {
  /**
   * A picture with its motion taken out: what a surface that plays none shows, and what a
   * person who asks for reduced motion sees. The classes that run it, and its <style>, go.
   */
  const still = (svg: string) => {
    let out = svg.replace(/<style>[\s\S]*?<\/style>/g, '')
    // A <g> that only carries a motion class wraps the still markup: take it off, with its own </g>.
    for (let at = out.search(/<g class="[^"]*">/); at >= 0; at = out.search(/<g class="[^"]*">/)) {
      const open = out.indexOf('>', at) + 1
      let depth = 1
      let i = open
      while (depth > 0) {
        const next = out.slice(i).search(/<g[ >]|<\/g>/)
        i += next
        depth += out.startsWith('</g>', i) ? -1 : 1
        i += out.startsWith('</g>', i) ? 4 : 2
      }
      out = out.slice(0, at) + out.slice(open, i - 4) + out.slice(i)
    }
    return out.replace(/ class="[^"]*"/g, '')
  }

  test('easeOut is EASE.out as a function: 0 to 1, fast first, held past the ends', () => {
    expect(Math.abs(easeOut(0) - 0)).toBeLessThan(1e-6)
    expect(Math.abs(easeOut(1) - 1)).toBeLessThan(1e-6)
    expect(easeOut(0.5)).toBeGreaterThan(0.85)
    expect(Math.abs(easeOut(-1) - 0)).toBeLessThan(1e-6)
    expect(Math.abs(easeOut(2) - 1)).toBeLessThan(1e-6)
    // The browser's own curve: linear stays linear.
    expect(Math.abs(cubicBezier(0, 0, 1, 1)(0.3) - 0.3)).toBeLessThan(1e-6)
  })

  test('a gauge glides from where it was, with its age, while it plays, then the plain picture', () => {
    const g = glideHolder(400, 1000)
    expect(g.from('n', 10, 0)).toBe(null) // seen first: nothing to glide from
    expect(g.from('n', 10, 50)).toBe(null)
    expect(g.from('n', 80, 2000)).toEqual({ from: 10, age: 0 })
    // Its age goes with it, so a picture drawn again plays on from there, not from the start.
    expect(g.from('n', 80, 2250)).toEqual({ from: 10, age: 250 })
    expect(g.from('n', 80, 3000)).toBe(null) // played: the plain picture, which looks the same
    // A new reading mid-glide starts from where the last one had got to, never back.
    g.from('m', 0, 0)
    g.from('m', 100, 5000)
    const on = g.from('m', 200, 5200)!
    expect(on.from).toBeGreaterThan(50)
    expect(on.from).toBeLessThan(100)
    expect(on.age).toBe(0)
    expect(g.from('m', null, 5300)).toBe(null)
    expect(g.from('m', 40, 5400)).toBe(null) // after a gap, seen first again
  })

  test('a motion plays from its age: drawn again mid-way, it goes on rather than starting over', () => {
    const attrs = 'font-size="14" font-weight="700"'
    expect(reelText(10, 20, 14, attrs, '2', { from: '1', age: 180 })).toContain(`.reel{animation:reel ${MOTION.rollMs}ms -180ms both}`)
    expect(reelText(10, 20, 14, attrs, '2', { from: '1', age: 180 })).toContain('-180ms both}')
    expect(glideStyle('arc', 'width', v => `${v}px`, { from: 10, age: 120 }, 50)).toContain(`animation:arc ${MOTION.glideMs}ms ${EASE.out} -120ms both`)
    // A bare start is a motion just begun.
    expect(glideStyle('arc', 'width', v => `${v}px`, 10, 50)).toContain('-0ms both')
  })

  test('a reel: the shared front stays, the strip rests on the new value and plays up from the old', () => {
    const attrs = 'font-size="14" font-weight="700"'
    expect(reelText(10, 20, 14, attrs, '≈$18.37')).toBe('<text x="10" y="20" font-size="14" font-weight="700">≈$18.37</text>')
    expect(reelText(10, 20, 14, attrs, '≈$18.37', '≈$18.37')).toBe(reelText(10, 20, 14, attrs, '≈$18.37'))
    const r = reelText(10, 20, 14, attrs, '≈$18.37', '≈$18.01')
    expect(r).toContain('<text x="10" y="20" font-size="14" font-weight="700">≈$18.</text>')
    // Old over new, a line apart; at rest the strip stands a line up, on the new value.
    expect(r).toContain(`<g class="reel" transform="translate(0 ${-(14 * 1.2).toFixed(1)})">`)
    expect(r).toMatch(/class="reel-out"><tspan fill-opacity="0">≈\$18\.<\/tspan>01<\/text>/)
    expect(r).toMatch(/y="36\.8" font-size="14" font-weight="700"><tspan fill-opacity="0">≈\$18\.<\/tspan>37<\/text>/)
    expect(r).toContain(`.reel{animation:reel ${MOTION.rollMs}ms -0ms both}`)
    expect(r).toContain('clip-path="url(#reel-cut)"')
    // A figure that shares no front rolls whole.
    expect(reelText(10, 20, 14, attrs, '10%', '9%')).not.toMatch(/fill-opacity="0">/)
  })

  test('the elapsed clock rolls each second in and holds its width from the start', () => {
    const plain = tickerSvg('4s', { minText: '59m 59s' })
    expect(plain.svg).not.toContain('<style>')
    expect(plain.width).toBe(tickerSvg('59m 59s').width)
    const rolling = tickerSvg('5s', { from: '4s', minText: '59m 59s' })
    expect(rolling.svg).toContain('@keyframes reel')
    expect(rolling.width).toBe(plain.width)
    // Only the digits that change turn: '1m 1' stays put as 1m 19s becomes 1m 20s.
    expect(tickerSvg('1m 20s', { from: '1m 19s' }).svg).toContain('>1m </text>')
  })
})

describe('mascot', () => {
  const art = (on: boolean, opts: { enter?: number | null; motion?: boolean } = {}) => mascotSvg(on, 0, 0, 30, opts)

  test('a ringed planet in line art, no face: lit bands awake, all grey asleep', () => {
    const awake = art(true)
    expect(awake).toContain('clip-path="url(#pl-c)"')
    expect(awake).toContain(`stroke="${HUE.signal}"`)
    expect(awake).toContain(`stroke="${HUE.amber}"`)
    expect(awake).toContain('rotate(-22 ')
    // No face: no eyes, cheeks or z.
    expect(awake).not.toContain(HUE.night)
    expect(awake).not.toContain(HUE.petal)
    expect(awake).not.toContain('</text>')
    const asleep = art(false)
    expect(asleep).not.toContain(HUE.signal)
    expect(asleep).not.toContain(HUE.amber)
    expect(asleep).toContain(`stroke="${INK.detail}"`)
  })

  test('it keeps its shape at any width: the box scales by its own aspect', () => {
    expect(mascotSvg(true, 3, 4, 15)).toContain(`<svg x="3" y="4" width="15" height="${(15 * MASCOT.h) / MASCOT.w}" viewBox="0 0 ${MASCOT.w} ${MASCOT.h}"`)
  })

  test('the bands drift and the ring runs only awake with motion; the hop plays only on waking', () => {
    const moving = art(true, { motion: true })
    expect(moving).toContain('class="drift"')
    expect(moving).toContain('class="dash"')
    expect(moving).toMatch(/\.drift\{animation:drift \d+ms linear infinite\}/)
    expect(moving).toMatch(/\.dash\{animation:dash \d+ms linear infinite\}/)
    expect(art(false, { motion: true })).not.toContain('@keyframes')
    expect(art(true)).not.toContain('@keyframes')
    expect(art(true, { enter: 120 })).toContain(`animation:hop ${MOTION.twinkleMs}ms`)
    expect(art(true, { enter: 120 })).toContain('-120ms both')
    expect(art(true, { enter: MOTION.twinkleMs })).not.toContain('hop')
    expect(art(true, { enter: null })).not.toContain('hop')
    expect(art(false, { enter: 120 })).not.toContain('hop')
  })

  test('the drift slides one wave a loop, under half a px a frame', () => {
    const svg = art(true, { motion: true })
    const [, px, ms] = /translateX\((\d+)px\)\}\}\.drift\{animation:drift (\d+)ms/.exec(svg)!
    expect(Number(px) / (Number(ms) / 1000) / 60).toBeLessThan(0.5)
  })

  test('motion holds no time and rests on the still mascot', () => {
    expect(art(true, { motion: true })).toBe(art(true, { motion: true }))
    const strip = (svg: string) => svg.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/ class="(hop|drift|dash)"/g, '')
    expect(strip(art(true, { motion: true, enter: 50 }))).toBe(art(true))
  })
})

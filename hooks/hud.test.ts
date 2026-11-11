import { describe, expect, test } from 'claude-code/testing'
import { HUE, INK } from './chat'
import { CELL, CHARGE_COLOR, CHARGE_CUT, chargeLevel, FILL, SEAM, hudCellParts, hudContextParts, HUD_CHIP, HUD_CONTEXT, blocksSvg, capWidth, cellHeight, hudCellSvg, hudChipSvg, hudContextSvg, slabSvg, stripeSvg } from './hud'

describe('hudCellSvg', () => {
  test('sets the name on a slab and the figure in capitals', () => {
    const c = hudCellSvg('model', 'Fable 5.2', { index: '08' })
    expect(c.svg).toContain('>MODEL</text>')
    expect(c.svg).toContain('>FABLE 5.2</text>')
    expect(c.svg).toContain('>08</text>')
    expect(c.svg).not.toContain(' rx=')
  })
  test('only ever grows to its column and its line', () => {
    const c = hudCellSvg('cost', '$1')
    expect(hudCellSvg('cost', '$1', { width: 400, height: 120 })).toMatchObject({ width: 400, height: 120, natural: c.natural })
    expect(hudCellSvg('cost', '$1', { width: 10, height: 10 })).toMatchObject({ width: c.natural, height: c.height })
    expect(c.width).toBeGreaterThanOrEqual(CELL.minWidth)
  })
  test('is as tall as what it holds', () => {
    expect(hudCellSvg('cost', '$1', { rule: HUE.sky }).height).toBe(cellHeight(0, false, true))
    expect(hudCellSvg('5h limit', '4%', { sub: '96% left', bars: [{ percent: 4, color: HUE.sky }] }).height).toBe(cellHeight(1, true))
    const two = hudCellSvg('7d limit', '22%', { sub: 'x', bars: [{ label: 'all', percent: 22, color: HUE.sky }, { label: 'fable', percent: 41, color: HUE.petal }] })
    expect(two.height).toBe(cellHeight(2, true, false, true))
    expect(two.height).toBeGreaterThan(cellHeight(1, true))
  })
  test('names each meter and writes its share only when a meter has a name', () => {
    const one = hudCellSvg('7d limit', '22%', { bars: [{ percent: 22, color: HUE.sky }] }).svg
    expect(one).not.toContain('>ALL</text>')
    const two = hudCellSvg('7d limit', '22%', { bars: [{ label: 'all', percent: 22, color: HUE.sky }, { label: 'fable', percent: 41, color: HUE.petal }] }).svg
    expect(two).toContain('>ALL</text>')
    expect(two).toContain('>FABLE</text>')
    expect(two).toContain('>41%</text>')
    expect(two).toContain(`fill="${HUE.petal}"`)
  })
  test('never writes NaN, and escapes what it is given', () => {
    const c = hudCellSvg('a<b', '<x>', { sub: 'p&q', bars: [{ label: 'm', percent: NaN, color: '#fff' }] }).svg
    expect(c).not.toContain('NaN')
    expect(c).toContain('A&lt;B')
    expect(c).toContain('&lt;X&gt;')
    expect(c).toContain('P&amp;Q')
  })
  test('the mode cell holds the mascot and takes its tone', () => {
    const c = hudCellSvg('mode', 'Hanahira', { sub: 'Active · V28', tone: HUE.petal, toggle: { on: true } }).svg
    expect(c).toContain('<ellipse')
    expect(c).toContain(`fill="${HUE.petal}" textLength`)
  })
  test('is still when nothing changed', () => {
    expect(hudCellSvg('5h limit', '4%', { bars: [{ percent: 4, color: HUE.sky }] }).svg).not.toContain('@keyframes')
    expect(hudCellSvg('5h limit', '4%', { bars: [{ percent: 4, color: HUE.sky, from: 40 }] }).svg).toContain('@keyframes')
    expect(hudCellSvg('cost', '$2', { reel: '$1' }).svg).toContain('@keyframes reel')
  })
})

describe('blocksSvg', () => {
  const lit = (svg: string) => Number(/<rect [^>]*width="([\d.]+)"/.exec(svg)![1])
  test('lights its width to the reading, and something for any use at all', () => {
    expect(lit(blocksSvg('a', 0, 0, 200, 4, 50, '#fff'))).toBe(100)
    expect(lit(blocksSvg('a', 0, 0, 200, 4, 0, '#fff'))).toBe(0)
    expect(lit(blocksSvg('a', 0, 0, 200, 4, 0.1, '#fff'))).toBeGreaterThan(0)
    expect(lit(blocksSvg('a', 0, 0, 200, 4, 250, '#fff'))).toBe(200)
    expect(lit(blocksSvg('a', 0, 0, 200, 4, null, '#fff'))).toBe(0)
  })
  test('draws the track under the lit blocks', () => {
    const svg = blocksSvg('a', 0, 0, 200, 4, 50, HUE.sky)
    expect(svg).toContain(`fill="${INK.track}"`)
    expect(svg).toContain(`fill="${HUE.sky}" clip-path="url(#a)"`)
  })
})

describe('hudContextSvg', () => {
  test('one line the band wide, its blocks taking the room', () => {
    const c = hudContextSvg(11, HUE.sky, { left: '889k left', window: '1M window' })
    expect(c.height).toBe(HUD_CONTEXT.height)
    expect(c.svg).toContain('>11%</text>')
    expect(c.svg).toContain('>889K LEFT · 1M WINDOW</text>')
    expect(hudContextSvg(11, HUE.sky, { width: 900 }).width).toBe(900)
  })
  test('stacks narrower and taller, and marks a full window', () => {
    const line = hudContextSvg(11, HUE.sky, { left: '889k left', window: '1M window' })
    const stack = hudContextSvg(11, HUE.sky, { left: '889k left', window: '1M window', stack: true })
    expect(stack.natural).toBeLessThan(line.natural)
    expect(stack.height).toBeGreaterThan(line.height)
    expect(hudContextSvg(null, HUE.sky).svg).toContain('>—</text>')
    expect(hudContextSvg(NaN, HUE.sky, { left: 'x' }).svg).not.toContain('NaN')
    expect(hudContextSvg(90, HUE.rose, { warn: true }).svg).toContain(`fill="${HUE.rose}">90%</text>`)
  })
})

describe('hudChipSvg', () => {
  test('a state is solid, a count outlined, the version bare', () => {
    expect(hudChipSvg({ color: HUE.sky, label: 'working', fill: true }).svg).toContain(`fill="${HUE.sky}"/>`)
    const count = hudChipSvg({ color: '', label: 'tools', value: '10' })
    expect(count.svg).toContain('fill="none"')
    expect(count.svg).toContain('>TOOLS</text>')
    expect(count.svg).toContain('>10</text>')
    expect(count.height).toBe(HUD_CHIP.height)
    expect(hudChipSvg({ color: '', label: 'v1.0.0', plain: true }).svg).not.toContain('<path')
  })
  test('an icon stands in for the label: the clock, framed like the count', () => {
    const time = hudChipSvg({ color: '', label: '', icon: 'clock', value: '1m 54s' })
    expect(time.svg).toContain('fill="none" stroke=')
    expect(time.svg).toContain('>1m 54s</text>')
    expect(time.svg).not.toContain('NaN')
    expect(hudChipSvg({ color: '', label: '', icon: 'clock', value: '1s', minWidth: 90 }).width).toBe(90)
    expect(time.natural).toBeLessThan(hudChipSvg({ color: '', label: 'time', icon: 'clock', value: '1m 54s' }).natural)
  })
  test('holds another state’s width, and moves only when asked', () => {
    const wide = hudChipSvg({ color: HUE.sky, label: 'working', fill: true }).natural
    expect(hudChipSvg({ color: '', label: 'idle', minWidth: wide }).width).toBe(wide)
    expect(hudChipSvg({ color: HUE.sky, label: 'working', fill: true }).svg).not.toContain('@keyframes')
    expect(hudChipSvg({ color: HUE.sky, label: 'working', fill: true, motion: true }).svg).toContain('@keyframes chip-in')
  })
})

describe('slabSvg and stripeSvg', () => {
  test('the slab fits its name', () => {
    expect(slabSvg('a longer name').width).toBeGreaterThan(slabSvg('spa').width)
    expect(slabSvg('spa').svg).toContain('>SPA</text>')
    expect(capWidth('WWW', 10)).toBeGreaterThan(capWidth('III', 10))
  })
  test('stripes are lit while live, at rest otherwise, and run only with motion', () => {
    expect(stripeSvg(500, 10, HUE.hazard, { live: true })).toContain(`fill="${HUE.hazard}"`)
    expect(stripeSvg(500, 10, HUE.hazard)).toContain(`fill="${INK.track}"`)
    expect(stripeSvg(500, 10, HUE.hazard, { rest: HUE.mint })).toContain(`fill="${HUE.mint}"`)
    expect(stripeSvg(500, 10, HUE.hazard, { live: true })).not.toContain('@keyframes')
    expect(stripeSvg(500, 10, HUE.hazard, { live: true, motion: true })).toContain('@keyframes run')
    expect(stripeSvg(500, 10, HUE.hazard, { motion: true })).not.toContain('@keyframes')
    expect(stripeSvg(600, 10, '#fff', { padBottom: 6 })).toContain('viewBox="0 0 600 16"')
  })
})

describe('charge', () => {
  test('blue from the first token a second, purple from 100, gold from 200', () => {
    expect([null, NaN, 0, 1, 49, 50, 99, 100, 199, 200, 2000].map(chargeLevel)).toEqual([0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3])
    expect(CHARGE_COLOR.slice(1)).toEqual([HUE.sky, HUE.lilac, HUE.hazard])
  })
  test('each level adds to the one under it, in its own colour', () => {
    const at = (level: number) => hudCellSvg('tok/s', '120', { bars: [{ percent: 50, color: HUE.sky }], charge: { level } }).svg
    expect(at(0)).toBe(hudCellSvg('tok/s', '120', { bars: [{ percent: 50, color: HUE.sky }] }).svg)
    const sizes = [0, 1, 2, 3].map(l => at(l).length)
    for (let l = 1; l <= 3; l++) expect(sizes[l]!).toBeGreaterThan(sizes[l - 1]!)
    for (let l = 1; l <= 3; l++) expect(at(l)).toContain(`stroke="${CHARGE_COLOR[l]}"`)
    expect(at(3)).toContain(`fill="${HUE.hazard}">120</text>`)
    expect(at(2)).not.toContain(`fill="${HUE.hazard}">120</text>`)
  })
  test('with motion its arcs run on by themselves, and nothing in the picture follows the clock', () => {
    const run = hudCellSvg('tok/s', '120', { charge: { level: 3, motion: true } }).svg
    // Every arc slides one width for good; the loop is 760 ms at level 3.
    expect(run).toContain('animation:a0 760ms linear infinite}')
    expect(run).not.toContain('animation-delay')
    expect(run).not.toContain('NaN')
    // Held still, nothing in it moves.
    expect(hudCellSvg('tok/s', '120', { charge: { level: 3 } }).svg).not.toMatch(/@keyframes|animation/)
  })
  test('a charged cell comes in strips: the arcs in pictures that hold while the figure changes', () => {
    const at = (value: string, level = 1) => hudCellParts('tok/s', value, { width: 160, bars: [{ percent: 40, color: HUE.sky }], charge: { level, motion: true } })
    const a = at('76'), b = at('91')
    expect(hudCellParts('tok/s', '76', { width: 160 }).rows).toBe(null)
    expect(a.rows!.map(r => r.live)).toEqual([false, true, false])
    expect(a.rows!.reduce((h, r) => h + r.height, 0)).toBe(a.height)
    // The strip of arcs is the same picture whatever the figure reads; the others are not.
    for (const k of ['left', 'fill', 'right'] as const) expect(a.rows![1]![k].svg).toBe(b.rows![1]![k].svg)
    expect(a.rows![0]!.left.svg).not.toBe(b.rows![0]!.left.svg)
    // Only the arcs' strip moves.
    expect(a.rows![1]!.left.svg).toContain('linear infinite')
    for (const n of [0, 2]) for (const k of ['left', 'fill', 'right'] as const) expect(a.rows![n]![k].svg).not.toContain('@keyframes')
    // At 3 the arcs along the top and bottom edges get strips of their own too.
    const c = at('250', 3)
    expect(c.rows!.map(r => r.live)).toEqual([true, false, true, false, true])
    expect(c.rows!.reduce((h, r) => h + r.height, 0)).toBe(c.height)
  })
  test('the lit frame never flickers', () => {
    expect(hudCellSvg('tok/s', '120', { charge: { level: 2, motion: true } }).svg).toMatch(/<rect [^>]*stroke-opacity="0.65"\/>/)
  })
})

describe('charge in one picture', () => {
  test('the charged cell is one svg, its arcs between the figure and the meters', () => {
    const svg = hudCellSvg('tok/s', '76', { width: 160, bars: [{ percent: 40, color: HUE.sky }], charge: { level: 3, motion: true } }).svg
    expect(svg.match(/<svg /g)!.length).toBe(1)
    expect(svg).toContain(`<g transform="translate(0 ${CHARGE_CUT.drop})">`)
  })
  test('the arcs, their branches and glow stay clear of the figure and the meter', () => {
    const c = hudCellSvg('tok/s', '42', { width: 160, sub: 'peak 80', bars: [{ percent: 40, color: HUE.sky }], charge: { level: 3, motion: true } })
    // Level 3: a0 runs along the top, a1 to a3 between the figure and the meter, a4 along the foot.
    for (const k of [1, 2, 3]) {
      const g = c.svg.split(`<g class="a${k}"`)[1]!.split('</g>')[0]!
      const ys = [...g.matchAll(/d="([^"]+)"/g)].flatMap(m => {
        // Absolute points (M/L x y) and the branches' relative steps (l dx dy) from them.
        const out: number[] = []
        let y = 0
        for (const [, op, a, b] of m[1]!.matchAll(/([MLl])(-?[\d.]+) (-?[\d.]+)/g)) out.push((y = op === 'l' ? y + Number(b) : Number(b)))
        return out
      })
      const glow = 3.2
      expect(Math.min(...ys) - glow).toBeGreaterThanOrEqual(CELL.valueY + 1)
      expect(Math.max(...ys)).toBeLessThanOrEqual(CELL.barsY + CHARGE_CUT.drop - 0.5)
    }
    // The meter and the line under it moved down, so the cell grew to keep them inside.
    expect(c.height).toBe(cellHeight(1, true) + CHARGE_CUT.drop)
  })
})

describe('stretch parts', () => {
  test('a cell cut at its seam: the two ends make its width, the filler is drawn FILL.cell wide', () => {
    const whole = hudCellSvg('5h limit', '7%', { index: '01', width: 180, bars: [{ percent: 7, color: HUE.sky }] })
    const p = hudCellParts('5h limit', '7%', { index: '01', width: 180, bars: [{ percent: 7, color: HUE.sky }] })
    expect(p.left.width + p.right.width).toBe(whole.width)
    expect(p.right.width).toBe(SEAM)
    expect(p).toMatchObject({ width: whole.width, height: whole.height, natural: whole.natural })
    expect(p.right.svg).toContain(`<g transform="translate(${SEAM - whole.width} 0)">`)
    expect(p.fill.width).toBe(FILL.cell)
  })
  test('a charged cell runs its arcs on through the filler', () => {
    const p = hudCellParts('tok/s', '77', { width: 120, charge: { level: 3 } })
    expect(p.fill.svg).toContain('translate(-110 0)')
    expect(hudCellParts('tok/s', '77', { width: 120 }).fill.svg).not.toContain('translate(')
  })
  test('each arc is drawn two widths long, so its copies in the filler sit two widths apart and never lie on each other', () => {
    const offsets = [...hudCellParts('tok/s', '77', { width: 120, charge: { level: 3 } }).fill.svg.matchAll(/<g transform="translate\((-?\d+) 0\)">/g)].map(m => Number(m[1]))
    expect(offsets[0]).toBe(-110)
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]! - offsets[i - 1]!).toBe(240)
    expect(offsets.at(-1)! + 120).toBeGreaterThanOrEqual(FILL.cell)
  })
  test('the filler after `even` picks the arcs up where `even` leaves them', () => {
    const p = hudCellParts('tok/s', '77', { index: '03', width: 120, indexEnd: 140, charge: { level: 3 } })
    expect(p.even!.width).toBe(30)
    expect(p.even!.svg).toContain('translate(-110 0)')
    expect(p.fill.svg).toContain('translate(-140 0)')
  })
  test('a filler carries only the arcs its own width shows', () => {
    const p = hudCellParts('tok/s', '77', { index: '03', width: 120, indexEnd: 140, charge: { level: 3, motion: true } })
    const copies = (svg: string) => (svg.match(/<g transform="translate\(-?\d+ 0\)"><g class="a0"/g) ?? []).length
    // `even` is 30 px: two copies cover it at every point of the slide, where the whole width took three.
    expect(copies(p.even!.svg)).toBe(2)
    expect(copies(p.fill.svg)).toBe(3)
    // The fillers slide with the cell, from the same place in the loop.
    for (const svg of [p.even!.svg, p.fill.svg]) expect(svg).toContain('animation:a0 760ms linear infinite}')
  })
  test('the right end, set after a filler cut anywhere, carries no arc; its bolts and spark sit in it', () => {
    const p = hudCellParts('tok/s', '77', { width: 120, charge: { level: 3, motion: true } })
    expect(p.right.svg).not.toMatch(/class="a\d/)
    // Every bolt and spark lies right of the seam, so a widened band keeps them in its corner.
    const whole = hudCellSvg('tok/s', '77', { width: 120, charge: { level: 3 } }).svg
    const bolts = [...whole.matchAll(/translate\(([\d.]+) [\d.]+\) scale/g)].map(m => Number(m[1]))
    expect(bolts.length).toBe(2)
    for (const x of bolts) expect(x).toBeGreaterThanOrEqual(120 - SEAM)
    const sparks = [...whole.matchAll(/<path d="M([\d.]+) [\d.]+l(-?\d+) /g)].map(m => [Number(m[1]), Number(m[1]) + 1.6 * Number(m[2])])
    expect(sparks.length).toBeGreaterThan(0)
    for (const xs of sparks) for (const x of xs) expect(x).toBeGreaterThanOrEqual(120 - SEAM)
  })
  test('the context line is cut before its words; stacked, after them', () => {
    const line = hudContextParts(6, HUE.sky, { left: '944K left', window: '1M window', width: 700 })
    const whole = hudContextSvg(6, HUE.sky, { left: '944K left', window: '1M window', width: 700 })
    expect(line.left.width + line.right.width).toBe(whole.width)
    expect(line.right.width).toBeGreaterThan(100)
    expect(hudContextParts(6, HUE.sky, { left: '944K left', stack: true, width: 300 }).right.width).toBe(16)
  })
})

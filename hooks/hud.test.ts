import { describe, expect, test } from 'claude-code/testing'
import { HUE, INK } from './chat'
import { CELL, CHARGE_COLOR, CHARGE_CUT, chargeLevel, hudCellParts, HUD_CHIP, HUD_CONTEXT, blocksSvg, capWidth, cellHeight, hudCellSvg, hudChipSvg, hudContextSvg, slabSvg, stripeSvg } from './hud'

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
  test('blue from 50 tokens a second, purple from 100, gold from 200', () => {
    expect([null, NaN, 0, 49, 50, 99, 100, 199, 200, 2000].map(chargeLevel)).toEqual([0, 0, 0, 0, 1, 1, 2, 2, 3, 3])
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
  test('crackles only with motion, and draws the same picture twice', () => {
    const still = hudCellSvg('tok/s', '120', { charge: { level: 2 } }).svg
    const moving = hudCellSvg('tok/s', '120', { charge: { level: 2, motion: true } }).svg
    expect(still).not.toContain('@keyframes')
    expect(moving).toContain('@keyframes a0')
    expect(moving).toBe(hudCellSvg('tok/s', '120', { charge: { level: 2, motion: true } }).svg)
    expect(moving).not.toContain('NaN')
  })
  test('the lit frame never flickers', () => {
    expect(hudCellSvg('tok/s', '120', { charge: { level: 2, motion: true } }).svg).toMatch(/<rect [^>]*stroke-opacity="0.65"\/>/)
  })
})

describe('hudCellParts', () => {
  const opts = (level: number) => ({ index: '03', width: 160, sub: 'peak 119', bars: [{ percent: 40, color: HUE.sky }], ...(level ? { charge: { level, motion: true } } : {}) })
  test('an uncharged cell is one plain picture, the size of the cell', () => {
    const one = hudCellSvg('tok/s', '76', opts(0))
    const p = hudCellParts('tok/s', '76', opts(0))
    expect(p.parts.length).toBe(1)
    expect(p.parts[0]).toMatchObject({ width: one.width, height: one.height, live: false })
    expect(p.parts[0]!.svg).toBe(one.svg)
  })
  test('a charged cell is strips that add up to the cell, the moving ones live', () => {
    for (const level of [1, 2, 3]) {
      const p = hudCellParts('tok/s', '76', opts(level))
      expect(p.parts.reduce((h, s) => h + s.height, 0)).toBe(p.height)
      expect(p.parts.every(s => s.width === p.width)).toBe(true)
      expect(p.parts.map(s => s.live)).toEqual(level === 3 ? [true, false, true, false, true] : [true, false, true, false])
      expect(p.parts[0]!.height).toBe(CHARGE_CUT.head)
      // Only the live strips carry a loop; the figure and the meters hold none.
      for (const s of p.parts) expect(s.svg.includes('infinite')).toBe(s.live)
    }
  })
  test('the moving strips hold their picture while the figure and the meter change', () => {
    const a = hudCellParts('tok/s', '76', opts(2)).parts
    const b = hudCellParts('tok/s', '81', { ...opts(2), sub: 'peak 131', bars: [{ percent: 55, color: HUE.sky }], reel: '76' }).parts
    expect(b[0]!.svg).toBe(a[0]!.svg)
    expect(b[2]!.svg).toBe(a[2]!.svg)
    expect(b[1]!.svg).not.toBe(a[1]!.svg)
    expect(b[3]!.svg).not.toBe(a[3]!.svg)
  })
  test('a new level is a new picture', () => {
    expect(hudCellParts('tok/s', '76', opts(1)).parts[2]!.svg).not.toBe(hudCellParts('tok/s', '76', opts(2)).parts[2]!.svg)
  })
})

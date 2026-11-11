import { describe, expect, test } from 'claude-code/testing'
import { HUE, INK } from './chat'
import { CELL, CHARGE_COLOR, CHARGE_CUT, chargeLevel, FILL, SEAM, hudCellParts, hudContextParts, HUD_CHIP, HUD_CONTEXT, blocksSvg, capWidth, cellHeight, hudCellSvg, hudChipSvg, hudContextSvg, slabSvg, SPEAKER, speakerSvg, stripeSvg, TOOL_KIND, TOOL_TAG, groupTag, ROW_TAG, toolKind, toolTagSvg } from './hud'

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

describe('charge in one picture', () => {
  test('the arcs and bolts carry their place in the loop from `at`, so a redraw goes on from there', () => {
    const at = (ms: number) => hudCellSvg('tok/s', '120', { charge: { level: 2, motion: true, at: ms } }).svg
    // Level 2: the first arc loops in 1050 ms, the flicker in 560 ms.
    expect(at(500)).toContain('.a0{animation:a0 1050ms linear infinite;animation-delay:-500ms}')
    expect(at(1550)).toContain('.a0{animation:a0 1050ms linear infinite;animation-delay:-500ms}')
    expect(at(600)).toContain('.zf{animation:zf 560ms linear infinite;animation-delay:-40ms}')
    expect(at(0)).not.toBe(at(500))
  })
  test('the charged cell is one svg, its arcs between the figure and the meters', () => {
    const svg = hudCellSvg('tok/s', '76', { width: 160, bars: [{ percent: 40, color: HUE.sky }], charge: { level: 3, motion: true, at: 0 } }).svg
    expect(svg.match(/<svg /g)!.length).toBe(1)
    expect(svg).toContain(`<g transform="translate(0 ${CHARGE_CUT.drop})">`)
  })
})

describe('speakerSvg', () => {
  test('sets the speaker on a solid slab and the caption after it, in capitals', () => {
    const s = speakerSvg('you', INK.value, { caption: 'input' })
    expect(s.svg).toContain('>YOU</text>')
    expect(s.svg).toContain('>// INPUT</text>')
    expect(s.svg).toContain(`fill="${INK.value}"`)
    expect(s.svg).not.toContain(' rx=')
  })
  test('only ever grows, and never past what it was given room for', () => {
    const s = speakerSvg('Hanahira', HUE.sky, { caption: 'response' })
    expect(speakerSvg('Hanahira', HUE.sky, { caption: 'response', width: 10 }).width).toBe(s.natural)
    expect(speakerSvg('Hanahira', HUE.sky, { caption: 'response', width: 900 }).width).toBe(900)
    expect(s.width).toBe(SPEAKER.width)
    expect(speakerSvg('you', INK.value).width).toBe(SPEAKER.width)
  })
  test('escapes what it is given', () => {
    expect(speakerSvg('a<b', HUE.sky).svg).toContain('A&lt;B')
  })
})

describe('tool tags', () => {
  test('name the kind of work by the tool', () => {
    expect(toolKind('Bash')).toBe('exec')
    expect(toolKind('Read')).toBe('read')
    expect(toolKind('Write')).toBe('edit')
    expect(toolKind('Grep')).toBe('scan')
    expect(toolKind('WebSearch')).toBe('net')
    expect(toolKind('Agent')).toBe('unit')
    expect(toolKind('mcp__github__Read')).toBe('link')
    expect(toolKind('SomethingNew')).toBe('tool')
  })
  test('draw the kind in capitals with its colour, held to a width', () => {
    const t = toolTagSvg(TOOL_KIND.exec.label, TOOL_KIND.exec.color)
    expect(t.svg).toContain('>RUN</text>')
    // Plain words only: the ones the app itself uses for these tools.
    expect(Object.values(TOOL_KIND).map(k => k.label)).toEqual(['run', 'read', 'edit', 'search', 'web', 'agent', 'mcp', 'tool'])
    expect(t.svg).toContain(`fill="${HUE.hazard}"`)
    expect(toolTagSvg('net', HUE.lilac, { minWidth: t.width + 20 }).width).toBe(t.width + 20)
  })
})

describe('transcript motion', () => {
  test('a header comes in once, from its age, and rests still', () => {
    const still = speakerSvg('you', INK.value, { caption: 'input' })
    expect(still.svg).not.toContain('animation')
    const fresh = speakerSvg('you', INK.value, { caption: 'input', enter: 0 })
    expect(fresh.svg).toContain('class="ss"')
    expect(fresh.svg).toContain('260ms cubic-bezier(0.22, 1, 0.36, 1) 0ms both')
    expect(speakerSvg('you', INK.value, { caption: 'input', enter: 200 }).svg).toContain(' -200ms both')
    expect(speakerSvg('you', INK.value, { caption: 'input', enter: SPEAKER.inMs }).svg).toBe(still.svg)
    expect(speakerSvg('you', INK.value, { caption: 'input', enter: null }).svg).toBe(still.svg)
    expect(fresh).toMatchObject({ width: still.width, height: still.height })
  })
  test('every part of a header is at rest by the end of its coming-in', () => {
    const css = speakerSvg('you', INK.value, { caption: 'input', enter: 0 }).svg
    const ends = [...css.matchAll(/ (\d+)ms [a-z-]+(?:\([^)]*\))? (-?\d+)ms both/g)].map(m => Number(m[1]) + Number(m[2]))
    expect(ends.length).toBeGreaterThan(6)
    expect(Math.max(...ends)).toBeLessThanOrEqual(SPEAKER.inMs)
  })
  test('a tag comes in once and blinks only while its call runs', () => {
    const still = toolTagSvg('exec', HUE.hazard)
    expect(still.svg).not.toContain('animation')
    expect(toolTagSvg('exec', HUE.hazard, { enter: 100 }).svg).toContain('-100ms both')
    expect(toolTagSvg('exec', HUE.hazard, { enter: TOOL_TAG.inMs }).svg).toBe(still.svg)
    const run = toolTagSvg('exec', HUE.hazard, { running: true }).svg
    expect(run).toContain('infinite')
    expect(run).toContain('prefers-reduced-motion')
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
  test('the context line is cut before its words; stacked, after them', () => {
    const line = hudContextParts(6, HUE.sky, { left: '944K left', window: '1M window', width: 700 })
    const whole = hudContextSvg(6, HUE.sky, { left: '944K left', window: '1M window', width: 700 })
    expect(line.left.width + line.right.width).toBe(whole.width)
    expect(line.right.width).toBeGreaterThan(100)
    expect(hudContextParts(6, HUE.sky, { left: '944K left', stack: true, width: 300 }).right.width).toBe(16)
  })
})

describe('row tags', () => {
  test('a folded run takes its calls\' kind where they share one, else the plain tools', () => {
    expect(groupTag(['Read', 'Read'])).toBe(TOOL_KIND.read)
    expect(groupTag(['Grep', 'Glob'])).toBe(TOOL_KIND.scan)
    expect(groupTag(['Read', 'Bash'])).toBe(ROW_TAG.group)
    expect(groupTag([])).toBe(ROW_TAG.group)
  })
  test('each row tag is one word and draws as a tool tag', () => {
    for (const t of Object.values(ROW_TAG)) {
      expect(t.label).toMatch(/^[a-z]+$/)
      expect(toolTagSvg(t.label, t.color).svg).toContain(t.label.toUpperCase())
    }
  })
})

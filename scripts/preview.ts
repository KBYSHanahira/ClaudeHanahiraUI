// Renders docs/preview.svg / preview.png: the compact status band drawn by the plugin's own SVG
// builders (chat.ts, agents.ts, icons.ts) with sample numbers. Run: bun scripts/preview.ts
// The PNG (what the READMEs show) is drawn from the SVG by a headless Chromium: PREVIEW_CHROME,
// else Playwright's, else one on the PATH. docs/preview.png.sha256 names the SVG it was drawn
// from, so scripts/repo.spec.ts fails while the PNG shows an older band.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENT_CHIP, agentChipParts, prettyModel } from '../hooks/agents'
import { HUE, fmtClock, fmtElapsed } from '../hooks/chat'
import { HUD_CONTEXT, TELEMETRY, hudCellSvg, hudChipSvg, hudContextSvg, slabSvg, branchChipSvg, stripeSvg, telemetrySvg } from '../hooks/hud'
import { iconSvg } from '../hooks/icons'
import { SKILLS_VERSION, VERSION } from '../hooks/version'
import type { Agent } from '../types'

const font = 'font-family="Anthropic Sans,ui-sans-serif,system-ui,Helvetica,Arial,sans-serif"'
const nest = (art: string | { svg: string }, x: number, y: number) =>
  `<g transform="translate(${x} ${y})">${typeof art === 'string' ? art : art.svg}</g>`

const now = 1_000_000
const agents: Agent[] = [
  { id: 'a1', name: 'code-reviewer', type: 'general-purpose', model: 'claude-sonnet-5-5', effort: 'high', tps: 64, background: true, status: 'running', startedAt: now - 84_000, endedAt: null, tools: 12, input: 1200, output: 5400, cacheRead: 310000, cacheWrite: 22000 },
  { id: 'a2', name: 'test-runner', type: 'general-purpose', model: 'claude-haiku-5-5', effort: 'low', tps: 142, background: true, status: 'done', startedAt: now - 52_000, endedAt: now - 1_000, tools: 5, input: 800, output: 2100, cacheRead: 90000, cacheWrite: 9000 },
  { id: 'b1', name: 'bun run build', type: 'shell', kind: 'shell', model: '', effort: null, background: true, status: 'running', startedAt: now - 20_000, endedAt: null, tools: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
]

const GAP = 4 // px between two cells, as the band's spacer picture
const SKY = HUE.signal
// Agent strip, then the band: the top line, the context cell, two lines of stat cells.
const lineH = 34
const parts: string[] = []
// agent strip, above the band as in a session: chips wrap to a new row as the strip does
const STRIP_MAX = 700
let stripX = 28
let stripY = 24
agents.forEach(a => {
  const art = agentChipParts(a, {})
  const w = art.body.width + art.mark.width
  if (stripX > 28 && stripX + w > STRIP_MAX) {
    stripX = 28
    stripY += AGENT_CHIP.H + 6
  }
  parts.push(nest(art.body, stripX, stripY), nest(art.mark, stripX + art.body.width, stripY))
  stripX += w + 8
})
const top = stripY + AGENT_CHIP.H + 14
// The stats, built first: the grid's width is the band's width, and every row ends on it.
// Each cell is drawn at its column's width and its line's height, as the band draws its grid.
type Draw = (width?: number, height?: number) => ReturnType<typeof hudCellSvg>
const gauges: Draw[] = [
  (width, height) => hudCellSvg('5h limit', '4%', { index: '01', width, height, sub: '96% left · resets 3h 59m', bars: [{ percent: 4, color: SKY }] }),
  (width, height) => hudCellSvg('7d limit', '22%', { index: '02', width, height, sub: '78% left · resets 2d 8h', bars: [{ label: 'all', percent: 22, color: SKY }, { label: 'fable', percent: 41, color: HUE.steel }] }),
  (width, height) => hudCellSvg('tok/s', '58', { index: '03', width, height, sub: 'peak 81', bars: [{ percent: (58 / 100) * 100, color: HUE.ember }] }),
  (width, height) => hudCellSvg('mode', 'Hanahira', { index: '04', width, height, sub: `Active · V${SKILLS_VERSION} · design`, tone: HUE.signal, toggle: { on: true } }),
]
const figures: Draw[] = ([['cost', '≈$46.22'], ['tokens', '172M'], ['run time', fmtClock(2_730_000)], ['model', prettyModel('claude-fable-5-2')]] as const).map(
  ([label, value], i) => (width?: number, height?: number) => hudCellSvg(label, value, { index: `0${i + 5}`, width, height, rule: SKY }),
)
// Every column the same width: the widest cell's. Every line as tall as its tallest cell.
const colPx = Math.max(...gauges.map(g => g().natural), ...figures.map(f => f().natural))
const rowH = [gauges, figures].map(line => Math.max(...line.map(c => c().height)))
const gridPx = gauges.length * colPx + (gauges.length - 1) * GAP
const X0 = 14
const R = X0 + gridPx // the band's right edge
const frameH = 10 + lineH + 4 + HUD_CONTEXT.height + GAP + rowH[0]! + GAP + rowH[1]! + GAP + TELEMETRY.height + 10
const H = top + frameH + 36
// The picture is as wide as the band and its margins.
const W = R + X0
parts.unshift(`<rect width="${W}" height="${H}" rx="18" fill="#0e0d0c"/>`)
// the top line: the name on its slab, the branch, the stripes (running while working), the time, the chips
const y0 = top + 10
const ty = y0 + (lineH - 24) / 2
const slab = slabSvg('spa')
parts.push(nest(slab, X0, ty + 1))
const branchX = X0 + slab.width + 10
const branch = branchChipSvg('main')
parts.push(nest(branch, branchX, ty + 2))
const chips = [
  hudChipSvg({ color: SKY, label: 'working', fill: true }),
  hudChipSvg({ color: '', label: 'tools', value: '8', minWidth: hudChipSvg({ color: '', label: 'tools', value: '999' }).natural }),
  hudChipSvg({ color: '', label: `v${VERSION}`, plain: true }),
]
const chipsW = chips.reduce((w, c) => w + c.width, 0) + 6 * (chips.length - 1)
let chipX = R - chipsW
const timeX = chipX - 84
const barX = branchX + branch.width + 10
parts.push(`<svg x="${barX}" y="${ty + 7}" width="${timeX - barX - 12}" height="10" overflow="hidden">${stripeSvg(timeX - barX - 12, 10, HUE.amber, { live: true })}</svg>`)
parts.push(nest(iconSvg('clock', '#aaa49b', 14), timeX, ty + 5))
parts.push(`<text x="${timeX + 20}" y="${ty + 17}" ${font} font-size="14" fill="#aaa49b">${fmtElapsed(134)}</text>`)
for (const c of chips) {
  parts.push(nest(c, chipX, ty + (24 - c.height) / 2))
  chipX += c.width + 6
}
// The preview is the dark theme: the cells' light-theme style is left out.
const dark = <A extends { svg: string }>(a: A) => ({ ...a, svg: a.svg.replace(/<style>@media \(prefers-color-scheme: light\)[\s\S]*?<\/style>/g, '') })
// the context cell: the figure, its leaning blocks the band's width
const cy = y0 + lineH + 4
parts.push(nest(dark(hudContextSvg(15, SKY, { left: '849k left', window: '1M window', width: gridPx })), X0, cy))
// gauge cells over figure cells, on the one grid
let ry = cy + HUD_CONTEXT.height + GAP
;[gauges, figures].forEach((line, r) => {
  line.forEach((cell, j) => parts.push(nest(dark(cell(colPx, rowH[r])), X0 + j * (colPx + GAP), ry)))
  ry += rowH[r]! + GAP
})
// the telemetry rail along the band's foot, as it runs while Claude works
parts.push(`<svg x="${X0}" y="${ry}" width="${gridPx}" height="${TELEMETRY.height}" overflow="hidden">${telemetrySvg(gridPx, TELEMETRY.height, { live: true, text: `HANAHIRA // FIELD TERMINAL · V${VERSION}` })}</svg>`)
parts.push(`<text x="${W - 40}" y="${H - 14}" text-anchor="end" ${font} font-size="11" fill="#6b655c">Hanahira Claude UI · FOUNDRY · sample numbers</text>`)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`
const doc = (name: string) => fileURLToPath(new URL(`../docs/${name}`, import.meta.url))
writeFileSync(doc('preview.svg'), svg)

const chrome = (): string | null => {
  if (process.env.PREVIEW_CHROME) return process.env.PREVIEW_CHROME
  const cache = join(homedir(), '.cache', 'ms-playwright')
  if (existsSync(cache))
    for (const dir of readdirSync(cache).sort().reverse())
      for (const bin of ['chrome-linux/headless_shell', 'chrome-linux/chrome'])
        if (existsSync(join(cache, dir, bin))) return join(cache, dir, bin)
  for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    const found = Bun.which(name)
    if (found) return found
  }
  return null
}
const bin = chrome()
if (!bin) {
  console.error('No Chromium found (set PREVIEW_CHROME): docs/preview.png was not redrawn and scripts/repo.spec.ts will fail.')
  process.exit(1)
}
// Twice the SVG's size, the corners left transparent.
const shot = Bun.spawnSync([
  bin, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
  '--default-background-color=00000000', `--window-size=${W},${H}`, `--screenshot=${doc('preview.png')}`, `file://${doc('preview.svg')}`,
])
if (shot.exitCode !== 0) {
  console.error(shot.stderr.toString())
  process.exit(1)
}
writeFileSync(doc('preview.png.sha256'), `${createHash('sha256').update(svg).digest('hex')}\n`)

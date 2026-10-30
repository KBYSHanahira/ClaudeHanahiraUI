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
import { agentCardSvg, CARD_H, CARD_W, prettyModel } from '../hooks/agents'
import { chipSvg, contextSvg, CONTEXT, dotSvg, fmtClock, fmtElapsed, GLASS, inCard, loadingSvg, speedoSvg, STAT, statSvg } from '../hooks/chat'
import { iconGroup, iconSvg } from '../hooks/icons'
import { VERSION } from '../hooks/version'
import type { Agent } from '../types'

const ACCENT = '#9b8cf7'
const WARM = '#e8825f'
const font = 'font-family="ui-sans-serif,system-ui,Helvetica,Arial,sans-serif"'
const nest = (art: string | { svg: string }, x: number, y: number) =>
  `<g transform="translate(${x} ${y})">${typeof art === 'string' ? art : art.svg}</g>`

// Same donut as ringSvg in hooks/register.tsx with `bigIcon`, as the compact band draws it
// (that file needs the host, so it is restated here).
const ring = (percent: number, color: string, size: number, icon: Parameters<typeof iconGroup>[0]) => {
  const stroke = 3.5
  const r = (44 - stroke) / 2
  const c = 2 * Math.PI * r
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}"><circle cx="22" cy="22" r="17" fill="${color}" fill-opacity="0.13"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="#3b3737" stroke-width="${stroke}"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${((percent / 100) * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 22 22)"/>${iconGroup(icon, color, 9.5, 9.5, 25, 2.3)}</svg>`
}

const now = 1_000_000
const agents: Agent[] = [
  { id: 'a1', name: 'code-reviewer', type: 'general-purpose', model: 'claude-sonnet-5-5', effort: 'high', background: true, status: 'running', startedAt: now - 84_000, endedAt: null, tools: 12, input: 1200, output: 5400, cacheRead: 310000, cacheWrite: 22000 },
  { id: 'a2', name: 'test-runner', type: 'general-purpose', model: 'claude-haiku-5-5', effort: 'low', background: true, status: 'done', startedAt: now - 52_000, endedAt: now - 1_000, tools: 5, input: 800, output: 2100, cacheRead: 90000, cacheWrite: 9000 },
]

const W = 1000
const RED = '#f2736b'
// Agent strip, then the band: the top line on its card, the context card, two lines of stat cards.
const top = 24 + CARD_H + 14
const lineH = 34
const cellH = STAT.height + GLASS.extra
const frameH = 10 + lineH + 4 + CONTEXT.height + GLASS.extra + 2 * cellH + 10
const H = top + frameH + 36
const parts: string[] = []
parts.push(`<rect width="${W}" height="${H}" rx="18" fill="#171515"/>`)
// agent strip, above the band as in a session
agents.forEach((a, i) => {
  const art = agentCardSvg(a, {})
  parts.push(nest(art, 28 + i * (CARD_W + 14), 24))
})
// the top line on a card of its own: title and branch, the bar (red while working), the time, the chips
const y0 = top + 10
parts.push(`<rect x="16.5" y="${y0 + 0.5}" width="${W - 33}" height="${lineH - 1}" rx="10" fill="#808080" fill-opacity=".06" stroke="#808080" stroke-opacity=".18"/>`)
const ty = y0 + (lineH - 24) / 2
parts.push(nest(dotSvg(ACCENT, false), 30, ty + 5))
parts.push(nest(iconSvg('folder', '#a8a29e', 14), 52, ty + 5))
parts.push(`<text x="72" y="${ty + 17}" ${font} font-size="15" font-weight="600" fill="#ece7e3">spa</text><text x="110" y="${ty + 17}" ${font} font-size="14" fill="#a8a29e">⎇ main</text>`)
const chips = [
  chipSvg({ color: RED, label: 'working', dots: true, strong: true }),
  chipSvg({ color: '#f2c94c', icon: 'bolt', value: '8', label: 'tools', minWidth: chipSvg({ color: '', icon: 'bolt', value: '999', label: 'tools' }).natural, quiet: true }),
  chipSvg({ color: '#8f8985', icon: 'tag', label: `v${VERSION}`, quiet: true }),
]
const chipsW = chips.reduce((w, c) => w + c.width, 0) + 8 * (chips.length - 1)
let chipX = W - 28 - chipsW
const timeX = chipX - 92
parts.push(nest(loadingSvg(timeX - 184 - 16, 8, RED, { live: true }), 184, ty + 8))
parts.push(nest(iconSvg('clock', '#a8a29e', 14), timeX, ty + 5))
parts.push(`<text x="${timeX + 20}" y="${ty + 17}" ${font} font-size="14" fill="#a8a29e">${fmtElapsed(134)}</text>`)
for (const c of chips) {
  parts.push(nest(c, chipX, ty + (24 - c.height) / 2))
  chipX += c.width + 8
}
// The preview is the dark theme: the cards' light-theme style is left out.
const dark = <A extends { svg: string }>(a: A) => ({ ...a, svg: a.svg.replace(/<style>@media \(prefers-color-scheme: light\)[\s\S]*?<\/style>/g, '') })
// the context card: the one figure drawn big, its slider beside it
const cy = y0 + lineH + 4
parts.push(nest(dark(inCard(contextSvg(15, WARM, { left: '849k left', window: '1M window' }))), 14, cy))
// the stats: gauge cards over figure cards, on one grid so the columns line up
// Each cell is drawn at its column's width (a builder per cell), as the band draws its grid.
const gauges: ((width?: number) => ReturnType<typeof statSvg>)[] = [
  width => statSvg('4%', '5h limit', { detail: '3h 59m', width, ring: ring(4, WARM, STAT.glyph, 'hourglass') }),
  width => statSvg('22%', '7d limit', { detail: '2d 8h', width, ring: ring(22, WARM, STAT.glyph, 'calendar') }),
  width => statSvg('58', 'tok/s', { detail: 'peak 81', width, ring: speedoSvg(58 / 81, ACCENT, STAT.glyph) }),
  width => statSvg('Hanahira', 'Active', { detail: 'design', width, color: '#34c38f', tone: '#34c38f', toggle: { on: true } }),
]
const figures: [string, string, never, string][] = [['≈$46.22', 'cost', 'coin' as never, '#f2c94c'], ['172M', 'tokens', 'hash' as never, '#9b8cf7'], [fmtClock(2_730_000), 'time', 'timer' as never, '#5eb5f7'], [prettyModel('claude-opus-5-5'), 'model', 'sparkles' as never, '#e8825f']]
const figureArt = figures.map(([v, l, ic, c]) => (width?: number) => statSvg(v, l, { icon: ic, color: c, width }))
const colW = gauges.map((g, i) => Math.max(g().natural, figureArt[i]!().natural))
;[gauges, figureArt].forEach((line, r) => {
  let x = 14
  line.forEach((cell, i) => {
    const card = dark(inCard(cell(colW[i])))
    parts.push(nest(card, x, cy + CONTEXT.height + GLASS.extra + r * cellH))
    x += card.width + 8
  })
})
parts.push(`<text x="${W - 40}" y="${H - 14}" text-anchor="end" ${font} font-size="11" fill="#5c5654">Hanahira Claude UI · sample numbers</text>`)

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

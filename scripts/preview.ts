// Renders docs/preview.svg / preview.png: the compact status band drawn by the plugin's own SVG
// builders (chat.ts, agents.ts, icons.ts) with sample numbers. Run: bun scripts/preview.ts
import { writeFileSync } from 'node:fs'
import { agentCardSvg, CARD_H, CARD_W, prettyModel } from '../hooks/agents'
import { chipSvg, dotSvg, fmtClock, fmtElapsed, loadingSvg, speedoSvg, STAT, statSvg } from '../hooks/chat'
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
// Agent strip, then the band: a top line and two lines of stats, then room for the footnote.
const top = 24 + CARD_H + 14
const frameH = 14 + 36 + 2 * (STAT.height + 4) + 14
const H = top + frameH + 36
const parts: string[] = []
parts.push(`<rect width="${W}" height="${H}" rx="18" fill="#171515"/>`)
// agent strip, above the band as in a session
agents.forEach((a, i) => {
  const art = agentCardSvg(a, now, {})
  parts.push(nest(art, 28 + i * (CARD_W + 14), 24))
})
// the band's frame
parts.push(`<rect x="14" y="${top}" width="${W - 28}" height="${frameH}" rx="14" fill="#1f1d1d" stroke="${WARM}" stroke-opacity=".55" stroke-width="1.5"/>`)
// top line: title and branch, the loading bar, the time, then the chips
const y0 = top + 14
parts.push(nest(dotSvg(ACCENT, false), 36, y0 + 5))
parts.push(nest(iconSvg('folder', '#a8a29e', 14), 58, y0 + 5))
parts.push(`<text x="78" y="${y0 + 17}" ${font} font-size="15" font-weight="600" fill="#ece7e3">spa</text><text x="116" y="${y0 + 17}" ${font} font-size="14" fill="#a8a29e">⎇ main</text>`)
const chips = [
  chipSvg({ color: ACCENT, label: 'working', dots: true, strong: true }),
  chipSvg({ color: '#f2c94c', icon: 'bolt', value: '8', label: 'tools', minWidth: chipSvg({ color: '', icon: 'bolt', value: '999', label: 'tools' }).natural }),
  chipSvg({ color: '#8f8985', icon: 'cube', label: `v${VERSION}` }),
]
const chipsW = chips.reduce((w, c) => w + c.width, 0) + 8 * (chips.length - 1)
let chipX = W - 36 - chipsW
const timeX = chipX - 92
parts.push(nest(loadingSvg(timeX - 200 - 16, 14, ACCENT, { live: true }), 190, y0 + 3))
parts.push(nest(iconSvg('clock', '#a8a29e', 14), timeX, y0 + 5))
parts.push(`<text x="${timeX + 20}" y="${y0 + 17}" ${font} font-size="14" fill="#a8a29e">${fmtElapsed(134)}</text>`)
for (const c of chips) {
  parts.push(nest(c, chipX, y0))
  chipX += c.width + 8
}
// the stats: gauges over figures, on one grid so the columns line up
const gauges = [
  statSvg('15%', 'context', { detail: '151k/1M', ring: ring(15, WARM, STAT.glyph, 'chip') }),
  statSvg('4%', '5h limit', { detail: '3h 59m', ring: ring(4, WARM, STAT.glyph, 'clock') }),
  statSvg('22%', '7d limit', { detail: '2d 8h', ring: ring(22, WARM, STAT.glyph, 'calendar') }),
  statSvg('58', 'tok/s', { detail: 'peak 81', ring: speedoSvg(58 / 81, ACCENT, STAT.glyph) }),
]
const figures: [string, string, never, string][] = [['≈$46.22', 'cost', 'coin' as never, '#f2c94c'], ['172M', 'tokens', 'layers' as never, '#9b8cf7'], [fmtClock(2_730_000), 'time', 'stopwatch' as never, '#7bd88f'], [prettyModel('claude-opus-5-5'), 'model', 'bot' as never, '#5eb5f7']]
const figureArt = figures.map(([v, l, ic, col]) => statSvg(v, l, { icon: ic, color: col }))
const colW = gauges.map((g, i) => Math.max(g.natural, figureArt[i]!.natural))
;[gauges, figureArt].forEach((line, r) => {
  let x = 36
  line.forEach((cell, i) => {
    parts.push(nest(cell, x, y0 + 36 + r * (STAT.height + 4)))
    x += colW[i]! + 16
  })
})
parts.push(`<text x="${W - 40}" y="${H - 14}" text-anchor="end" ${font} font-size="11" fill="#5c5654">Hanahira Claude UI · sample numbers</text>`)

writeFileSync(new URL('../docs/preview.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`)

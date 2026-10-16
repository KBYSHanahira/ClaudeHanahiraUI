// Renders docs/preview.svg / preview.png: the status band drawn by the plugin's own SVG
// builders (chat.ts, agents.ts, icons.ts) with sample numbers. Run: bun scripts/preview.ts
import { writeFileSync } from 'node:fs'
import { agentCardSvg, CARD_W, CARD_H } from '../hooks/agents'
import { cardSvg, countSvg, dotSvg, loadingSvg } from '../hooks/chat'
import { iconGroup, iconSvg } from '../hooks/icons'
import type { Agent } from '../types'

const ACCENT = '#9b8cf7'
const WARM = '#e8825f'
const font = 'font-family="ui-sans-serif,system-ui,Helvetica,Arial,sans-serif"'
const nest = (art: string | { svg: string }, x: number, y: number) =>
  `<g transform="translate(${x} ${y})">${typeof art === 'string' ? art : art.svg}</g>`

// Same donut as ringSvg in hooks/register.tsx (that file needs the host, so it is restated here).
const ring = (percent: number, color: string, size: number, icon: Parameters<typeof iconGroup>[0]) => {
  const stroke = 5
  const r = (44 - stroke) / 2
  const c = 2 * Math.PI * r
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}"><circle cx="22" cy="22" r="13" fill="${color}" fill-opacity="0.12"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="#3b3737" stroke-width="${stroke}"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${((percent / 100) * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 22 22)"/>${iconGroup(icon, color, 15, 15, 14, 2.4)}</svg>`
}

const now = 1_000_000
const agents: Agent[] = [
  { id: 'a1', name: 'code-reviewer', type: 'general-purpose', model: 'claude-sonnet-5-5', effort: 'high', background: true, status: 'running', startedAt: now - 84_000, endedAt: null, tools: 12, input: 1200, output: 5400, cacheRead: 310000, cacheWrite: 22000 },
  { id: 'a2', name: 'test-runner', type: 'general-purpose', model: 'claude-haiku-5-5', effort: 'low', background: true, status: 'done', startedAt: now - 52_000, endedAt: now - 1_000, tools: 5, input: 800, output: 2100, cacheRead: 90000, cacheWrite: 9000 },
]

const W = 1000
const H = 400
const parts: string[] = []
parts.push(`<rect width="${W}" height="${H}" rx="18" fill="#171515"/>`)
parts.push(`<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="14" fill="#1f1d1d" stroke="${WARM}" stroke-opacity=".55" stroke-width="1.5"/>`)
// header
parts.push(nest(dotSvg(ACCENT, false), 36, 36))
parts.push(nest(iconSvg('folder', '#a8a29e', 14), 58, 36))
parts.push(`<text x="78" y="48" ${font} font-size="15" font-weight="600" fill="#ece7e3">spa</text><text x="116" y="48" ${font} font-size="14" fill="#a8a29e">⎇ main</text>`)
parts.push(nest(loadingSvg(560, 14, ACCENT, { live: true }), 190, 34))
parts.push(`<text x="768" y="48" ${font} font-size="14" fill="#a8a29e">45:30</text><circle cx="822" cy="43" r="4.5" fill="${WARM}"/><text x="832" y="48" ${font} font-size="14" fill="${WARM}">working</text>`)
parts.push(nest(countSvg(8), 900, 30))
// rings
const rings: [number, string, string, string, string, string][] = [
  [15, '#e8825f', 'cpu', '15%', 'context', '151k / 1M'],
  [4, '#e8825f', 'clock', '4%', 'of 5-hour limit', 'resets in 3h 59m'],
  [22, '#e8825f', 'calendar', '22%', 'of 7-day limit', 'resets in 2d 8h'],
  [72, ACCENT, 'bolt', '58', 'tokens / sec', 'peak 81'],
]
rings.forEach(([p, col, ic, big, cap, sub], i) => {
  const x = 40 + i * 205
  parts.push(nest(ring(p, col, 64, ic as never), x, 84))
  parts.push(`<text x="${x + 78}" y="112" ${font} font-size="26" font-weight="700" fill="#ece7e3">${big}</text><text x="${x + 78}" y="132" ${font} font-size="12.5" fill="#a8a29e">${cap}</text><text x="${x + 78}" y="148" ${font} font-size="12" fill="#7d7672">${sub}</text>`)
})
// total cards
const cards: [string, string, never, string][] = [['Cost', '≈$46.22', 'coin' as never, '#f2c94c'], ['Tokens', '172M', 'layers' as never, '#9b8cf7'], ['Time', '45:30', 'stopwatch' as never, '#7bd88f']]
let cx = 40
for (const [l, v, ic, col] of cards) {
  const a = cardSvg(l, v, { accent: ACCENT, icon: ic, iconColor: col })
  parts.push(nest(a, cx, 200))
  cx += a.width + 14
}
// agent strip
agents.forEach((a, i) => {
  const art = agentCardSvg(a, now, {})
  parts.push(nest(art, 40 + i * (CARD_W + 14), 280))
})
parts.push(`<text x="${W - 40}" y="${H - 28}" text-anchor="end" ${font} font-size="11" fill="#5c5654">Hanahira Claude UI · sample numbers</text>`)

writeFileSync(new URL('../docs/preview.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`)

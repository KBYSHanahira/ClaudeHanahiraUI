// Renders docs/preview-chat.svg: the transcript rows (your card, tool rows, a change with its
// diff, a delete, a folded run, a running call, a task notification, an error) drawn by the
// plugin's own SVG builders, laid out the way the hooks lay them out. Run: bun scripts/preview-chat.ts
// With an output path as the argument, it writes the rows mid-finish instead (every row's
// finish begins at time 0), for a browser to step through the motion.
import { writeFileSync } from 'node:fs'
import { badgeSvg, describe, diffRows, fmtDuration, INK, KIND_COLOR, KIND_ICON, PILL, pillSvg, ROW, statusPill, taskSummary } from '../hooks/chat'
import type { Kind, PillIcon } from '../hooks/chat'

const out = process.argv[2]

const W = 780
const font = 'font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif"'
const mono = 'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const nest = (svg: string, x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`

const parts: string[] = []
let y = 20
const X = 24

type Pill = { text: string; fg: string; bg: string; icon?: PillIcon; running?: boolean }
/** The pills at the right, right-aligned, then the duration; returns nothing, draws at row y. */
const right = (pills: Pill[], ms: number | undefined, rowY: number) => {
  let x = W - X
  if (ms !== undefined) {
    const t = fmtDuration(ms)
    parts.push(`<text x="${x}" y="${rowY + 20.5}" text-anchor="end" ${font} font-size="13" fill="${INK.detail}">${t}</text>`)
    x -= t.length * 7.4 + 10
  }
  for (const p of [...pills].reverse()) {
    const b = pillSvg(p.text, p.fg, p.bg, ROW.pill, p.running === true, p.icon)
    x -= b.width
    parts.push(nest(b.svg, x, rowY + (ROW.tile - ROW.pill) / 2))
    x -= 8
  }
}

const row = (kind: Kind, verb: string, target: string, pills: Pill[], ms?: number, opts: { mono?: boolean; running?: boolean } = {}) => {
  const color = KIND_COLOR[kind]
  parts.push(nest(badgeSvg(color, KIND_ICON[kind], ROW.tile, opts.running === true), X, y))
  const vx = X + ROW.tile + 8
  // One text, so the target follows the verb wherever the font ends it.
  parts.push(
    `<text x="${vx}" y="${y + 21}" ${font} font-size="14" xml:space="preserve"><tspan font-weight="600" fill="${color}">${esc(verb)}</tspan> ` +
      `<tspan ${opts.mono ? mono : ''} font-size="${opts.mono ? 13 : 14}" fill="${INK.value}">${esc(target)}</tspan></text>`,
  )
  right(pills, ms, y)
  y += ROW.tile + 10
}

const done = (p: ReturnType<typeof statusPill>): Pill => p
const idle = { isRunning: false, isErrored: false, isInterrupted: false }

// Your card: the band's warm edge, a faintly warm ground.
const prompt = 'Renovate the chat, and show every code change in it'
parts.push(`<rect x="${X}" y="${y}" width="${W - 2 * X}" height="40" rx="10" fill="#221d1b" stroke="#8e5541" stroke-width="1.5"/>`)
parts.push(`<text x="${X + 16}" y="${y + 25}" ${font} font-size="14" fill="${INK.value}">${esc(prompt)}</text>`)
y += 56

row('run', 'Run', describe('Bash', { command: 'bun test', description: 'Run the test suite' }).target, [done(statusPill('Bash', { ...idle, output: { stdout: '159 pass' } }))], 4300)
row('read', 'Read', 'register.tsx', [done(statusPill('Read', { ...idle, output: { file: { numLines: 1386 } } }))], 40, { mono: true })

// An Edit: its counts as pills, its lines under it.
const patch = [
  { oldStart: 160, newStart: 160, lines: [' export const badgeSvg = (color: string, icon: string) => {', '-  const r = 14.5', '-  const c = 2 * Math.PI * r', '+  const rx = 8', '+  const edge = (extra: string) => `x="3.5" y="3.5" ${extra}`', '   const done = !running'] },
  { oldStart: 402, newStart: 401, lines: [' /** How long a row\'s finish takes to play. */', '+export const MOTION = { out: \'0.22 1 0.36 1\' }'] },
]
const d = diffRows(patch)
row('edit', 'Edit', 'chat.ts', [
  { text: `+${d.added}`, ...PILL.ok },
  { text: `−${d.removed}`, ...PILL.bad },
], 1100, { mono: true })
{
  const lineH = 20
  const cardX = X + 32
  const cardW = W - X - cardX
  const h = d.rows.length * lineH + 8
  y -= 4
  parts.push(`<rect x="${cardX}" y="${y}" width="${cardW}" height="${h}" rx="9" fill="none" stroke="${INK.line}" stroke-width="1.2"/>`)
  parts.push(`<clipPath id="card"><rect x="${cardX + 1}" y="${y + 1}" width="${cardW - 2}" height="${h - 2}" rx="8"/></clipPath><g clip-path="url(#card)">`)
  const gutter = String(Math.max(...d.rows.map(r => r.n ?? 0))).length
  d.rows.forEach((r, i) => {
    const ly = y + 4 + i * lineH
    if (r.sign === '+' || r.sign === '-') parts.push(`<rect x="${cardX}" y="${ly}" width="${cardW}" height="${lineH}" fill="${r.sign === '+' ? '#1d2a21' : '#2e1c21'}"/>`)
    const num = r.sign === '@' ? '⋯'.padStart(gutter) : String(r.n ?? '').padStart(gutter)
    parts.push(`<text x="${cardX + 12}" y="${ly + 14.5}" ${mono} font-size="12.5" fill="${INK.detail}" xml:space="preserve">${esc(num)}</text>`)
    if (r.sign !== '@') {
      const fill = r.sign === '+' ? PILL.ok.fg : r.sign === '-' ? PILL.bad.fg : INK.detail
      parts.push(`<text x="${cardX + 12 + (gutter + 1) * 7.6}" y="${ly + 14.5}" ${mono} font-size="12.5" fill="${fill}" xml:space="preserve">${esc(`${r.sign === '-' ? '−' : r.sign} ${r.text}`)}</text>`)
    }
  })
  parts.push(`</g>`)
  y += h + 12
}

row('delete', 'Delete', 'old.js build', [done(statusPill('Bash', idle))], 90, { mono: true })
row('search', 'Explore', 'Read 3 · Search 2 · Find 1', [{ text: '6 calls', icon: 'check', ...PILL.ok }])
row('run', 'Run', 'bun run build', [{ text: 'running', running: true, ...PILL.busy }], undefined, { running: true })
row('agent', 'Agent', taskSummary('Agent "Agent smoke test" completed', 'Agent'), [{ text: 'done', icon: 'check', ...PILL.ok }], 8000)
row('run', 'Run', 'Deploy to staging', [done(statusPill('Bash', { ...idle, isErrored: true }))], 2600)

const H = y + 10
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="16" fill="#1f1d1d"/>${parts.join('')}</svg>`
writeFileSync(out ?? new URL('../docs/preview-chat.svg', import.meta.url), svg)

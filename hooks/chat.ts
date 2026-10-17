// Pure helpers for the transcript: no engine calls here, so tests run them as is.

import { hasIcon, iconGroup } from './icons'
import type { IconName } from './icons'

export type Kind = 'read' | 'edit' | 'write' | 'run' | 'search' | 'agent' | 'web' | 'plan' | 'other'

export const KIND_COLOR: Record<Kind, string> = {
  read: '#7cb7ff',
  edit: '#ffb86b',
  write: '#ff7ab6',
  run: '#ffd166',
  search: '#5fd3c4',
  agent: '#9b8cf7',
  web: '#6fc3ff',
  plan: '#7bd88f',
  other: '#a8a29e',
}

export const KIND_GLYPH: Record<Kind, string> = {
  read: '▤',
  edit: '✎',
  write: '✚',
  run: '>_',
  search: '⌕',
  agent: '◈',
  web: '◍',
  plan: '☑',
  other: '⚙',
}

export const KIND_ICON: Record<Kind, IconName> = {
  read: 'file',
  edit: 'pencil',
  write: 'filePlus',
  run: 'terminal',
  search: 'search',
  agent: 'bot',
  web: 'globe',
  plan: 'checklist',
  other: 'cube',
}

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
export const base = (p: string) => p.split('/').filter(Boolean).pop() ?? p
const short = (tool: string) => tool.replace(/^mcp__.*__/, '')

type Input = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** What a tool row says: a coloured verb and the thing it acted on. */
export const describe = (tool: string, raw: unknown, isRerun = false) => {
  const i = (raw ?? {}) as Input
  const name = short(tool)
  const path = str(i.file_path) || str(i.path) || str(i.notebook_path)
  switch (name) {
    case 'Bash':
      return {
        kind: 'run' as Kind,
        verb: isRerun ? 'Rerun' : 'Run',
        target: clip(str(i.description) || str(i.command).replace(/\s+/g, ' '), 64),
      }
    case 'Read':
      return { kind: 'read' as Kind, verb: 'Read', target: base(path) }
    case 'Edit':
    case 'NotebookEdit':
      return { kind: 'edit' as Kind, verb: 'Edit', target: base(path) }
    case 'Write':
      return { kind: 'write' as Kind, verb: 'Write', target: base(path) }
    case 'Grep':
      return { kind: 'search' as Kind, verb: 'Search', target: clip(str(i.pattern), 48) }
    case 'Glob':
      return { kind: 'search' as Kind, verb: 'Find', target: clip(str(i.pattern), 48) }
    case 'Agent':
    case 'Task':
      return { kind: 'agent' as Kind, verb: 'Delegate', target: clip(str(i.description), 56) }
    case 'WebFetch': {
      const url = str(i.url)
      return { kind: 'web' as Kind, verb: 'Fetch', target: clip(url.replace(/^https?:\/\//, ''), 56) }
    }
    case 'WebSearch':
      return { kind: 'web' as Kind, verb: 'Search web', target: clip(str(i.query), 56) }
    case 'AskUserQuestion': {
      const first = Array.isArray(i.questions) ? ((i.questions[0] ?? {}) as { question?: string }).question : ''
      return { kind: 'agent' as Kind, verb: 'Ask', target: clip(first ?? '', 64) }
    }
    case 'TodoWrite':
    case 'update_plan': {
      const n = Array.isArray(i.todos) ? i.todos.length : Array.isArray(i.items) ? i.items.length : 0
      return { kind: 'plan' as Kind, verb: 'Plan', target: n > 0 ? `${n} steps` : 'update' }
    }
    default:
      return { kind: 'other' as Kind, verb: 'Use', target: name }
  }
}

export const parseTests = (text: string) => {
  const passed = /(\d+)\s+pass(?:ed)?\b/i.exec(text)
  const failed = /(\d+)\s+fail(?:ed|ures?)?\b/i.exec(text)
  return {
    passed: passed ? Number(passed[1]) : null,
    failed: failed ? Number(failed[1]) : null,
  }
}

export type PillIcon = 'check' | 'cross' | 'ban'
export type Pill = { text: string; fg: string; bg: string; running?: boolean; icon?: PillIcon }

export const PILL = {
  ok: { fg: '#a9e6b4', bg: '#2d4232' },
  bad: { fg: '#f4a1b3', bg: '#4a2b33' },
  busy: { fg: '#c4baff', bg: '#2d2a3f' },
  warn: { fg: '#ffd9a0', bg: '#3a3224' },
}

/** The status pill at the right of a tool row. */
export const statusPill = (
  tool: string,
  s: { isRunning: boolean; isErrored: boolean; isInterrupted: boolean; output?: unknown },
): Pill => {
  if (s.isRunning) return { text: 'running', running: true, ...PILL.busy }
  if (s.isInterrupted) return { text: 'interrupted', icon: 'ban', ...PILL.warn }
  if (s.isErrored) return { text: 'error', icon: 'cross', ...PILL.bad }

  const out = (s.output ?? {}) as Input
  const name = short(tool)
  if (name === 'Bash') {
    const t = parseTests(`${str(out.stdout)}\n${str(out.stderr)}`)
    if (t.failed) return { text: `${t.failed} failed`, icon: 'cross', ...PILL.bad }
    if (t.passed) return { text: `${t.passed} passed`, icon: 'check', ...PILL.ok }
    return { text: 'done', icon: 'check', ...PILL.ok }
  }
  if (name === 'Edit' || name === 'Write' || name === 'NotebookEdit') return { text: 'saved', icon: 'check', ...PILL.ok }
  if (name === 'Read') {
    const file = (out.file ?? {}) as Input
    const n = typeof file.numLines === 'number' ? file.numLines : null
    return { text: n === null ? 'read' : `${n} lines`, icon: 'check', ...PILL.ok }
  }
  return { text: 'done', icon: 'check', ...PILL.ok }
}

/** Whole seconds as s / m / h / d: 7s, 1m 4s, 2h 5m, 3d 4h. */
export const fmtElapsed = (totalSecs: number) => {
  const s = Number.isFinite(totalSecs) ? Math.max(0, Math.floor(totalSecs)) : 0
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
}

/** Tenths of a second under a minute; compared after rounding so 59.96 s reads 1m 0s, not 60.0 s. */
export const fmtDuration = (ms: number) =>
  Math.round(ms / 100) < 600 ? `${(ms / 1000).toFixed(1)} s` : fmtElapsed(Math.round(ms / 1000))

/** A round badge: tinted disc, ring, glyph. */
export const badgeSvg = (color: string, icon: string, size: number, running = false) => {
  const g = icon.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fs = icon.length > 1 ? 12 : 14
  const mark = hasIcon(icon)
    ? iconGroup(icon, color, 8, 8, 16, 2.1)
    : `<text x="16" y="${icon.length > 1 ? 20.5 : 21}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="${fs}" font-weight="700" fill="${color}">${g}</text>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    `<circle cx="16" cy="16" r="15" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-opacity="0.45"/>` +
    (running
      ? `<circle cx="16" cy="16" r="5" fill="none" stroke="${color}" stroke-width="1.6" stroke-opacity="0.6">` +
        `<animate attributeName="r" from="5" to="14" dur="1.3s" repeatCount="indefinite"/>` +
        `<animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.3s" repeatCount="indefinite"/></circle>`
      : '') +
    mark +
    `</svg>`
  )
}

export type DiffRow = { n: number | null; sign: '+' | '-' | ' '; text: string }

/** Rows of a unified patch, numbered like an editor: new-file lines, old lines for removals. */
export const diffRows = (hunks: unknown, fallback?: string, max = 14) => {
  const rows: DiffRow[] = []
  if (Array.isArray(hunks) && hunks.length > 0) {
    for (const h of hunks as { oldStart: number; newStart: number; lines: string[] }[]) {
      let oldLine = h.oldStart
      let newLine = h.newStart
      for (const line of h.lines ?? []) {
        const sign = line[0] === '+' ? '+' : line[0] === '-' ? '-' : ' '
        const text = line.slice(1)
        if (sign === '+') rows.push({ n: newLine++, sign, text })
        else if (sign === '-') rows.push({ n: oldLine++, sign, text })
        else {
          rows.push({ n: newLine, sign, text })
          oldLine++
          newLine++
        }
      }
    }
  } else if (fallback) {
    fallback.split('\n').forEach((text, i) => rows.push({ n: i + 1, sign: '+', text }))
  }
  const total = rows.length
  return { rows: rows.slice(0, max), more: Math.max(0, total - max) }
}

export const countChanges = (rows: DiffRow[]) => ({
  added: rows.filter(r => r.sign === '+').length,
  removed: rows.filter(r => r.sign === '-').length,
})

// A cheap deterministic hash in [0, 1): the same bar draws the same dots every time.
const noise = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The surface every card and chart sits on: a soft top-lit gradient and a hairline edge. */
export const PANEL = { top: '#2a2625', bottom: '#1e1b1a', edge: '#443e3b', glow: '#ffffff' }

/**
 * A panel's background: gradient fill, hairline edge, a one-pixel highlight along the top.
 * `id` keeps the gradient's name unique where several panels share one document.
 * `edgeAnim` goes inside the edge's rect (a flash of the border).
 */
export const panelSvg = (id: string, width: number, height: number, rx = 12, edgeAnim = '') =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PANEL.top}"/><stop offset="1" stop-color="${PANEL.bottom}"/></linearGradient></defs>` +
  `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx}" fill="url(#${id})"/>` +
  `<path d="M${rx + 2} 1.5H${width - rx - 2}" stroke="${PANEL.glow}" stroke-opacity="0.05" stroke-width="1"/>` +
  `<rect x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}" rx="${rx}" fill="none" stroke="${PANEL.edge}" stroke-width="1.5">${edgeAnim}</rect>`

/**
 * The band's one ornament: a faint halftone of square dots that gathers toward the
 * top-right corner of the box (x1, y0) and thins to nothing a quarter-circle away.
 * Deterministic, so a redraw gives the same picture.
 */
export const halftone = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: { step?: number; color?: string; opacity?: number; corner?: 'tr' | 'br' } = {},
) => {
  const step = opts.step ?? 4
  const size = +(step * 0.5).toFixed(2)
  const cols = Math.floor((x1 - x0) / step)
  const rows = Math.floor((y1 - y0) / step)
  const cells: string[] = []
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      const dx = cx / Math.max(1, cols - 1)
      const dy = ry / Math.max(1, rows - 1)
      // Full at the corner, gone a quarter-circle away; the noise thins it between.
      const t = Math.pow(Math.max(0, 1 - Math.hypot(dx, dy)), 1.3)
      if (noise(cx + 101, ry + 7) >= t) continue
      const x = x1 - (cx + 1) * step
      const y = opts.corner === 'br' ? y1 - (ry + 1) * step : y0 + ry * step
      cells.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${size}v${size}h-${size}z`)
    }
  }
  return cells.length > 0 ? `<path d="${cells.join('')}" fill="${opts.color ?? '#b8b0ab'}" fill-opacity="${opts.opacity ?? 0.16}"/>` : ''
}

/** ≈-free money for a stat card: always two decimals, $15.62. */
export const fmtCost = (usd: number) => `$${usd.toFixed(2)}`

/** 0:18, 12:05, 1:02:03 (hours only when needed). */
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Token counts with k / M / B / T: 950, 1.5k, 196k, 1.25M, 3.4B. */
export const fmtTokens = (n: number) => {
  const units = ['', 'k', 'M', 'B', 'T']
  const shape = (v: number) => {
    const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s
  }
  let v = Math.max(0, n)
  let u = 0
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000
    u++
  }
  if (u === 0) return String(Math.round(v))
  let s = shape(v)
  if (parseFloat(s) >= 1000 && u < units.length - 1) {
    v /= 1000
    u++
    s = shape(v)
  }
  return s + units[u]
}

/**
 * Output speed of one model response, in tokens per second. A reply too short to time
 * (a bare tool call) or with no usable clock gives null, so it never drags the figure down.
 */
export const tokensPerSec = (outputTokens: number, ms: number, minTokens = 20) =>
  outputTokens >= minTokens && ms > 0 ? outputTokens / (ms / 1000) : null

/** Speed for a tile: 42, 8.5 (one decimal under 10). */
export const fmtSpeed = (tps: number) => (tps < 10 ? String(Math.round(tps * 10) / 10) : String(Math.round(tps)))

/** Rough width of a label in px at a given font size: symbols run wide, capitals a little wider. */
const labelWidth = (text: string, fs: number) =>
  Math.round(
    [...text].reduce((w, ch) => {
      if (ch === ' ') return w + fs * 0.3
      if (ch.charCodeAt(0) > 0x2000) return w + fs * 1.0
      if (/[A-Z0-9mwMW%…]/.test(ch)) return w + fs * 0.66
      return w + fs * 0.56
    }, 0),
  )

/**
 * A capsule badge: fully rounded, tinted fill, bold label. `textLength` pins the
 * label to the width measured here, so the capsule fits whatever font draws it.
 */
export const pillSvg = (text: string, fg: string, bg: string, height = 24, running = false, icon?: PillIcon) => {
  const fs = +(height * 0.52).toFixed(1)
  const tl = labelWidth(text, fs)
  const dotR = +(height * 0.11).toFixed(2)
  const gap = +(height * 0.3).toFixed(2)
  const lead = running ? Math.round(2 * gap + 2 * dotR + height * 0.3) : icon ? Math.round(height * 0.62) : 0 // room for the dots or the icon
  const width = tl + lead + Math.round(height * 0.95)
  const t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const tx = (width + lead) / 2
  // Three dots that fade in turn, and a slow pulse of the fill. Both are SMIL, which a
  // surface plays only when the Svg is `isInteractive`; plain shapes, so any renderer draws them.
  const pulse = running ? `<animate attributeName="fill-opacity" values="1;0.62;1" dur="1.8s" repeatCount="indefinite"/>` : ''
  const dots = running
    ? [0, 1, 2]
        .map(
          i =>
            `<circle cx="${(height * 0.5 + i * gap).toFixed(2)}" cy="${height / 2}" r="${dotR}" fill="${fg}" opacity="0.35">` +
            `<animate attributeName="opacity" values="0.35;1;0.35" dur="1.2s" begin="${(i * 0.2).toFixed(1)}s" repeatCount="indefinite"/></circle>`,
        )
        .join('')
    : ''
  const mark = icon ? iconGroup(icon, fg, height * 0.42, (height - height * 0.46) / 2, height * 0.46, 3) : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}">${pulse}</rect>` +
    dots +
    mark +
    `<text x="${tx}" y="${(height / 2 + fs * 0.35).toFixed(1)}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="${fg}" textLength="${tl}" lengthAdjust="spacingAndGlyphs">${t}</text>` +
    `</svg>`
  return { svg, width, height }
}

/**
 * A loading bar with no number behind it: a dark rounded track sprinkled with faint
 * dots and, while `live`, a soft glow that sweeps across it, lighting a dithered
 * field of violet dots as it passes. Idle, it is just the quiet track.
 *
 * The sweep is SMIL, which a surface plays only for an `isInteractive` Svg.
 * `padBottom` adds transparent room under the bar, in px.
 */
export const loadingSvg = (
  width: number,
  height: number,
  color: string,
  opts: { live?: boolean; padBottom?: number } = {},
) => {
  const w = Math.max(120, Math.round(width))
  const h = height
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  const uid = `l${w}_${h}` // ids stay unique if two bars ever share a document
  const step = Math.max(3, Math.round(h / 6.5))
  const size = +(step * 0.55).toFixed(2)
  const rows = Math.max(1, Math.floor((h - 4) / step))
  const top = (h - rows * step) / 2

  const faint: string[] = []
  const bright: string[] = []
  const dim: string[] = []
  for (let cx = 0; cx * step + step < w - 6; cx++) {
    const x = 8 + cx * step
    for (let ry = 0; ry < rows; ry++) {
      const r = noise(cx, ry)
      const y = top + ry * step
      const cell = `M${x} ${y.toFixed(1)}h${size}v${size}h-${size}z`
      if (r < 0.1) faint.push(cell)
      if (r < 0.74) (r < 0.36 ? bright : dim).push(cell)
    }
  }

  const gw = Math.round(w * 0.4)
  const sweep = opts.live
    ? `<defs>` +
      `<linearGradient id="${uid}g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${uid}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
      `<rect x="${-gw}" y="0" width="${gw}" height="${h}" fill="url(#${uid}g)"><animate attributeName="x" from="${-gw}" to="${w}" dur="1.9s" repeatCount="indefinite"/></rect>` +
      `</mask></defs>` +
      `<g mask="url(#${uid}m)">` +
      `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${color}" fill-opacity="0.2"/>` +
      `<path d="${bright.join('')}" fill="${color}" fill-opacity="0.95"/>` +
      `<path d="${dim.join('')}" fill="${color}" fill-opacity="0.55"/>` +
      `</g>`
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + pad}" width="${w}" height="${h + pad}">` +
    `<rect width="${w}" height="${h}" rx="${h / 2}" fill="#262323"/>` +
    `<path d="${dim.join('')}" fill="${color}" fill-opacity="0.12"/>` +
    `<path d="${faint.join('')}" fill="#8a8480" fill-opacity="0.3"/>` +
    sweep +
    `</svg>`
  )
}

/** The little status dot of the band: still when idle, with a ripple while Claude works. */
export const dotSvg = (color: string, live: boolean, size = 14) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">` +
  (live
    ? `<circle cx="7" cy="7" r="4" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity="0.7">` +
      `<animate attributeName="r" from="4" to="7" dur="1.4s" repeatCount="indefinite"/>` +
      `<animate attributeName="stroke-opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite"/></circle>`
    : '') +
  `<circle cx="7" cy="7" r="4" fill="${color}"/>` +
  `</svg>`

/** While a turn runs, a card's icon disc breathes in its own colour over this period. */
export const CARD_BREATHE_MS = 2400

/** SMIL `begin` that puts a looping animation at the phase it would have reached at `atMs`,
 * so a redraw (the band redraws every second) continues the motion instead of restarting it. */
export const phaseBegin = (atMs: number, periodMs: number) =>
  `${(-(((atMs % periodMs) + periodMs) % periodMs) / 1000).toFixed(3)}s`

/**
 * A stat card as SVG. When `changed`, the value rises into place and the border
 * flashes the accent colour once; an unchanged card is a still picture.
 * With `live` (a turn is running), the icon disc breathes.
 */
export const cardSvg = (
  label: string,
  value: string,
  opts: { changed?: boolean; accent?: string; icon?: IconName; iconColor?: string; live?: { now: number } } = {},
) => {
  const accent = opts.accent ?? '#9b8cf7'
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const width = Math.max(112, Math.round(value.length * 10 + 28))
  const height = 50
  const spline = 'calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1"'
  const border = opts.changed
    ? `<animate attributeName="stroke" from="${accent}" to="${PANEL.edge}" dur="1.1s" fill="freeze"/>`
    : ''
  const rise = opts.changed
    ? `<animate attributeName="opacity" from="0" to="1" dur="0.45s" fill="freeze" ${spline}/>` +
      `<animateTransform attributeName="transform" type="translate" from="0 8" to="0 0" dur="0.45s" fill="freeze" ${spline}/>`
    : ''
  const iconColor = opts.iconColor ?? '#8f8985'
  // While working, the icon disc breathes, phase-locked to the clock so a redraw continues it.
  const ease = '0.45 0 0.55 1'
  const breathe = opts.live
    ? `<animate attributeName="fill-opacity" values="0.13;0.3;0.13" keyTimes="0;0.5;1" calcMode="spline" keySplines="${ease};${ease}" dur="${CARD_BREATHE_MS / 1000}s" begin="${phaseBegin(opts.live.now, CARD_BREATHE_MS)}" repeatCount="indefinite"/>`
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    panelSvg('cardg', width, height, 12, border) +
    halftone(Math.round(width * 0.45), 6, width - 7, 27, { color: iconColor, opacity: 0.22 }) +
    // The icon sits on a disc tinted its own colour, the way a tool badge does.
    (opts.icon ? `<circle cx="20.5" cy="15" r="11" fill="${iconColor}" fill-opacity="0.13">${breathe}</circle>` + iconGroup(opts.icon, iconColor, 13, 7.5, 15, 2.1) : '') +
    `<text x="${opts.icon ? 34 : 14}" y="19" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11.5" fill="#8f8985">${esc(label)}</text>` +
    `<text x="14" y="39" font-family="ui-sans-serif,system-ui,sans-serif" font-size="17" font-weight="700" fill="#ece7e4">${esc(value)}${rise}</text>` +
    `</svg>`
  return { svg, width, height }
}

/**
 * The tool-call counter as a labelled capsule: bolt, the number, and the word it counts.
 * A growing count makes the capsule flash and the number rise once; a hover title says
 * what it is (shown by a surface that plays an interactive Svg).
 */
export const countSvg = (count: number, opts: { changed?: boolean; label?: string } = {}) => {
  const height = 24
  const word = opts.label ?? (count === 1 ? 'tool' : 'tools')
  const num = String(count)
  const fs = 12.5
  const numW = Math.round(num.length * fs * 0.62)
  const wordW = Math.round(word.length * 11 * 0.56)
  const numX = 28
  const wordX = numX + numW + 5
  const width = wordX + wordW + 11
  const bg = '#33301f'
  const spline = 'calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1"'
  const flash = opts.changed ? `<animate attributeName="fill" from="#6b5a22" to="${bg}" dur="0.8s" fill="freeze"/>` : ''
  const rise = opts.changed
    ? `<animateTransform attributeName="transform" type="translate" from="0 6" to="0 0" dur="0.4s" fill="freeze" ${spline}/>` +
      `<animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" ${spline}/>`
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<title>Tool calls this turn</title>` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}">${flash}</rect>` +
    iconGroup('bolt', '#ffd166', 9, 5.5, 13, 2.4) +
    `<text x="${numX}" y="16.3" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f6e3a1" textLength="${numW}" lengthAdjust="spacingAndGlyphs">${num}${rise}</text>` +
    `<text x="${wordX}" y="16" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" fill="#b8a96a" textLength="${wordW}" lengthAdjust="spacingAndGlyphs">${word}</text>` +
    `</svg>`
  return { svg, width, height }
}

/**
 * "resets in 3h 20m" from a rate-limit window's reset time (ISO) and now, or null when the
 * time is missing or unreadable. Whole units only: 45m, 2h, 3h 20m, 2d 4h.
 */
export const fmtReset = (iso: string | undefined, now: number): string | null => {
  if (!iso) return null
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  const ms = at - now
  if (ms <= 0) return 'resetting now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'resets in <1m'
  if (mins < 60) return `resets in ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `resets in ${hours}h${mins % 60 ? ` ${mins % 60}m` : ''}`
  const days = Math.floor(hours / 24)
  return `resets in ${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`
}

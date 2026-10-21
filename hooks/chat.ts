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
/** The last part of a path, for POSIX and Windows paths alike (C:\\work\\app → app). */
export const base = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p
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

/** One turn of a running spinner, in seconds: steady and unhurried, so it reads as "busy", not "alarm". */
export const SPIN_S = 1.1

/** A round badge: tinted disc, ring, glyph. While running, a short arc turns around the ring. */
export const badgeSvg = (color: string, icon: string, size: number, running = false, now = 0) => {
  const g = icon.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fs = icon.length > 1 ? 12 : 14
  const mark = hasIcon(icon)
    ? iconGroup(icon, color, 7, 7, 18, 2)
    : `<text x="16" y="${icon.length > 1 ? 20.5 : 21}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="${fs}" font-weight="700" fill="${color}">${g}</text>`
  // A quarter of the ring, turning: one clear sign of work in place of a ripple that fights the icon.
  const r = 14.5
  const c = 2 * Math.PI * r
  const spin = running
    ? `<circle cx="16" cy="16" r="${r}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="${(c * 0.26).toFixed(2)} ${c.toFixed(2)}">` +
      `<animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="${SPIN_S}s" begin="${phaseBegin(now, SPIN_S * 1000)}" repeatCount="indefinite"/></circle>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    `<circle cx="16" cy="16" r="15" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-opacity="${running ? 0.22 : 0.45}"/>` +
    spin +
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

/**
 * Speed right now, from the pieces of a response as they stream: `samples` are
 * [time in ms, characters so far], oldest first. The rate over the last `windowMs`, turned
 * into tokens at `charsPerToken`; null until the window spans `minMs`, so the first burst of
 * a response does not read as a spike.
 */
export const liveSpeed = (samples: ReadonlyArray<readonly [number, number]>, now: number, opts: { windowMs?: number; minMs?: number; charsPerToken?: number } = {}) => {
  const { windowMs = 1500, minMs = 400, charsPerToken = 4 } = opts
  const last = samples[samples.length - 1]
  if (!last) return null
  const first = samples.find(([at]) => now - at <= windowMs) ?? last
  const ms = now - first[0]
  if (ms < minMs) return null
  return (last[1] - first[1]) / charsPerToken / (ms / 1000)
}

/** The speedometer's full scale: the first round step clear of the best speed seen. */
export const speedScale = (peak: number) =>
  [50, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000].find(s => s >= peak * 1.1) ?? Math.ceil((peak * 1.1) / 1000) * 1000

/**
 * A speedometer as SVG: a 270° track open at the bottom, an arc filled to `fraction`, and a
 * needle. Given `from` (the fraction it was last drawn at) the arc and needle sweep from there,
 * so redraws a few times a second read as one needle moving.
 */
export const speedoSvg = (fraction: number, color: string, size: number, opts: { from?: number; ago?: number } = {}) => {
  const f = Math.max(0, Math.min(1, fraction))
  const from = opts.from === undefined ? f : Math.max(0, Math.min(1, opts.from))
  const r = 17
  const c = 2 * Math.PI * r
  const sweep = 0.75 * c
  const dash = (v: number) => `${(v * sweep).toFixed(2)} ${c.toFixed(2)}`
  const angle = (v: number) => (-135 + v * 270).toFixed(1)
  const moving = from !== f
  const anim = `dur="0.35s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.3 1" begin="${sinceBegin(opts.ago)}"`
  const arc =
    f > 0 || moving
      ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash(f)}" transform="rotate(135 22 22)">` +
        (moving ? `<animate attributeName="stroke-dasharray" from="${dash(from)}" to="${dash(f)}" ${anim}/>` : '') +
        `</circle>`
      : ''
  const needle =
    `<g transform="rotate(${angle(f)} 22 22)">` +
    (moving ? `<animateTransform attributeName="transform" type="rotate" from="${angle(from)} 22 22" to="${angle(f)} 22 22" ${anim}/>` : '') +
    `<path d="M22 22 L22 9" stroke="#f1ece8" stroke-width="2.6" stroke-linecap="round"/></g>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}">` +
    `<circle cx="22" cy="22" r="${r}" fill="none" stroke="#3a3433" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash(1)}" transform="rotate(135 22 22)"/>` +
    arc +
    needle +
    `<circle cx="22" cy="22" r="3.2" fill="${color}"/>` +
    `</svg>`
  )
}

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
export const pillSvg = (text: string, fg: string, bg: string, height = 24, running = false, icon?: PillIcon, now = 0, minWidth = 0) => {
  const fs = +(height * 0.52).toFixed(1)
  const tl = labelWidth(text, fs)
  const dotR = +(height * 0.11).toFixed(2)
  const gap = +(height * 0.3).toFixed(2)
  const lead = running ? Math.round(2 * gap + 2 * dotR + height * 0.3) : icon ? Math.round(height * 0.62) : 0 // room for the dots or the icon
  // `minWidth` holds a pill as wide as another state's, so what follows it never shifts.
  const width = Math.max(minWidth, tl + lead + Math.round(height * 0.95))
  const t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const tx = (width + lead) / 2
  // Three dots that light in turn, a wave left to right, eased. One motion only: the capsule
  // itself stays still. Phase-locked to `now`, so a redraw carries the wave on.
  const ease = 'calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"'
  const dots = running
    ? [0, 1, 2]
        .map(
          i =>
            `<circle cx="${(height * 0.5 + i * gap).toFixed(2)}" cy="${height / 2}" r="${dotR}" fill="${fg}" opacity="0.3">` +
            `<animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" begin="${phaseBegin(now - i * 180, 1200)}" repeatCount="indefinite" ${ease}/></circle>`,
        )
        .join('')
    : ''
  const mark = icon ? iconGroup(icon, fg, height * 0.42, (height - height * 0.46) / 2, height * 0.46, 3) : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}"/>` +
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
 * The sweep is SMIL, phase-locked to `now`, so a redraw carries it on.
 * `padBottom` adds transparent room under the bar, in px.
 */
export const loadingSvg = (
  width: number,
  height: number,
  color: string,
  opts: { live?: boolean; padBottom?: number; now?: number } = {},
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
  // The glow starts where its loop has reached by `now`, not off the left edge: a surface that
  // does not play the SMIL still shows it, stepping on with each redraw.
  const gx = Math.round(-gw + ((((opts.now ?? 0) % 1900) + 1900) % 1900 / 1900) * (w + gw))
  const sweep = opts.live
    ? `<defs>` +
      `<linearGradient id="${uid}g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${uid}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
      `<rect x="${gx}" y="0" width="${gw}" height="${h}" fill="url(#${uid}g)"><animate attributeName="x" from="${-gw}" to="${w}" dur="1.9s" begin="${phaseBegin(opts.now ?? 0, 1900)}" repeatCount="indefinite"/></rect>` +
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
export const dotSvg = (color: string, live: boolean, size = 14, now = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">` +
  (live
    ? `<circle cx="7" cy="7" r="4" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity="0.7">` +
      `<animate attributeName="r" from="4" to="7" dur="1.4s" begin="${phaseBegin(now, 1400)}" repeatCount="indefinite"/>` +
      `<animate attributeName="stroke-opacity" from="0.7" to="0" dur="1.4s" begin="${phaseBegin(now, 1400)}" repeatCount="indefinite"/></circle>`
    : '') +
  `<circle cx="7" cy="7" r="4" fill="${color}"/>` +
  `</svg>`

/** While a turn runs, a live card's icon tile breathes in its own colour over this period. */
export const CARD_BREATHE_MS = 2400

/** SMIL `begin` that puts a looping animation at the phase it would have reached at `atMs`,
 * so a redraw (the band redraws every second) continues the motion instead of restarting it. */
export const phaseBegin = (atMs: number, periodMs: number) =>
  `${(-(((atMs % periodMs) + periodMs) % periodMs) / 1000).toFixed(3)}s`

/** SMIL `begin` for a one-shot that started `agoMs` ago: a redraw mid-motion picks it up where
 * it was (and past its end, shows the end), instead of playing it again from the start. */
export const sinceBegin = (agoMs = 0) => `${(-Math.max(0, agoMs) / 1000).toFixed(3)}s`

/** Card geometry: the icon tile on the left, label over value beside it. */
export const CARD = { height: 52, tile: 36, icon: 22, textX: 54, pad: 16 }

/** How long a changed value takes to roll into place, and a clock digit to tick over, in s. */
export const CARD_ROLL_S = 0.5
const CLOCK_ROLL_S = 0.35

/**
 * The clock as an odometer: each digit is a strip of numerals that steps one place per
 * unit (a second, ten seconds, a minute...) with a short eased roll, started at `elapsedMs`.
 * A picture drawn at a whole second opens on that second's roll, so a redraw each second
 * reads as one continuous tick; without SMIL the strips already stand at `elapsedMs`.
 */
export const clockOdometer = (elapsedMs: number, x: number, y: number, fs: number, lineH: number) => {
  // Layout and numerals from the same whole second, so a new digit never shows as a leading 0.
  const sec = Math.max(0, Math.floor(elapsedMs / 1000))
  const shape = fmtClock(sec * 1000)
  const digitW = +(fs * 0.62).toFixed(2)
  const colonW = +(fs * 0.34).toFixed(2)
  // From the right: unit in seconds and how many numerals the place cycles through.
  const places: Array<[number, number]> = [[1, 10], [10, 6], [60, 10], [600, 6], [3600, 10], [36000, 10]]
  const font = `font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f1ece8" text-anchor="middle"`
  const parts: string[] = []
  let cx = x
  let place = [...shape].filter(c => c !== ':').length - 1
  for (const ch of shape) {
    if (ch === ':') {
      parts.push(`<text x="${(cx + colonW / 2).toFixed(2)}" y="${y}" ${font}>:</text>`)
      cx += colonW
      continue
    }
    const [unit, base] = places[place--] ?? [36000, 10]
    const period = unit * base
    const mid = (cx + digitW / 2).toFixed(2)
    // Strip index 0 is the numeral before 0, then 0..base-1: the loop wraps seamlessly.
    const strip = Array.from({ length: base + 1 }, (_, i) => `<text x="${mid}" y="${y + i * lineH}" ${font}>${(i + base - 1) % base}</text>`).join('')
    const roll = Math.min(CLOCK_ROLL_S, unit * 0.5)
    const times: number[] = []
    const values: string[] = []
    const splines: string[] = []
    for (let k = 0; k < base; k++) {
      times.push(k * unit, k * unit + roll)
      values.push(`0 ${-k * lineH}`, `0 ${-(k + 1) * lineH}`)
      splines.push('0.3 0 0.2 1', '0 0 1 1')
    }
    times.push(period)
    values.push(`0 ${-base * lineH}`)
    const keyTimes = times.map(t => +(t / period).toFixed(5)).join(';')
    const begin = `${(-((elapsedMs / 1000) % period)).toFixed(3)}s`
    // Where the strip stands now, so a surface that does not play SMIL still shows the right time.
    const at = Math.floor(sec / unit) % base + 1
    parts.push(
      `<g transform="translate(0 ${-at * lineH})">${strip}<animateTransform attributeName="transform" type="translate" values="${values.join(';')}" keyTimes="${keyTimes}" calcMode="spline" keySplines="${splines.join(';')}" dur="${period}s" begin="${begin}" repeatCount="indefinite"/></g>`,
    )
    cx += digitW
  }
  return { markup: parts.join(''), width: Math.ceil(cx - x) }
}

/**
 * A stat card as SVG: a tinted icon tile on the left, the label over the value beside it.
 * When `changed`, the old value (`from`) rolls up and out as the new one rolls in from below,
 * and the border glows the card's own colour once; the frame, icon and label never fade, so
 * an update reads as motion, not a blink. An unchanged card is a still picture.
 * With `live` (a turn is running), the icon tile breathes; with `clock`, the value is a
 * self-running odometer started at `clock.elapsedMs`.
 */
export const cardSvg = (
  label: string,
  value: string,
  opts: {
    changed?: boolean
    from?: string
    accent?: string
    icon?: IconName
    iconColor?: string
    live?: { now: number }
    clock?: { elapsedMs: number }
    /** How long ago the value changed: a redraw mid-roll carries on from there. */
    ago?: number
  } = {},
) => {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const iconColor = opts.iconColor ?? '#8f8985'
  const flashColor = opts.iconColor ?? opts.accent ?? '#9b8cf7'
  const textX = opts.icon ? CARD.textX : 14
  const fs = 17
  const lineH = 22
  const odo = opts.clock ? clockOdometer(opts.clock.elapsedMs, textX, 40, fs, lineH) : null
  // Sized by the value it settles on, measured the same way whether the clock ticks or not:
  // the card never changes width once a roll ends, nor when a turn starts or stops. (The
  // odometer is narrower than this measure, and a wider old value is clipped as it leaves.)
  const textW = Math.max(labelWidth(value, fs), labelWidth(label, 11.5))
  const width = Math.max(opts.icon ? 120 : 96, textX + textW + CARD.pad)
  const height = CARD.height
  const spline = `calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" begin="${sinceBegin(opts.ago)}"`
  const border = opts.changed
    ? `<animate attributeName="stroke" from="${flashColor}" to="${PANEL.edge}" dur="1.1s" fill="freeze" ${spline}/>`
    : ''
  const ease = '0.45 0 0.55 1'
  const breathe = opts.live
    ? `<animate attributeName="fill-opacity" values="0.14;0.3;0.14" keyTimes="0;0.5;1" calcMode="spline" keySplines="${ease};${ease}" dur="${CARD_BREATHE_MS / 1000}s" begin="${phaseBegin(opts.live.now, CARD_BREATHE_MS)}" repeatCount="indefinite"/>`
    : ''
  const t = (height - CARD.tile) / 2
  const io = t + (CARD.tile - CARD.icon) / 2
  const tile = opts.icon
    ? `<rect x="${t}" y="${t}" width="${CARD.tile}" height="${CARD.tile}" rx="10" fill="${iconColor}" fill-opacity="0.14" stroke="${iconColor}" stroke-opacity="0.3">${breathe}</rect>` +
      iconGroup(opts.icon, iconColor, io, io, CARD.icon, 2)
    : ''
  const valueFont = `font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f1ece8"`
  const roll = (fromY: number, toY: number, fromO: number, toO: number) =>
    `<animateTransform attributeName="transform" type="translate" from="0 ${fromY}" to="0 ${toY}" dur="${CARD_ROLL_S}s" fill="freeze" ${spline}/>` +
    `<animate attributeName="opacity" from="${fromO}" to="${toO}" dur="${CARD_ROLL_S}s" fill="freeze" ${spline}/>`
  const valueLine = odo
    ? odo.markup
    : opts.changed && opts.from !== undefined && opts.from !== value
      ? `<g opacity="0">${roll(0, -lineH, 1, 0)}<text x="${textX}" y="40" ${valueFont}>${esc(opts.from)}</text></g>` +
        `<g>${roll(lineH, 0, 0, 1)}<text x="${textX}" y="40" ${valueFont}>${esc(value)}</text></g>`
      : `<text x="${textX}" y="40" ${valueFont}>${esc(value)}</text>`
  // The value lives in a window one line tall, so rolling numerals slide in and out of sight.
  const clipId = `cv${label.replace(/[^A-Za-z0-9]/g, '')}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<defs><clipPath id="${clipId}"><rect x="${textX - 2}" y="25" width="${width - textX}" height="${lineH - 1}"/></clipPath></defs>` +
    panelSvg('cardg', width, height, 12, border) +
    // The halftone gathers in the top-right corner and starts past the label, so no dot sits on text.
    halftone(Math.max(Math.round(width * 0.45), Math.ceil(textX + labelWidth(label, 11.5) + 6)), 6, width - 7, 27, { color: iconColor, opacity: 0.22 }) +
    tile +
    `<text x="${textX}" y="21" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11.5" fill="#9a938f">${esc(label)}</text>` +
    `<g clip-path="url(#${clipId})">${valueLine}</g>` +
    `</svg>`
  return { svg, width, height }
}

/** A stat on the compact band: one line at a text row's height, glyph then value then label. */
export const STAT = { height: 32, glyph: 28, icon: 18, gap: 8, fs: 13.5, labelFs: 11.5, lineH: 18, baseline: 21, stackTop: 15, subFs: 10.5, subLine: 12.5 }

/**
 * One stat of the compact band as SVG: a 28px glyph (a ring passed in as `ring`, else a tinted
 * tile holding `icon`), the value in bold, then its label and an optional detail, dimmer still.
 * Every stat shares the glyph slot, size and baseline, so a row of them reads as one line, and
 * `width` pads each to its column, so two rows line up. The label follows the value as the
 * renderer sets it (an invisible copy of the value holds its place), never a guessed width.
 * When `changed`, the old value rolls up and out as in `cardSvg`; with `clock`, the value is
 * the odometer; with `live`, the tile breathes.
 */
export const statSvg = (
  value: string,
  label: string,
  opts: {
    detail?: string
    ring?: string
    icon?: IconName
    color?: string
    width?: number
    changed?: boolean
    from?: string
    ago?: number
    live?: { now: number }
    clock?: { elapsedMs: number }
    /**
     * Stacked: the value and label on the first line and these lines, smaller, under it
     * (in place of `detail` after the label), so a cell is narrower and keeps every detail.
     */
    stack?: string[]
  } = {},
) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const S = STAT
  const color = opts.color ?? '#8f8985'
  const under = opts.stack ?? []
  const stacked = opts.stack !== undefined
  // A stacked cell grows a line (STAT.subLine) for each line under the value.
  const height = stacked ? Math.max(S.height, Math.ceil(S.stackTop + 4 + S.subLine * under.length)) : S.height
  const g0 = (height - S.glyph) / 2
  const x = S.glyph + S.gap
  const y = stacked ? S.stackTop : S.baseline
  const ease = '0.45 0 0.55 1'
  const breathe = opts.live
    ? `<animate attributeName="fill-opacity" values="0.14;0.3;0.14" keyTimes="0;0.5;1" calcMode="spline" keySplines="${ease};${ease}" dur="${CARD_BREATHE_MS / 1000}s" begin="${phaseBegin(opts.live.now, CARD_BREATHE_MS)}" repeatCount="indefinite"/>`
    : ''
  const io = g0 + (S.glyph - S.icon) / 2
  const glyph = opts.ring
    ? `<g transform="translate(0 ${g0})">${opts.ring}</g>`
    : opts.icon
      ? `<rect x="0.5" y="${g0 + 0.5}" width="${S.glyph - 1}" height="${S.glyph - 1}" rx="7" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.32">${breathe}</rect>` +
        // Across, the icon centres in the tile alone; down, past the row's top margin too.
        iconGroup(opts.icon, color, (S.glyph - S.icon) / 2, io, S.icon, 2)
      : ''
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueFont = `${font} font-size="${S.fs}" font-weight="700" fill="#f1ece8"`
  const odo = opts.clock ? clockOdometer(opts.clock.elapsedMs, x, y, S.fs, S.lineH) : null
  // The odometer sets its own digit widths; the invisible copy is stretched to match.
  const holder = odo
    ? `<tspan ${valueFont.replace('fill="#f1ece8"', 'fill-opacity="0"')} textLength="${odo.width}" lengthAdjust="spacingAndGlyphs">${esc(value)}</tspan>`
    : `<tspan font-size="${S.fs}" font-weight="700" fill-opacity="0">${esc(value)}</tspan>`
  const tail =
    `<text x="${x}" y="${y}" ${font} font-size="${S.labelFs}" fill="#9a938f">${holder}` +
    (label ? `<tspan dx="5">${esc(label)}</tspan>` : '') +
    (opts.detail && !stacked ? `<tspan fill="#756e6a"> · ${esc(opts.detail)}</tspan>` : '') +
    `</text>` +
    under
      .map((line, i) => `<text x="${x}" y="${(y + S.subLine * (i + 1)).toFixed(1)}" ${font} font-size="${S.subFs}" fill="#857e7a">${esc(line)}</text>`)
      .join('')
  const spline = `calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" begin="${sinceBegin(opts.ago)}"`
  const roll = (fromY: number, toY: number, fromO: number, toO: number) =>
    `<animateTransform attributeName="transform" type="translate" from="0 ${fromY}" to="0 ${toY}" dur="${CARD_ROLL_S}s" fill="freeze" ${spline}/>` +
    `<animate attributeName="opacity" from="${fromO}" to="${toO}" dur="${CARD_ROLL_S}s" fill="freeze" ${spline}/>`
  const valueLine = odo
    ? odo.markup
    : opts.changed && opts.from !== undefined && opts.from !== value
      ? `<g opacity="0">${roll(0, -S.lineH, 1, 0)}<text x="${x}" y="${y}" ${valueFont}>${esc(opts.from)}</text></g>` +
        `<g>${roll(S.lineH, 0, 0, 1)}<text x="${x}" y="${y}" ${valueFont}>${esc(value)}</text></g>`
      : `<text x="${x}" y="${y}" ${valueFont}>${esc(value)}</text>`
  // Sized generously, so the label always fits; `width` only ever widens it to the column.
  // The last 12px are for a face wider than the estimate (bold values run wide), which would
  // otherwise clip the label.
  const valueW = odo ? odo.width : labelWidth(value, S.fs)
  const natural = Math.ceil(
    x +
      (stacked
        ? Math.max(valueW + (label ? 5 + labelWidth(label, S.labelFs) : 0), ...under.map(l => labelWidth(l, S.subFs)))
        : valueW + 5 + labelWidth(label + (opts.detail ? ` · ${opts.detail}` : ''), S.labelFs)) +
      12,
  )
  const width = Math.max(natural, opts.width ?? 0)
  // Rolling numerals stay in a window one line tall: the value slides in and out of sight.
  const clipId = `sv${label.replace(/[^A-Za-z0-9]/g, '')}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<defs><clipPath id="${clipId}"><rect x="${x - 2}" y="${y - S.fs - 1}" width="${width - x + 2}" height="${S.lineH + 1}"/></clipPath></defs>` +
    glyph +
    tail +
    `<g clip-path="url(#${clipId})">${valueLine}</g>` +
    `</svg>`
  return { svg, width, height, natural }
}

/** A chip on the compact band's top line: the stats' tile look at a smaller size. */
export const CHIP_LINE = { height: 24, fs: 12.5, labelFs: 11.5, icon: 14, lead: 7, baseline: 16.5 }

/**
 * A chip for the compact band's top line (status, tool count, version), drawn in the same
 * language as the stats beneath it: a tile tinted `color` with a thin edge of it, a glyph (an
 * icon, or with `dots` three dots that light in turn), a bold `value` and a dim `label`.
 * With `strong`, a chip without a value shows its label bold in `color` (the status word).
 * The label follows the value as the renderer sets it (an invisible copy holds its place).
 * When `changed`, the old value rolls up and out; `minWidth` holds the chip as wide as
 * another state's, so what follows it never shifts.
 */
export const chipSvg = (opts: {
  color: string
  label: string
  value?: string
  icon?: IconName
  dots?: boolean
  /** The dots stand still (where the surface turns a spinner of its own beside them). */
  still?: boolean
  strong?: boolean
  now?: number
  minWidth?: number
  changed?: boolean
  from?: string
  ago?: number
}) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const C = CHIP_LINE
  const h = C.height
  const glyphW = opts.dots ? 16 : opts.icon ? C.icon : 0
  const x = C.lead + glyphW + (glyphW ? 6 : 0)
  const y = C.baseline
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueFont = `${font} font-size="${C.fs}" font-weight="700" fill="#f1ece8"`
  const ease = 'calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"'
  const glyph = opts.dots
    ? [0, 1, 2]
        .map(
          i =>
            `<circle cx="${C.lead + 2.5 + i * 5.5}" cy="${h / 2}" r="2.1" fill="${opts.color}" opacity="${opts.still ? 0.3 + i * 0.35 : 0.3}">` +
            (opts.still
              ? ''
              : `<animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" begin="${phaseBegin((opts.now ?? 0) - i * 180, 1200)}" repeatCount="indefinite" ${ease}/>`) +
            `</circle>`,
        )
        .join('')
    : opts.icon
      ? iconGroup(opts.icon, opts.color, C.lead, (h - C.icon) / 2, C.icon, 2.2)
      : ''
  const holder = opts.value ? `<tspan font-size="${C.fs}" font-weight="700" fill-opacity="0">${esc(opts.value)}</tspan>` : ''
  const labelStyle = opts.strong && !opts.value ? `font-weight="700" fill="${opts.color}"` : 'fill="#9a938f"'
  const tail =
    `<text x="${x}" y="${y}" ${font} font-size="${opts.strong && !opts.value ? C.fs : C.labelFs}">${holder}` +
    `<tspan ${labelStyle}${opts.value ? ' dx="5"' : ''}>${esc(opts.label)}</tspan></text>`
  const spline = `dur="${CARD_ROLL_S}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" begin="${sinceBegin(opts.ago)}"`
  const roll = (y0: number, y1: number, o0: number, o1: number) =>
    `<animateTransform attributeName="transform" type="translate" from="0 ${y0}" to="0 ${y1}" ${spline}/>` +
    `<animate attributeName="opacity" from="${o0}" to="${o1}" ${spline}/>`
  const valueAt = (v: string) => `<text x="${x}" y="${y}" ${valueFont}>${esc(v)}</text>`
  const value = !opts.value
    ? ''
    : opts.changed && opts.from !== undefined && opts.from !== opts.value
      ? `<g opacity="0">${roll(0, -14, 1, 0)}${valueAt(opts.from)}</g><g>${roll(14, 0, 0, 1)}${valueAt(opts.value)}</g>`
      : valueAt(opts.value)
  const flash = opts.changed
    ? `<animate attributeName="fill-opacity" from="0.4" to="0.14" dur="0.8s" fill="freeze" begin="${sinceBegin(opts.ago)}"/>`
    : ''
  // Sized generously (bold values run wide), so the label always fits.
  const natural = Math.ceil(
    x +
      (opts.value ? labelWidth(opts.value, C.fs) + 5 : 0) +
      labelWidth(opts.label, opts.strong && !opts.value ? C.fs : C.labelFs) +
      // A bold status word runs wider than the estimate: more room at the end for it.
      (opts.strong && !opts.value ? 16 : 10),
  )
  const width = Math.max(natural, opts.minWidth ?? 0)
  const clipId = `ch${opts.label.replace(/[^A-Za-z0-9]/g, '')}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    `<defs><clipPath id="${clipId}"><rect x="0" y="3" width="${width}" height="${h - 6}"/></clipPath></defs>` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${h - 1}" rx="7" fill="${opts.color}" fill-opacity="0.14" stroke="${opts.color}" stroke-opacity="0.32">${flash}</rect>` +
    glyph +
    tail +
    `<g clip-path="url(#${clipId})">${value}</g>` +
    `</svg>`
  return { svg, width, height: h, natural }
}

/**
 * The tool-call counter as a labelled capsule: bolt, the number, and the word it counts.
 * A growing count makes the capsule flash once and, given `from`, rolls the old number up
 * and out as the new one comes in from below. The hover title shows only where the surface
 * draws the Svg as a frame.
 */
export const countSvg = (count: number, opts: { changed?: boolean; label?: string; from?: number; ago?: number; minWidth?: number } = {}) => {
  const height = 24
  const word = opts.label ?? (count === 1 ? 'tool' : 'tools')
  const num = String(count)
  const fs = 12.5
  const digitsW = (n: string) => Math.round(n.length * fs * 0.62)
  const numW = digitsW(num)
  const wordW = Math.round(word.length * 11 * 0.56)
  const numX = 28
  const wordX = numX + numW + 5
  // `minWidth` keeps room for more digits, so a growing count never shifts what follows it.
  const width = Math.max(opts.minWidth ?? 0, wordX + wordW + 11)
  const bg = '#33301f'
  const begin = `begin="${sinceBegin(opts.ago)}"`
  const spline = `dur="${CARD_ROLL_S}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" ${begin}`
  const flash = opts.changed ? `<animate attributeName="fill" from="#6b5a22" to="${bg}" dur="0.8s" fill="freeze" ${begin}/>` : ''
  const numAt = (n: string) =>
    `<text x="${numX}" y="16.3" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f6e3a1" textLength="${digitsW(n)}" lengthAdjust="spacingAndGlyphs">${n}</text>`
  const roll = (y0: number, y1: number, o0: number, o1: number) =>
    `<animateTransform attributeName="transform" type="translate" from="0 ${y0}" to="0 ${y1}" ${spline}/>` +
    `<animate attributeName="opacity" from="${o0}" to="${o1}" ${spline}/>`
  const number =
    opts.changed && opts.from !== undefined && opts.from !== count
      ? `<defs><clipPath id="cnum"><rect x="${numX - 1}" y="4" width="${Math.max(numW, digitsW(String(opts.from))) + 2}" height="16"/></clipPath></defs>` +
        `<g clip-path="url(#cnum)">` +
        `<g opacity="0">${roll(0, -14, 1, 0)}${numAt(String(opts.from))}</g>` +
        `<g>${roll(14, 0, 0, 1)}${numAt(num)}</g></g>`
      : numAt(num)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<title>Tool calls this turn</title>` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}">${flash}</rect>` +
    iconGroup('bolt', '#ffd166', 9, 5.5, 13, 2.4) +
    number +
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

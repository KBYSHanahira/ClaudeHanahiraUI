// Pure helpers for the transcript: no engine calls here, so tests run them as is.

import { hasIcon, iconGroup } from './icons'
import type { IconName } from './icons'

export type Kind = 'read' | 'edit' | 'write' | 'delete' | 'run' | 'search' | 'agent' | 'web' | 'plan' | 'other'

export const KIND_COLOR: Record<Kind, string> = {
  read: '#7cb7ff',
  edit: '#ffb86b',
  write: '#ff7ab6',
  delete: '#f2736b',
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
  delete: '✕',
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
  delete: 'trash',
  run: 'terminal',
  search: 'search',
  agent: 'bot',
  web: 'globe',
  plan: 'checklist',
  other: 'cube',
}

/**
 * The transcript row's measures, in px: the kind tile's picture (the tile itself is 25 of its
 * 32 units), and the status pill's height.
 */
export const ROW = { tile: 32, pill: 22 }

/** `rm`, `git rm`, `unlink`, `rmdir` at the head of a command, after an optional sudo. */
const DELETE_CMD = /^\s*(?:sudo\s+)?(?:git\s+rm|rm|unlink|rmdir)\s+/

/** The paths a delete command names: its words after the command, less the flags. */
const deleted = (command: string) =>
  command
    .replace(DELETE_CMD, '')
    .split(/[;&|\n]/)[0]!
    .split(/\s+/)
    // After `--` every word is a path, even one that starts with a dash.
    .filter((w, i, ws) => w && w !== '--' && (!w.startsWith('-') || ws.slice(0, i).includes('--')))
    .map(base)
    .join(' ')

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
/** At most n characters, the last an ellipsis when cut. Counts whole characters, so an emoji or
 *  a Thai vowel mark is never split from its base. */
export const clip = (s: string, n: number) => {
  if (n <= 0) return ''
  const chars = Array.from(graphemes.segment(s), g => g.segment)
  return chars.length > n ? `${chars.slice(0, n - 1).join('')}…` : s
}
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
      // Removing files is a change to the code as much as an edit: it reads as one.
      if (DELETE_CMD.test(str(i.command)))
        return {
          kind: 'delete' as Kind,
          verb: 'Delete',
          target: clip(str(i.description) || deleted(str(i.command)), 64),
        }
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
    return { text: n === null ? 'read' : n === 1 ? '1 line' : `${n} lines`, icon: 'check', ...PILL.ok }
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

/**
 * A tool row's kind tile: a rounded square tinted in the kind's colour, its icon in the middle,
 * the same tile the band's cards carry. A running tile's edge is dimmer.
 */
export const badgeSvg = (color: string, icon: string, size: number, running = false) => {
  const g = icon.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fs = icon.length > 1 ? 12 : 14
  const mark = hasIcon(icon)
    ? iconGroup(icon, color, 8, 8, 16, 2.1)
    : `<text x="16" y="${icon.length > 1 ? 20.5 : 21}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="${fs}" font-weight="700" fill="${color}">${g}</text>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    `<rect x="3.5" y="3.5" width="25" height="25" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="${running ? 0.2 : 0.4}" stroke-width="1.5"/>` +
    mark +
    `</svg>`
  )
}

/** One line of a diff card; `@` is the gap between two hunks, the lines the patch skipped. */
export type DiffRow = { n: number | null; sign: '+' | '-' | ' ' | '@'; text: string }

/**
 * Rows of a unified patch, numbered like an editor: new-file lines, old lines for removals.
 * Between two hunks, a gap row, so a jump in the numbers never reads as adjacent lines.
 */
export const diffRows = (hunks: unknown, fallback?: string, max = 14) => {
  const rows: DiffRow[] = []
  if (Array.isArray(hunks) && hunks.length > 0) {
    for (const [k, h] of (hunks as { oldStart: number; newStart: number; lines: string[] }[]).entries()) {
      if (k > 0) rows.push({ n: null, sign: '@', text: '' })
      let oldLine = h.oldStart
      let newLine = h.newStart
      for (const line of h.lines ?? []) {
        // `\ No newline at end of file` notes the line before it; it is no line of the file.
        if (line[0] === '\\') continue
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
    // A file's last newline ends its last line; it starts no line of its own.
    fallback.replace(/\n$/, '').split('\n').forEach((text, i) => rows.push({ n: i + 1, sign: '+', text }))
  }
  const shown = rows.slice(0, max)
  // A gap with nothing shown after it says nothing: the "more" note covers what follows.
  if (shown.length < rows.length && shown[shown.length - 1]?.sign === '@') shown.pop()
  // `more` counts the file's lines left out, not the gap rows between hunks.
  const more = rows.slice(shown.length).filter(r => r.sign !== '@').length
  // Counted over every row, so the header's "added" and "removed" do not stop at the rows shown.
  return { rows: shown, more, ...countChanges(rows) }
}

/**
 * What an Edit or Write call changed, from its result: the diff card's rows and the counts.
 * Null for any other tool; no rows for a result with no patch (an error's text, a no-op).
 */
export const fileChange = (tool: string, output: unknown) => {
  const name = short(tool)
  if (name !== 'Edit' && name !== 'Write') return null
  const out = (output !== null && typeof output === 'object' ? output : {}) as { structuredPatch?: unknown; content?: unknown; type?: unknown }
  return diffRows(out.structuredPatch, out.type === 'create' && typeof out.content === 'string' ? out.content : undefined)
}

/** A background task's kind, from its notification: a shell command runs, anything else is an agent. */
export const taskKind = (type: string | undefined): Kind => (/bash|shell|command|monitor/i.test(type ?? '') ? 'run' : 'agent')

/**
 * What a notification row says, from its summary: the first line, less what the row already
 * says, the verb in front (`Agent`) and the ending behind (`completed`, which the pill shows),
 * and the quotes round a name left on its own.
 */
export const taskSummary = (text: string, verb: string) => {
  let s = (text.split('\n').find(l => l.trim()) ?? '').trim()
  if (s.toLowerCase().startsWith(`${verb.toLowerCase()} `)) s = s.slice(verb.length + 1).trim()
  s = s.replace(/\s+(?:has\s+|was\s+)?(?:completed|finished|failed|stopped|killed|cancell?ed|done)\.?$/i, '').trim()
  const quoted = /^"([^"]+)"$/.exec(s)
  return quoted ? quoted[1]! : s
}

/** A background task's ending as a pill: done, failed or stopped; a status not known reads as itself. */
export const taskPill = (status: string | undefined): Pill => {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed' || s === 'done' || s === 'success') return { text: 'done', icon: 'check', ...PILL.ok }
  if (s === 'failed' || s === 'error') return { text: 'failed', icon: 'cross', ...PILL.bad }
  if (s === 'killed' || s === 'stopped' || s === 'cancelled' || s === 'canceled') return { text: 'stopped', icon: 'ban', ...PILL.warn }
  return { text: s || 'update', ...PILL.busy }
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

/** The band's text and line colours: ink for values, label and detail for words (each at least 4.5:1 on the band), quiet for lines and muted icons. */
export const INK = { value: '#f1ece8', label: '#a39b96', detail: '#8f8782', line: '#3a3634', track: '#332f2d' }

/**
 * The band's motion, on two rules so a redraw never blinks or starts a motion over (the reason
 * v1.8.0 took motion out):
 * - Loops (the bar's lights, the working dots, the status dot's halo) are SMIL with no time in
 *   them: while the state holds, every redraw draws the same picture and the surface keeps the
 *   one it has, so the loop runs on. Their first frame is the still picture, so a surface that
 *   starts one over, or plays no SMIL, shows no jump.
 * - A figure that changes glides to its new value (`glider`): a few still pictures, eased, then
 *   the exact value. No SMIL in them, so swapping one in is only a new image.
 */
export const MOTION = {
  barMs: 2200, // one light's step to where the next one was
  barPeriod: 280, // px between two lights
  barGlow: 150, // px wide each light
  glowInk: '#ded8ff',
  dotsMs: 1200, // the working dots' wave
  haloMs: 2400, // the status dot's breath
  glideMs: 480, // a figure moving to its new value
  glideStepMs: 100, // a redraw this often while one moves: the engine's most, ten a second
}

/** A looping SMIL `<animate>` over `values`, eased between each, starting from the first. */
export const loopAnim = (attr: string, values: (number | string)[], ms: number) =>
  `<animate attributeName="${attr}" values="${values.join(';')}" dur="${ms}ms" repeatCount="indefinite" ` +
  `calcMode="spline" keySplines="${Array(values.length - 1).fill('0.45 0 0.55 1').join(';')}"/>`

/** Ease out: quick away from the old value, settling softly on the new one. */
export const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

type Glide = { from: number; to: number; at: number }

/**
 * Figures that glide to a new value instead of jumping. `value(key, target, now)` gives what
 * to draw: the target itself when first seen or once a glide ends, else an eased step between
 * where it was and the target (rounded by `round` while it moves). A new target mid-glide
 * starts from where the figure is, so it never jumps back. `active(now)` says whether any
 * figure is still moving, so the caller knows to draw again.
 */
export const glider = (ms = MOTION.glideMs) => {
  const glides = new Map<string, Glide>()
  const at = (g: Glide, now: number) => (now - g.at >= ms ? g.to : g.from + (g.to - g.from) * easeOut((now - g.at) / ms))
  return {
    value(key: string, target: number | null, now: number, round: (v: number) => number = Math.round): number | null {
      if (target === null || !Number.isFinite(target)) {
        glides.delete(key)
        return target
      }
      const g = glides.get(key)
      if (!g) {
        glides.set(key, { from: target, to: target, at: now - ms })
        return target
      }
      if (g.to !== target) glides.set(key, { from: at(g, now), to: target, at: now })
      const next = glides.get(key)!
      return now - next.at >= ms ? target : round(at(next, now))
    },
    active: (now: number) => [...glides.values()].some(g => now - g.at < ms && g.from !== g.to),
  }
}

/**
 * A panel's background: gradient fill, hairline edge, a one-pixel highlight along the top.
 * `id` keeps the gradient's name unique where several panels share one document.
 */
export const panelSvg = (id: string, width: number, height: number, rx = 12) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PANEL.top}"/><stop offset="1" stop-color="${PANEL.bottom}"/></linearGradient></defs>` +
  `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${rx}" fill="url(#${id})"/>` +
  `<path d="M${rx + 2} 1.5H${width - rx - 2}" stroke="${PANEL.glow}" stroke-opacity="0.05" stroke-width="1"/>` +
  `<rect x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}" rx="${rx}" fill="none" stroke="${PANEL.edge}" stroke-width="1.5"/>`

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

/** A speedometer as SVG: a 270° track open at the bottom, an arc filled to `fraction`, and a needle. */
export const speedoSvg = (fraction: number, color: string, size: number) => {
  const f = Math.max(0, Math.min(1, fraction))
  const r = 17
  const c = 2 * Math.PI * r
  const sweep = 0.75 * c
  const dash = (v: number) => `${(v * sweep).toFixed(2)} ${c.toFixed(2)}`
  const arc =
    f > 0
      ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash(f)}" transform="rotate(135 22 22)"/>`
      : ''
  const needle =
    `<g transform="rotate(${(-135 + f * 270).toFixed(1)} 22 22)">` +
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
      if (ch === '−') return w + fs * 0.66
      if (ch.charCodeAt(0) > 0x2000) return w + fs * 1.0
      if (/[A-Z0-9mwMW%…]/.test(ch)) return w + fs * 0.66
      return w + fs * 0.56
    }, 0),
  )

/**
 * A capsule badge: fully rounded, tinted fill, bold label. `textLength` pins the
 * label to the width measured here, so the capsule fits whatever font draws it.
 */
export const pillSvg = (
  text: string,
  fg: string,
  bg: string,
  height = 24,
  running = false,
  icon?: PillIcon,
  minWidth = 0,
) => {
  const fs = +(height * 0.52).toFixed(1)
  const tl = labelWidth(text, fs)
  const dotR = +(height * 0.11).toFixed(2)
  const gap = +(height * 0.3).toFixed(2)
  const lead = running ? Math.round(2 * gap + 2 * dotR + height * 0.3) : icon ? Math.round(height * 0.62) : 0 // room for the dots or the icon
  // `minWidth` holds a pill as wide as another state's, so what follows it never shifts.
  const width = Math.max(minWidth, tl + lead + Math.round(height * 0.95))
  const t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const tx = (width + lead) / 2
  // Three dots, dim to bright: a running pill.
  const dots = running
    ? [0, 1, 2]
        .map(i => `<circle cx="${(height * 0.5 + i * gap).toFixed(2)}" cy="${height / 2}" r="${dotR}" fill="${fg}" opacity="${(0.3 + i * 0.35).toFixed(2)}"/>`)
        .join('')
    : ''
  const iconSize = height * 0.46
  const iconX = height * 0.42
  const glyph = icon ? iconGroup(icon, fg, iconX, (height - iconSize) / 2, iconSize, 3) : ''
  const ty = (height / 2 + fs * 0.35).toFixed(1)
  const label = `<text x="${tx}" y="${ty}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="${fg}" textLength="${tl}" lengthAdjust="spacingAndGlyphs">${t}</text>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}"/>` +
    dots +
    glyph +
    label +
    `</svg>`
  return { svg, width, height }
}

/**
 * A loading bar with no number behind it: a dark rounded track sprinkled with faint
 * dots and, while `live`, a dithered field of violet dots lit across it. Idle, it is just
 * the quiet track. `padBottom` adds transparent room under the bar, in px.
 *
 * Drawn wider than its slot, it keeps its height and is cut at the right (`slice`): with the
 * default `meet`, a surface that narrows the box shrinks the whole bar to a hairline.
 * With `open`, the right end is left square for that cut, and `barCapSvg` drawn after the
 * slot rounds it off: a bar that fits a slot of any width with both ends round.
 *
 * With `motion` (and `live`), soft lights glide left to right under the dots, one every
 * MOTION.barPeriod px, so a slot of any width shows one. A loop (see MOTION): its first frame
 * is the still picture, and nothing in it depends on time, so a redraw sends the same picture.
 */
export const loadingSvg = (
  width: number,
  height: number,
  color: string,
  opts: { live?: boolean; padBottom?: number; open?: boolean; motion?: boolean } = {},
) => {
  const w = Math.max(120, Math.round(width))
  const h = height
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  // The track: a capsule, or with `open` one rounded at the left alone.
  const r = h / 2
  const track = opts.open ? `<path d="M${r} 0H${w}V${h}H${r}A${r} ${r} 0 0 1 ${r} 0z"` : `<rect width="${w}" height="${h}" rx="${r}"`
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

  // The lights: a row of glows moved one period on per loop, cut to the lit dots alone. The
  // track under them keeps one colour to its end, so the cap drawn after the slot (which the
  // lights cannot reach) still matches it, and the right end stays round as a light passes.
  const P = MOTION.barPeriod
  const glows: string[] = []
  for (let gx = -P; gx < w; gx += P) glows.push(`<rect x="${gx}" width="${MOTION.barGlow}" height="${h}" fill="url(#bar-glow)"/>`)
  const glide =
    opts.live && opts.motion
      ? `<defs><linearGradient id="bar-glow" x1="0" x2="1">` +
        `<stop offset="0" stop-color="${MOTION.glowInk}" stop-opacity="0"/>` +
        `<stop offset="0.5" stop-color="${MOTION.glowInk}" stop-opacity="0.9"/>` +
        `<stop offset="1" stop-color="${MOTION.glowInk}" stop-opacity="0"/>` +
        `</linearGradient><clipPath id="bar-cut"><path d="${bright.join('')}${dim.join('')}"/></clipPath></defs>` +
        `<g clip-path="url(#bar-cut)"><g>${glows.join('')}` +
        `<animateTransform attributeName="transform" type="translate" from="0 0" to="${P} 0" dur="${MOTION.barMs}ms" repeatCount="indefinite"/>` +
        `</g></g>`
      : ''

  const lit = opts.live
    ? `${track} fill="${color}" fill-opacity="0.2"/>` +
      `<path d="${bright.join('')}" fill="${color}" fill-opacity="0.95"/>` +
      `<path d="${dim.join('')}" fill="${color}" fill-opacity="0.55"/>` +
      glide
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + pad}" width="${w}" height="${h + pad}" preserveAspectRatio="xMinYMid slice">` +
    `${track} fill="${INK.track}"/>` +
    `<path d="${dim.join('')}" fill="${color}" fill-opacity="0.12"/>` +
    `<path d="${faint.join('')}" fill="#8a8480" fill-opacity="0.3"/>` +
    lit +
    `</svg>`
  )
}

/** The context meter's blocks: how many across, each one's size, and the gap between them. */
export const METER = { segs: 30, w: 6, h: 12, gap: 2 }

/**
 * A segmented meter as SVG: METER.segs blocks across, the first `percent` of them lit in
 * `color`, the rest the track. Drawn crisp, no anti-aliasing: the same language as the agent
 * sprites. Any use at all lights the first block, so a session that has begun never reads as empty.
 */
export const meterSvg = (percent: number | null, color: string) => {
  const M = METER
  const pitch = M.w + M.gap
  const width = M.segs * pitch - M.gap
  const height = M.h
  const share = percent === null ? 0 : Math.max(0, Math.min(100, percent)) / 100
  const litN = share > 0 ? Math.max(1, Math.round(share * M.segs)) : 0
  const blocks = (from: number, to: number) =>
    Array.from({ length: to - from }, (_, k) => `M${(from + k) * pitch} 0h${M.w}v${M.h}h-${M.w}z`).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">` +
    (litN < M.segs ? `<path d="${blocks(litN, M.segs)}" fill="${INK.track}"/>` : '') +
    (litN > 0 ? `<path d="${blocks(0, litN)}" fill="${color}"/>` : '') +
    `</svg>`
  return { svg, width, height }
}

/** The hero line's measures: its height, the figure's size, the words' size, the icon, the gaps. */
export const CONTEXT = { height: 36, fs: 20, labelFs: 11.5, icon: 18, gap: 10, afterValue: 16, baseline: 24, meterGap: 6 }

/**
 * The band's hero line, as one picture: the context figure at CONTEXT.fs, the meter beside it,
 * then its name and what is left (the window's size as detail). With `stack`, the meter goes
 * on a line of its own under the figure, for a band too narrow for one line. The figure turns
 * the meter's colour when `warn` (near the limit); otherwise it is ink and the meter alone
 * carries the colour. `width` pads the picture to a column.
 */
export const contextSvg = (
  percent: number | null,
  color: string,
  opts: {
    left?: string | null
    window?: string | null
    stack?: boolean
    width?: number
    warn?: boolean
  } = {},
) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const C = CONTEXT
  const meter = meterSvg(percent, color)
  const value = percent === null ? '—' : `${Math.round(percent)}%`
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueX = C.icon + 8
  const valueW = labelWidth(value, C.fs)
  const words =
    `<tspan fill="${INK.label}">context</tspan>` +
    (opts.left ? `<tspan fill="${INK.detail}"> · ${esc(opts.left)}</tspan>` : '') +
    (opts.window ? `<tspan fill="${INK.detail}"> · ${esc(opts.window)}</tspan>` : '')
  const wordsW = labelWidth(['context', opts.left, opts.window].filter(Boolean).join(' · '), C.labelFs)
  const y = C.baseline
  const meterY = opts.stack ? C.height + C.meterGap : (C.height - meter.height) / 2
  // The bold figure runs wider than the estimate: more room after it than between the rest.
  const meterX = opts.stack ? valueX : valueX + valueW + C.afterValue
  const wordsX = opts.stack ? valueX + valueW + C.afterValue : meterX + meter.width + C.gap
  const height = opts.stack ? C.height + C.meterGap + meter.height + 4 : C.height
  const natural = Math.ceil(Math.max(wordsX + wordsW + 12, opts.stack ? meterX + meter.width : 0))
  const width = Math.max(natural, opts.width ?? 0)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    iconGroup('chip', INK.detail, 0, (C.height - C.icon) / 2, C.icon, 2) +
    `<text x="${valueX}" y="${y}" ${font} font-size="${C.fs}" font-weight="700" fill="${opts.warn ? color : INK.value}">${esc(value)}</text>` +
    `<text x="${wordsX}" y="${y}" ${font} font-size="${C.labelFs}">${words}</text>` +
    `<g transform="translate(${meterX} ${meterY})">${meter.svg}</g>` +
    `</svg>`
  return { svg, width, height, natural }
}

/**
 * The right end of an `open` loading bar: a half disc in the track's colour, drawn after the slot
 * that cuts the bar. Pass the bar's `color` while it is live: the cap takes the same tint as the
 * lit track, or it reads as a square end against the background.
 */
export const barCapSvg = (height: number, padBottom = 0, color?: string) => {
  const r = height / 2
  const w = Math.ceil(r)
  const disc = `<path d="M0 0A${r} ${r} 0 0 1 0 ${height}z"`
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height + padBottom}" width="${w}" height="${height + padBottom}">` +
      `${disc} fill="${INK.track}"/>` +
      (color ? `${disc} fill="${color}" fill-opacity="0.2"/>` : '') +
      `</svg>`,
    width: w,
    height: height + padBottom,
  }
}

/** The little status dot of the band: a halo round it while Claude works. */
export const dotSvg = (color: string, live: boolean, size = 14, motion = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">` +
  (live
    ? `<circle cx="7" cy="7" r="5.8" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity="0.4"` +
      // With `motion` the halo breathes out and fades, and comes back (a loop: see MOTION).
      (motion
        ? `>${loopAnim('stroke-opacity', [0.4, 0.1, 0.4], MOTION.haloMs)}${loopAnim('r', [5.8, 6.25, 5.8], MOTION.haloMs)}</circle>`
        : '/>')
    : '') +
  `<circle cx="7" cy="7" r="4" fill="${color}"/>` +
  `</svg>`

/** Card geometry: the icon tile on the left, label over value beside it. */
export const CARD = { height: 52, tile: 36, icon: 22, textX: 54, pad: 16 }

/** A stat card as SVG: a tinted icon tile on the left, the label over the value beside it. */
export const cardSvg = (label: string, value: string, opts: { icon?: IconName; iconColor?: string } = {}) => {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const iconColor = opts.iconColor ?? '#8f8985'
  const textX = opts.icon ? CARD.textX : 14
  const fs = 17
  const textW = Math.max(labelWidth(value, fs), labelWidth(label, 11.5))
  const width = Math.max(opts.icon ? 120 : 96, textX + textW + CARD.pad)
  const height = CARD.height
  const t = (height - CARD.tile) / 2
  const io = t + (CARD.tile - CARD.icon) / 2
  const tile = opts.icon
    ? `<rect x="${t}" y="${t}" width="${CARD.tile}" height="${CARD.tile}" rx="10" fill="${iconColor}" fill-opacity="0.14" stroke="${iconColor}" stroke-opacity="0.3"/>` +
      iconGroup(opts.icon, iconColor, io, io, CARD.icon, 2)
    : ''
  const valueFont = `font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f1ece8"`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    panelSvg('cardg', width, height, 12) +
    // The halftone gathers in the top-right corner and starts past the label, so no dot sits on text.
    halftone(Math.max(Math.round(width * 0.45), Math.ceil(textX + labelWidth(label, 11.5) + 6)), 6, width - 7, 27, { color: iconColor, opacity: 0.22 }) +
    tile +
    `<text x="${textX}" y="21" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11.5" fill="#a39b96">${esc(label)}</text>` +
    `<text x="${textX}" y="40" ${valueFont}>${esc(value)}</text>` +
    `</svg>`
  return { svg, width, height }
}

/** A stat on the compact band: one line at a text row's height, glyph then value then label. */
export const STAT = { height: 32, glyph: 28, icon: 18, plainIcon: 17, gap: 8, fs: 13.5, labelFs: 11.5, lineH: 18, baseline: 21, stackTop: 15, subFs: 10.5, subLine: 12.5 }

/**
 * One stat of the compact band as SVG: a 28px glyph (a ring passed in as `ring`, else a tinted
 * tile holding `icon`), the value in bold, then its label and an optional detail, dimmer still.
 * Every stat shares the glyph slot, size and baseline, so a row of them reads as one line, and
 * `width` pads each to its column, so two rows line up. The label follows the value as the
 * renderer sets it (an invisible copy of the value holds its place), never a guessed width.
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
    /**
     * Stacked: the value and label on the first line and these lines, smaller, under it
     * (in place of `detail` after the label), so a cell is narrower and keeps every detail.
     */
    stack?: string[]
    /** The icon alone, no tile, centred in the glyph slot: the quiet look of a figure. */
    plain?: boolean
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
  const io = g0 + (S.glyph - S.icon) / 2
  const glyph = opts.ring
    ? `<g transform="translate(0 ${g0})">${opts.ring}</g>`
    : opts.icon && opts.plain
      ? iconGroup(opts.icon, color, (S.glyph - S.plainIcon) / 2, g0 + (S.glyph - S.plainIcon) / 2, S.plainIcon, 2)
    : opts.icon
      ? `<rect x="0.5" y="${g0 + 0.5}" width="${S.glyph - 1}" height="${S.glyph - 1}" rx="7" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.32"/>` +
        // Across, the icon centres in the tile alone; down, past the row's top margin too.
        iconGroup(opts.icon, color, (S.glyph - S.icon) / 2, io, S.icon, 2)
      : ''
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueFont = `${font} font-size="${S.fs}" font-weight="700" fill="#f1ece8"`
  // An invisible copy of the value holds its place, so the label follows it as the renderer sets it.
  const holder = `<tspan font-size="${S.fs}" font-weight="700" fill-opacity="0">${esc(value)}</tspan>`
  const tail =
    `<text x="${x}" y="${y}" ${font} font-size="${S.labelFs}" fill="#a39b96">${holder}` +
    (label ? `<tspan dx="5">${esc(label)}</tspan>` : '') +
    (opts.detail && !stacked ? `<tspan fill="#8f8782"> · ${esc(opts.detail)}</tspan>` : '') +
    `</text>` +
    under
      .map((line, i) => `<text x="${x}" y="${(y + S.subLine * (i + 1)).toFixed(1)}" ${font} font-size="${S.subFs}" fill="#8f8782">${esc(line)}</text>`)
      .join('')
  const valueLine = `<text x="${x}" y="${y}" ${valueFont}>${esc(value)}</text>`
  // Sized generously, so the label always fits; `width` only ever widens it to the column.
  // The last 12px are for a face wider than the estimate (bold values run wide), which would
  // otherwise clip the label.
  const valueW = labelWidth(value, S.fs)
  const natural = Math.ceil(
    x +
      (stacked
        ? Math.max(valueW + (label ? 5 + labelWidth(label, S.labelFs) : 0), ...under.map(l => labelWidth(l, S.subFs)))
        : valueW + 5 + labelWidth(label + (opts.detail ? ` · ${opts.detail}` : ''), S.labelFs)) +
      12,
  )
  const width = Math.max(natural, opts.width ?? 0)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    glyph +
    tail +
    valueLine +
    `</svg>`
  return { svg, width, height, natural }
}

/** A chip on the compact band's top line: the stats' tile look at a smaller size. */
export const CHIP_LINE = { height: 24, fs: 12.5, labelFs: 11.5, icon: 14, lead: 7, baseline: 16.5 }

/**
 * A chip for the compact band's top line (status, tool count, version), drawn in the same
 * language as the stats beneath it: a tile tinted `color` with a thin edge of it, a glyph (an
 * icon, or with `dots` three dots, dim to bright), a bold `value` and a dim `label`.
 * With `strong`, a chip without a value shows its label bold in `color` (the status word).
 * The label follows the value as the renderer sets it (an invisible copy holds its place).
 * `minWidth` holds the chip as wide as another state's, so what follows it never shifts.
 */
export const chipSvg = (opts: {
  color: string
  label: string
  value?: string
  icon?: IconName
  dots?: boolean
  strong?: boolean
  minWidth?: number
  /** Outlined in the band's line colour, no tint, muted glyph and words: a chip that is not state. */
  quiet?: boolean
  /** The dots light in a wave, left to right, from their still look (a loop: see MOTION). */
  motion?: boolean
}) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const C = CHIP_LINE
  const quiet = opts.quiet === true
  const glyphColor = quiet ? INK.detail : opts.color
  const restOpacity = quiet ? 0 : 0.14
  const h = C.height
  const glyphW = opts.dots ? 16 : opts.icon ? C.icon : 0
  const x = C.lead + glyphW + (glyphW ? 6 : 0)
  const y = C.baseline
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueFont = `${font} font-size="${C.fs}" font-weight="700" fill="#f1ece8"`
  // Still, the dots brighten left to right; moving, that brightness steps one dot on each third.
  const levels = [0, 1, 2].map(i => (0.3 + i * 0.35).toFixed(2))
  const glyph = opts.dots
    ? [0, 1, 2]
        .map(
          i =>
            `<circle cx="${C.lead + 2.5 + i * 5.5}" cy="${h / 2}" r="2.1" fill="${glyphColor}" opacity="${levels[i]}"` +
            (opts.motion ? `>${loopAnim('opacity', [0, 1, 2, 3].map(p => levels[(i - p + 3) % 3]!), MOTION.dotsMs)}</circle>` : '/>'),
        )
        .join('')
    : opts.icon
      ? iconGroup(opts.icon, glyphColor, C.lead, (h - C.icon) / 2, C.icon, 2.2)
      : ''
  const holder = opts.value ? `<tspan font-size="${C.fs}" font-weight="700" fill-opacity="0">${esc(opts.value)}</tspan>` : ''
  const labelStyle = opts.strong && !opts.value ? `font-weight="700" fill="${quiet ? INK.label : opts.color}"` : `fill="${INK.label}"`
  const tail =
    `<text x="${x}" y="${y}" ${font} font-size="${opts.strong && !opts.value ? C.fs : C.labelFs}">${holder}` +
    `<tspan ${labelStyle}${opts.value ? ' dx="5"' : ''}>${esc(opts.label)}</tspan></text>`
  const value = opts.value ? `<text x="${x}" y="${y}" ${valueFont}>${esc(opts.value)}</text>` : ''
  // Sized generously (bold values run wide), so the label always fits.
  const natural = Math.ceil(
    x +
      (opts.value ? labelWidth(opts.value, C.fs) + 5 : 0) +
      labelWidth(opts.label, opts.strong && !opts.value ? C.fs : C.labelFs) +
      // A bold status word runs wider than the estimate: more room at the end for it.
      (opts.strong && !opts.value ? 16 : 10),
  )
  const width = Math.max(natural, opts.minWidth ?? 0)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${h - 1}" rx="7" fill="${opts.color}" fill-opacity="${restOpacity}" stroke="${quiet ? INK.line : opts.color}" stroke-opacity="${quiet ? 1 : 0.32}"/>` +
    glyph +
    tail +
    value +
    `</svg>`
  return { svg, width, height: h, natural }
}

/**
 * The tool-call counter as a labelled capsule: bolt, the number, and the word it counts.
 * The hover title shows only where the surface draws the Svg as a frame.
 */
export const countSvg = (count: number, opts: { label?: string; minWidth?: number } = {}) => {
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
  const numAt = (n: string) =>
    `<text x="${numX}" y="16.3" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f6e3a1" textLength="${digitsW(n)}" lengthAdjust="spacingAndGlyphs">${n}</text>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<title>Tool calls this turn</title>` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}"/>` +
    iconGroup('bolt', '#ffd166', 9, 5.5, 13, 2.4) +
    numAt(num) +
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

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
/** A description that opens with the row's own verb drops it: `Run` + `Run the tests` would say it twice. */
const unsaid = (text: string, verbs: RegExp) => {
  const rest = text.replace(verbs, '')
  return rest && rest !== text ? rest : text
}

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
          target: clip(unsaid(str(i.description), /^(?:delete|remove)\s+/i) || deleted(str(i.command)), 64),
        }
      return {
        kind: 'run' as Kind,
        verb: isRerun ? 'Rerun' : 'Run',
        target: clip(unsaid(str(i.description), /^(?:re)?run\s+/i) || str(i.command).replace(/\s+/g, ' '), 64),
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
    // Which skill, not only that one ran: `Use Skill` alone tells the reader nothing.
    case 'Skill':
      return { kind: 'other' as Kind, verb: 'Skill', target: clip(str(i.skill) || str(i.command) || 'skill', 64) }
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
  Math.round(Math.max(0, ms) / 100) < 600 ? `${(Math.max(0, ms) / 1000).toFixed(1)} s` : fmtElapsed(Math.round(ms / 1000))

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

type Hunk = { oldStart: number; newStart: number; lines: string[] }

/**
 * The first `max` lines of a patch as unified-diff text, for the engine's `Code` element to
 * highlight. Each hunk's header counts only the lines kept, since a hunk cut short does not
 * parse. A new file's content is one hunk of additions. Control characters (a CRLF file's
 * `\r`) are dropped and a long line is clipped, so the source stays drawable.
 */
export const diffSource = (hunks: unknown, fallback?: string, max = 14) => {
  const list: Hunk[] =
    Array.isArray(hunks) && hunks.length > 0
      ? (hunks as Hunk[])
      : fallback
        ? [{ oldStart: 0, newStart: 1, lines: fallback.replace(/\n$/, '').split('\n').map(l => `+${l}`) }]
        : []
  const out: string[] = []
  let left = max
  for (const h of list) {
    if (left <= 0) break
    const kept = (h.lines ?? [])
      .filter(l => l[0] !== '\\')
      .slice(0, left)
      .map(l => (l[0] === '+' || l[0] === '-' ? l[0] : ' ') + clip(l.slice(l[0] === '+' || l[0] === '-' || l[0] === ' ' ? 1 : 0).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ''), 400))
    if (kept.length === 0) continue
    left -= kept.length
    const olds = kept.filter(l => l[0] !== '+').length
    const news = kept.filter(l => l[0] !== '-').length
    out.push(`@@ -${h.oldStart},${olds} +${h.newStart},${news} @@`, ...kept)
  }
  return out.join('\n')
}

/** A path as the project knows it: under `cwd`, relative to it; anywhere else, whole. */
export const relPath = (path: string, cwd: string | null) => {
  if (!cwd) return path
  const root = cwd.replace(/[\\/]+$/, '')
  return path.startsWith(`${root}/`) || path.startsWith(`${root}\\`) ? path.slice(root.length + 1) : path
}

/**
 * What an Edit or Write call changed, from its result: the diff card's rows and the counts,
 * the same lines as diff text for `Code`, and the file's path. Null for any other tool; no
 * rows for a result with no patch (an error's text, a no-op).
 */
export const fileChange = (tool: string, output: unknown) => {
  const name = short(tool)
  if (name !== 'Edit' && name !== 'Write') return null
  const out = (output !== null && typeof output === 'object' ? output : {}) as { structuredPatch?: unknown; content?: unknown; type?: unknown; filePath?: unknown }
  const fallback = out.type === 'create' && typeof out.content === 'string' ? out.content : undefined
  const d = diffRows(out.structuredPatch, fallback)
  // As many file lines as the rows show, so the "more" note counts the same lines.
  const source = diffSource(out.structuredPatch, fallback, d.rows.filter(r => r.sign !== '@').length)
  return { ...d, source, path: str(out.filePath) }
}

/** A background task's kind, from its notification: a shell command runs, anything else is an agent. */
export const taskKind = (type: string | undefined): Kind => (/bash|shell|command|monitor/i.test(type ?? '') ? 'run' : 'agent')

/**
 * What a notification row says, from its summary: the first line, less what the row already
 * says, the verb in front (`Agent`) and the ending behind (`completed`, which the pill shows),
 * and the quotes round a name left on its own. A name that opens with the verb drops it too:
 * `Agent` + `Agent smoke test` would say it twice.
 */
export const taskSummary = (text: string, verb: string) => {
  let s = (text.split('\n').find(l => l.trim()) ?? '').trim()
  if (s.toLowerCase().startsWith(`${verb.toLowerCase()} `)) s = s.slice(verb.length + 1).trim()
  s = s.replace(/\s+(?:has\s+|was\s+)?(?:completed|finished|failed|stopped|killed|cancell?ed|done)\.?$/i, '').trim()
  const quoted = /^"([^"]+)"$/.exec(s)
  return quoted ? unsaid(quoted[1]!, new RegExp(`^${verb}\\s+`, 'i')) : s
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
 * - Motion inside a picture (the bar's lights, the working dots, the status dot's halo, the
 *   working chip coming in, the Hanahira sparkle, an agent card's ring and bar) is CSS
 *   in the picture's own `<style>` (`motionStyle`), with no time in it: while the state holds,
 *   every redraw draws the same picture and the surface keeps the one it has, so a loop runs on
 *   and a one-shot plays once. The still look (the elements' own attributes) is where every
 *   motion rests, so a surface that plays none, or a person who asks for reduced motion, sees
 *   the right picture. It runs only in the surface's frame (`isInteractive`), drawn while
 *   Claude works.
 * - A figure that changes plays its change once, in CSS inside its picture too: a written
 *   figure rolls like a slot reel (`reelText`), a ring or meter glides to its new value, the
 *   speedometer's needle swings. The picture holds where the change came from (`reelHolder`,
 *   `glideHolder`) for as long as it plays, so a redraw then sends the same picture; after
 *   that the plain picture, which looks the same as where the motion rests. The surface runs
 *   it at its own frame rate, with no redraw while it moves.
 */
export const MOTION = {
  barMs: 2200, // one light's step to where the next one was
  barPeriod: 280, // px between two lights
  barGlow: 150, // px wide each light
  glowInk: '#ded8ff',
  dotsMs: 1200, // the working dots' wave
  haloMs: 2400, // the status dot's breath
  chipInMs: 260, // the working chip coming in as a turn starts
  twinkleMs: 700, // the Hanahira sparkle turning in as the mode switches on
  sparkMs: 2400, // its breath while the mode is on and Claude works
  spinMs: 1100, // a running agent card's ring, once round
  agentBarMs: 1600, // a running agent card's lit stretch, one way along its bar
  checkMs: 420, // a finished agent card's check, drawn in
  agentFillMs: 600, // a finished agent card's bar filling from its stretch to the end, once
  glideMs: 640, // a ring, meter or needle moving to its new value
  rollMs: 450, // a figure's slot roll, old value out and new one in
  holdMs: 900, // how long past its motion a picture keeps a change, for a surface slow to show it
}

/** The curves motion runs on: out settles softly, spring overshoots a touch, inOut breathes. */
export const EASE = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  inOut: 'cubic-bezier(0.45, 0, 0.55, 1)',
}

/**
 * A picture's motion as its own `<style>`: the keyframes and the classes that run them, all
 * stopped where the person asks for reduced motion, which leaves the still look.
 */
export const motionStyle = (css: string) =>
  `<style>${css}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>`

/** A CSS cubic-bézier curve as a function of time (0 to 1), solved as the browser does. */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  return (t: number) => {
    const x = Math.min(1, Math.max(0, t))
    let lo = 0
    let hi = 1
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

/** EASE.out as a function: where a glide is, `t` (0 to 1) of the way through it. */
export const easeOut = cubicBezier(0.22, 1, 0.36, 1)

/**
 * Figures whose roll is drawn by the picture itself (`reelText`): `value(key, text, now)` gives
 * the value it rolls from, the same for as long as the roll is held (MOTION.rollMs and
 * MOTION.holdMs), so every redraw in that time sends the same picture and its motion plays
 * once; then null, and the plain figure.
 */
export const reelHolder = (holdMs = MOTION.rollMs + MOTION.holdMs) => {
  const reels = new Map<string, { from: string | null; to: string; at: number }>()
  return {
    value(key: string, text: string, now: number): string | null {
      const r = reels.get(key)
      if (!r) {
        reels.set(key, { from: null, to: text, at: now - holdMs })
        return null
      }
      if (r.to !== text) reels.set(key, { from: r.to, to: text, at: now })
      const g = reels.get(key)!
      return g.from !== null && now - g.at < holdMs ? g.from : null
    },
  }
}

/**
 * Rings, meters and needles that glide to a new value by themselves, in CSS: `from(key,
 * target, now)` gives the value the picture glides from, the same while the glide is held, then
 * null. A new target mid-glide starts from where the last one had got to (on EASE.out), so a
 * gauge that changes often moves on and never jumps back.
 */
export const glideHolder = (ms = MOTION.glideMs, holdMs = ms + MOTION.holdMs) => {
  const glides = new Map<string, { from: number; to: number; at: number }>()
  return {
    from(key: string, target: number | null, now: number): number | null {
      if (target === null || !Number.isFinite(target)) {
        glides.delete(key)
        return null
      }
      const g = glides.get(key)
      if (!g) {
        glides.set(key, { from: target, to: target, at: now - holdMs })
        return null
      }
      if (g.to !== target) glides.set(key, { from: g.from + (g.to - g.from) * easeOut((now - g.at) / ms), to: target, at: now })
      const n = glides.get(key)!
      return n.from !== n.to && now - n.at < holdMs ? n.from : null
    },
  }
}

/**
 * A figure as SVG text that rolls in from `from` by itself, as a slot reel turned by CSS in the
 * picture: the shared front stays put; the rest is a strip, old over new a line apart, behind a
 * window the figure's height, that turns up a line, 6% past it, and snaps back onto the new
 * value. At rest (no motion run, or reduced motion) the strip stands on the new value.
 */
export const reelText = (x: number, y: number, fs: number, attrs: string, value: string, from?: string | null) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!from || from === value) return `<text x="${x}" y="${y}" ${attrs}>${esc(value)}</text>`
  let n = 0
  while (n < from.length && n < value.length && from[n] === value[n]) n++
  const keep = value.slice(0, n)
  const line = +(fs * 1.2).toFixed(1)
  const held = keep ? `<tspan fill-opacity="0">${esc(keep)}</tspan>` : ''
  return (
    `<clipPath id="reel-cut"><rect x="0" y="${(y - fs * 0.9).toFixed(1)}" width="100000" height="${(fs * 1.05).toFixed(1)}"/></clipPath>` +
    (keep ? `<text x="${x}" y="${y}" ${attrs}>${esc(keep)}</text>` : '') +
    `<g clip-path="url(#reel-cut)"><g class="reel" transform="translate(0 ${-line})">` +
    `<text x="${x}" y="${y}" ${attrs} class="reel-out">${held}${esc(from.slice(n))}</text>` +
    `<text x="${x}" y="${(y + line).toFixed(1)}" ${attrs}>${held}${esc(value.slice(n))}</text>` +
    `</g></g>` +
    motionStyle(
      `@keyframes reel{from{transform:translateY(0);animation-timing-function:${EASE.inOut}}` +
        `75%{transform:translateY(${(-line * 1.06).toFixed(1)}px);animation-timing-function:${EASE.out}}` +
        `to{transform:translateY(${-line}px)}}.reel{animation:reel ${MOTION.rollMs}ms both}` +
        // The old value dims as it leaves, so the eye follows the one coming in.
        `@keyframes reel-out{to{opacity:.35}}.reel-out{animation:reel-out ${Math.round(MOTION.rollMs * 0.75)}ms ${EASE.inOut} both}`,
    )
  )
}

/**
 * A glide in CSS from `from` to where the element rests: `prop` is the property and `css(v)` its
 * value for a reading. Empty when there is nothing to glide. `name` keeps the keyframes apart
 * where one picture holds two glides.
 */
export const glideStyle = (name: string, prop: string, css: (v: number) => string, from: number | null | undefined, to: number) =>
  from === null || from === undefined || !Number.isFinite(from) || css(from) === css(to)
    ? ''
    : motionStyle(`@keyframes ${name}{from{${prop}:${css(from)}}to{${prop}:${css(to)}}}.${name}{animation:${name} ${MOTION.glideMs}ms ${EASE.out} both}`)

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
export const fmtCost = (usd: number) => (Number.isFinite(usd) ? `$${usd.toFixed(2)}` : '—')

/** 0:18, 12:05, 1:02:03 (hours only when needed). */
export const fmtClock = (ms: number) => {
  if (Number.isNaN(ms) || ms === Infinity) return '—'
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Token counts with k / M / B / T: 950, 1.5k, 196k, 1.25M, 3.4B. */
export const fmtTokens = (n: number) => {
  if (Number.isNaN(n) || n === Infinity) return '—'
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
 * needle. With `from`, the arc and needle swing there from that fraction (`glideHolder`).
 */
export const speedoSvg = (fraction: number, color: string, size: number, from?: number | null) => {
  const clamp = (v: number) => (Number.isNaN(v) ? 0 : Math.max(0, Math.min(1, v)))
  const f = clamp(fraction)
  const was = from === null || from === undefined ? null : clamp(from)
  const r = 17
  const c = 2 * Math.PI * r
  const sweep = 0.75 * c
  const dash = (v: number) => `${(v * sweep).toFixed(2)} ${c.toFixed(2)}`
  const arc =
    f > 0
      ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash(f)}" transform="rotate(135 22 22)" class="spd-arc"/>` +
        glideStyle('spd-arc', 'stroke-dasharray', dash, was, f)
      : ''
  // The needle turns about the hub: drawn from the origin of a group set on the hub.
  const turn = (v: number) => `rotate(${(-135 + v * 270).toFixed(1)}deg)`
  const needle =
    `<g transform="translate(22 22)"><g transform="rotate(${(-135 + f * 270).toFixed(1)})" class="spd-needle">` +
    `<path d="M0 0 L0 -13" stroke="#f1ece8" stroke-width="2.6" stroke-linecap="round"/></g></g>` +
    glideStyle('spd-needle', 'transform', turn, was, f)
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
export const fmtSpeed = (tps: number) => (!Number.isFinite(tps) ? '—' : tps < 10 ? String(Math.round(tps * 10) / 10) : String(Math.round(tps)))

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
 * A loading bar with no number behind it, in the context meter's look: a row of crisp blocks
 * (METER's size and gap, the bar's `height` tall), the track's colour while idle and all lit
 * in `color` while `live`. `padBottom` adds transparent room under the bar, in px.
 *
 * Drawn wider than its slot, it keeps its height and is cut at the right (`slice`): with the
 * default `meet`, a surface that narrows the box shrinks the whole bar to a hairline.
 *
 * With `motion` (and `live`), soft lights glide left to right over the blocks, one every
 * MOTION.barPeriod px, so a slot of any width shows one. A loop (see MOTION): its rest is the
 * still picture, and nothing in it depends on time, so a redraw sends the same picture.
 */
export const loadingSvg = (
  width: number,
  height: number,
  color: string,
  opts: { live?: boolean; padBottom?: number; motion?: boolean } = {},
) => {
  const w = Math.max(120, Math.round(width))
  const h = height
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  const pitch = METER.w + METER.gap
  const blocks = Array.from({ length: Math.ceil(w / pitch) }, (_, k) => `M${k * pitch} 0h${METER.w}v${h}h-${METER.w}z`).join('')

  // The lights: a row of glows moved one period on per loop, cut to the blocks alone.
  const P = MOTION.barPeriod
  const glows: string[] = []
  for (let gx = -P; gx < w; gx += P) glows.push(`<rect x="${gx}" width="${MOTION.barGlow}" height="${h}" fill="url(#bar-glow)"/>`)
  const glide =
    opts.live && opts.motion
      ? `<defs><linearGradient id="bar-glow" x1="0" x2="1">` +
        `<stop offset="0" stop-color="${MOTION.glowInk}" stop-opacity="0"/>` +
        `<stop offset="0.5" stop-color="${MOTION.glowInk}" stop-opacity="0.9"/>` +
        `<stop offset="1" stop-color="${MOTION.glowInk}" stop-opacity="0"/>` +
        `</linearGradient><clipPath id="bar-cut"><path d="${blocks}"/></clipPath></defs>` +
        `<g clip-path="url(#bar-cut)"><g class="lights">${glows.join('')}</g></g>` +
        motionStyle(`@keyframes lights{to{transform:translateX(${P}px)}}.lights{animation:lights ${MOTION.barMs}ms linear infinite}`)
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + pad}" width="${w}" height="${h + pad}" preserveAspectRatio="xMinYMid slice" shape-rendering="crispEdges">` +
    `<path d="${blocks}" fill="${opts.live ? color : INK.track}"/>` +
    glide +
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
export const meterSvg = (percent: number | null, color: string, from?: number | null) => {
  const M = METER
  const pitch = M.w + M.gap
  const width = M.segs * pitch - M.gap
  const height = M.h
  const lit = (p: number | null) => {
    const share = p === null || !Number.isFinite(p) ? 0 : Math.max(0, Math.min(100, p)) / 100
    return share > 0 ? Math.max(1, Math.round(share * M.segs)) : 0
  }
  const litN = lit(percent)
  // With `from`, the blocks between the two readings light (or go out) one by one, on
  // MOTION.glideMs and EASE.out, each at its own delay: crisp blocks, never half of one.
  const fromN = from === null || from === undefined ? litN : lit(from)
  const lo = Math.min(litN, fromN)
  const hi = Math.max(litN, fromN)
  const block = (k: number) => `M${k * pitch} 0h${M.w}v${M.h}h-${M.w}z`
  const blocks = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, k) => block(a + k)).join('')
  const step = Array.from({ length: hi - lo }, (_, i) => {
    const k = litN > fromN ? fromN + i : fromN - 1 - i
    const delay = Math.round(MOTION.glideMs * easeIn((i + 1) / (hi - lo)))
    return `<path d="${block(k)}" fill="${k < litN ? color : INK.track}" class="m" style="animation-delay:${delay}ms"/>`
  }).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">` +
    (hi < M.segs ? `<path d="${blocks(hi, M.segs)}" fill="${INK.track}"/>` : '') +
    (lo > 0 ? `<path d="${blocks(0, lo)}" fill="${color}"/>` : '') +
    step +
    (step ? motionStyle(`@keyframes m{from{fill:${litN > fromN ? INK.track : color}}}.m{animation:m 1ms linear both}`) : '') +
    `</svg>`
  return { svg, width, height }
}

/** When EASE.out reaches `y` (0 to 1): the time a glide passes a point on its way. */
const easeIn = (y: number) => {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (easeOut(mid) < y) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
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
    /** The figure rolls in from this one (`reelText`); the meter glides from `fromPercent`. */
    from?: string | null
    fromPercent?: number | null
  } = {},
) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const C = CONTEXT
  const meter = meterSvg(percent, color, opts.fromPercent)
  const value = percent === null || !Number.isFinite(percent) ? '—' : `${Math.round(percent)}%`
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
    reelText(valueX, y, C.fs, `${font} font-size="${C.fs}" font-weight="700" fill="${opts.warn ? color : INK.value}"`, value, opts.from) +
    `<text x="${wordsX}" y="${y}" ${font} font-size="${C.labelFs}">${words}</text>` +
    `<g transform="translate(${meterX} ${meterY})">${meter.svg}</g>` +
    `</svg>`
  return { svg, width, height, natural }
}

/** The little status dot of the band: a halo round it while Claude works. */
export const dotSvg = (color: string, live: boolean, size = 14, motion = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="${size}" height="${size}">` +
  (live
    ? `<circle cx="7" cy="7" r="5.8" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity="0.4"` +
      // With `motion` the halo breathes out and fades, and comes back (a loop: see MOTION).
      (motion
        ? ` class="halo"/>` +
          motionStyle(
            `@keyframes halo{50%{stroke-opacity:.1;transform:scale(1.08)}}` +
              `.halo{transform-origin:7px 7px;animation:halo ${MOTION.haloMs}ms ${EASE.inOut} infinite}`,
          )
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
    /** The value rolls in from this one (`reelHolder`, `reelText`); the label is at its new place. */
    reel?: string | null
    /**
     * A state to read at a glance (a mode on or off): the label in this colour, or, stacked,
     * the first line under the value.
     */
    tone?: string
    /**
     * Motion for a state tile (the Hanahira mode): `pulse`, the glyph breathes (a loop);
     * `enterFrom`, the state just arrived from this colour: the tile turns from it, the glyph
     * turns in on a spring and the state line rises into place (once). See MOTION.
     */
    spark?: { pulse?: boolean; enterFrom?: string }
  } = {},
) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const S = STAT
  const color = opts.color ?? '#8f8985'
  const spark = opts.icon && !opts.plain && !opts.ring && (opts.spark?.pulse || opts.spark?.enterFrom) ? opts.spark : undefined
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
      ? `<rect x="0.5" y="${g0 + 0.5}" width="${S.glyph - 1}" height="${S.glyph - 1}" rx="7" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.32"${spark?.enterFrom ? ' class="tile"' : ''}/>` +
        // Across, the icon centres in the tile alone; down, past the row's top margin too.
        (spark ? '<g class="spark">' : '') +
        iconGroup(opts.icon, color, (S.glyph - S.icon) / 2, io, S.icon, 2) +
        (spark ? '</g>' : '')
      : ''
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'
  const valueFont = `${font} font-size="${S.fs}" font-weight="700" fill="#f1ece8"`
  // An invisible copy of the value holds its place, so the label follows it as the renderer sets it.
  const holder = `<tspan font-size="${S.fs}" font-weight="700" fill-opacity="0">${esc(value)}</tspan>`
  const tail =
    `<text x="${x}" y="${y}" ${font} font-size="${S.labelFs}" fill="#a39b96">${holder}` +
    (label ? `<tspan dx="5"${opts.tone ? ` fill="${opts.tone}" font-weight="600"` : ''}>${esc(label)}</tspan>` : '') +
    (opts.detail && !stacked ? `<tspan fill="#8f8782"> · ${esc(opts.detail)}</tspan>` : '') +
    `</text>` +
    under
      .map((line, i) => {
        const ink = i === 0 && opts.tone ? `fill="${opts.tone}" font-weight="600"${spark?.enterFrom ? ' class="rise"' : ''}` : 'fill="#8f8782"'
        return `<text x="${x}" y="${(y + S.subLine * (i + 1)).toFixed(1)}" ${font} font-size="${S.subFs}" ${ink}>${esc(line)}</text>`
      })
      .join('')
  const valueLine = reelText(x, y, S.fs, valueFont, value, opts.reel)
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
  // The tile's centre, where the glyph turns and breathes.
  const mid = `${S.glyph / 2}px ${g0 + S.glyph / 2}px`
  const motion = spark
    ? motionStyle(
        (spark.enterFrom
          ? `@keyframes tile{from{fill:${spark.enterFrom};stroke:${spark.enterFrom}}}` +
            `@keyframes twinkle{from{opacity:0;transform:rotate(-120deg) scale(.3)}}` +
            `@keyframes rise{from{opacity:0;transform:translateY(5px)}}` +
            `.tile{animation:tile ${MOTION.twinkleMs}ms ${EASE.out} both}` +
            `.rise{animation:rise ${Math.round(MOTION.twinkleMs * 0.6)}ms ${EASE.out} ${Math.round(MOTION.twinkleMs * 0.25)}ms both}`
          : '') +
          (spark.pulse ? `@keyframes spark{50%{transform:scale(1.14) rotate(12deg);opacity:.72}}` : '') +
          `.spark{transform-origin:${mid};animation:` +
          [
            spark.enterFrom ? `twinkle ${MOTION.twinkleMs}ms ${EASE.spring} both` : '',
            spark.pulse ? `spark ${MOTION.sparkMs}ms ${EASE.inOut} ${spark.enterFrom ? MOTION.twinkleMs : 0}ms infinite` : '',
          ]
            .filter(Boolean)
            .join(',') +
          `}`,
      )
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    glyph +
    tail +
    valueLine +
    motion +
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
  /**
   * The chip comes in (a quick scale and fade, once) and its dots light in a wave, left to
   * right, from their still look (a loop: see MOTION).
   */
  motion?: boolean
  /** The value rolls in from this one by itself, in CSS (`reelHolder`, `reelText`). */
  reel?: string | null
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
            (opts.motion ? ` class="d${i}"/>` : '/>'),
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
  const value = opts.value
    ? reelText(x, y, C.fs, valueFont, opts.value, opts.reel)
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
  // Each dot steps through the three brightnesses, so the brightest one moves left to right.
  const wave = (i: number) =>
    `@keyframes d${i}{0%,100%{opacity:${levels[i]}}33.3%{opacity:${levels[(i + 2) % 3]}}66.7%{opacity:${levels[(i + 1) % 3]}}}` +
    `.d${i}{animation:d${i} ${MOTION.dotsMs}ms ${EASE.inOut} infinite}`
  const motion = opts.motion
    ? motionStyle(
        `@keyframes chip-in{from{opacity:0;transform:scale(.88)}}` +
          `.chip{transform-origin:${width / 2}px ${h / 2}px;animation:chip-in ${MOTION.chipInMs}ms ${EASE.out} both}` +
          (opts.dots ? [0, 1, 2].map(wave).join('') : ''),
      )
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    (opts.motion ? '<g class="chip">' : '') +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${h - 1}" rx="7" fill="${opts.color}" fill-opacity="${restOpacity}" stroke="${quiet ? INK.line : opts.color}" stroke-opacity="${quiet ? 1 : 0.32}"/>` +
    glyph +
    tail +
    value +
    (opts.motion ? '</g>' : '') +
    motion +
    `</svg>`
  return { svg, width, height: h, natural }
}

/**
 * A dim line of text that rolls to each new value like the band's figures (`reelText`): the
 * top line's elapsed clock. `minText` holds it as wide as that text from the start, so what
 * follows it never steps right as it grows.
 */
export const tickerSvg = (text: string, opts: { from?: string | null; minText?: string; color?: string } = {}) => {
  const C = CHIP_LINE
  const font = `font-family="ui-sans-serif,system-ui,sans-serif" font-size="${C.fs}" fill="${opts.color ?? INK.label}"`
  // A little room past the estimate, for a face wider than it.
  const width = Math.ceil(Math.max(labelWidth(text, C.fs), labelWidth(opts.minText ?? '', C.fs)) + 6)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${C.height}" width="${width}" height="${C.height}">` +
    reelText(0, C.baseline, C.fs, font, text, opts.from) +
    `</svg>`
  return { svg, width, height: C.height }
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
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return 'resetting now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'resets in <1m'
  if (mins < 60) return `resets in ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `resets in ${hours}h${mins % 60 ? ` ${mins % 60}m` : ''}`
  const days = Math.floor(hours / 24)
  return `resets in ${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`
}

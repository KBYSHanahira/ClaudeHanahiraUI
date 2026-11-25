// Pure display helpers for the band: no engine calls here, so tests run them as is.

import { hasIcon, iconGroup } from './icons'
import type { IconName } from './icons'

/**
 * A status pill's measures, in px: its mark's tile picture (the tile itself is 25 of its
 * 32 units), and the pill's height.
 */
export const ROW = { tile: 32, pill: 22 }

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
export type PillIcon = 'check' | 'cross' | 'ban'

// `fg` and `bg` paint a capsule; `color` is the state's own colour, for its tile and word in a
// row (the way a row's kind shows its tile and verb).
export const PILL = {
  ok: { fg: '#a9e6b4', bg: '#2d4232', color: '#8fdcb9' },
  bad: { fg: '#f4a1b3', bg: '#4a2b33', color: '#f2879a' },
  busy: { fg: '#f9c6dc', bg: '#3a2430', color: '#f5a3c7' },
  warn: { fg: '#f3cf7a', bg: '#3a3224', color: '#f3cf7a' },
}

/** Whole seconds as s / m / h / d: 7s, 1m 4s, 2h 5m, 3d 4h. */
export const fmtElapsed = (totalSecs: number) => {
  const s = Number.isFinite(totalSecs) ? Math.max(0, Math.floor(totalSecs)) : 0
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`
}

/**
 * A pill's mark tile: a rounded square tinted in the state's colour, its icon in the middle,
 * the same tile the band's cards carry. A running tile's edge is dimmer. `icon` 'dots' draws
 * three dots, dim to bright (a status still under way).
 */
export const badgeSvg = (color: string, icon: string, size: number, running = false) => {
  const g = icon.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fs = icon.length > 1 ? 12 : 14
  const mark = icon === 'dots'
    ? // Three dots, dim to bright: a state still under way.
      [0, 1, 2].map(i => `<circle cx="${10 + i * 6}" cy="16" r="2" fill="${color}" opacity="${(0.35 + i * 0.3).toFixed(2)}"/>`).join('')
    : hasIcon(icon)
    ? iconGroup(icon, color, 8, 8, 16, 2.1)
    : `<text x="16" y="${icon.length > 1 ? 20.5 : 21}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="${fs}" font-weight="700" fill="${color}">${g}</text>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
    `<rect x="3.5" y="3.5" width="25" height="25" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="${running ? 0.2 : 0.4}" stroke-width="1.5"/>` +
    mark +
    `</svg>`
  )
}

// A cheap deterministic hash in [0, 1): the same bar draws the same dots every time.
const noise = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The surface every card and chart sits on: a soft top-lit gradient and a hairline edge. */
export const PANEL = { top: '#1c1c1f', bottom: '#141416', edge: '#2c2925', glow: '#ffffff' }

/**
 * The band's hues, all from its mascot, a white cat-eared rabbit: `petal` the pink inside its ears
 * and on its cheeks (and the name, Hanahira: a petal) is the one accent, for work and the mode;
 * `fur` the periwinkle shade under its coat is the calm colour of every gauge; mint, butter and
 * rose say ok, careful and stop, and only when a value means it. `card` is the near-black ground
 * every card sits on, `snow` and `night` the mascot's coat and eyes.
 */
export const HUE = {
  petal: '#f5a3c7',
  fur: '#a9b6ec',
  mint: '#8fdcb9',
  butter: '#f3cf7a',
  rose: '#f2879a',
  peach: '#f6b896',
  lilac: '#c3b5f7',
  card: '#121110',
  snow: '#f4f1fb',
  night: '#0c0c0d',
  // The HUD band's two signal colours: `sky` the one accent of every gauge and the working
  // state, `hazard` the warning stripes of the loading bar.
  sky: '#29b6f6',
  hazard: '#f4d21f',
  // The speed cell's top charge: a hot red, apart from the softer `rose` of an error.
  red: '#ff4d5a',
  // The loading bar's stripes and frame.
  gold: '#e6b422',
  // FOUNDRY, the band's industrial look (orange on warm black): `signal` the one accent of every
  // gauge, the working state and the session plate; `amber` the hazard stripes, the branch and a
  // meter's lit head; `ember` hot (the top speed charge, a limit near its end); `bone` a done turn,
  // a warm off-white; `steel` the cool second meter (a model's own week) beside the orange.
  signal: '#ff7a1a',
  amber: '#ffb020',
  ember: '#ff3b2f',
  bone: '#ece6da',
  steel: '#8f99a3',
}

/** The mascot's outline: dark enough to edge its white coat, swapped lighter on a white card (LIGHT). */
export const MASCOT_LINE = '#4a4a52'

/** The band's text and line colours: ink for values, label and detail for words (each at least 4.5:1 on the band), quiet for lines and muted icons. */
export const INK = { value: '#f2eee8', label: '#aaa49b', detail: '#8c867d', line: '#2c2925', track: '#2e2a26' }

/**
 * The band follows the app's theme from inside each picture: pictures are drawn in their dark
 * colours, and where the app is light (`prefers-color-scheme: light`) each of those colours is
 * swapped for its light one by an attribute selector, so no builder needs a second palette.
 * Light is the glass of a smart-home panel: ink #2b2f36 on white cards, cool grey tracks.
 */
export const LIGHT: Record<string, string> = {
  [INK.value]: '#24211d',
  [INK.label]: '#6b655c',
  [INK.detail]: '#857e73',
  [INK.line]: '#e4ded4',
  [INK.track]: '#e9e4db', // every track: rings, speedometer, slider, bar, agent marks
  // An agent card's ground; its edge, name and words are INK's.
  [HUE.card]: '#ffffff',
  // The mascot keeps its coat (its own outline shows it on white); its eyes and the pastel hues
  // darken enough to read on white.
  [HUE.night]: '#2b2f36',
  [HUE.petal]: '#d9609a',
  [HUE.fur]: '#5b6fc9',
  [HUE.mint]: '#2f9e74',
  [HUE.butter]: '#b88a14',
  [HUE.rose]: '#d4475f',
  [HUE.peach]: '#c9774a',
  [HUE.lilac]: '#6f5cd0',
  [HUE.sky]: '#0b7fc0',
  [HUE.hazard]: '#b88a14',
  [HUE.red]: '#d42a3a',
  [HUE.gold]: '#a87a00',
  [HUE.signal]: '#d0560a',
  [HUE.amber]: '#a86a00',
  [HUE.ember]: '#c92a1f',
  [HUE.bone]: '#3a342d',
  [HUE.steel]: '#5d6873',
  [MASCOT_LINE]: '#8a909a', // the mascot's outline, so its white coat shows on white
}

/** The light swap as a picture's own `<style>`, and the glass cards' light look (a soft shadow). */
export const themeStyle = (body?: string) => {
  // With `body`, only the colours it draws with (and the glass look only where it has glass):
  // the full list is about 2.7 KB, and the band sends some forty pictures on every redraw.
  const uses = (c: string) => body === undefined || body.includes(`"${c}"`)
  const glass = body === undefined || body.includes('class="glass')
  const rules = Object.entries(LIGHT)
    .filter(([dark]) => uses(dark))
    .map(([dark, light]) => {
      const sel = (a: string) => (body === undefined || body.includes(`${a}="${dark}"`) ? `[${a}="${dark}"]{${a}:${light}}` : '')
      return sel('fill') + sel('stroke') + sel('stop-color')
    })
    .join('')
  const glassCss = glass ? `.glass{fill:#ffffff;fill-opacity:1;stroke:#0f172a;stroke-opacity:.08;filter:url(#glass-shadow)}.glass-hi{stroke-opacity:0}` : ''
  return rules || glassCss ? `<style>@media (prefers-color-scheme: light){${rules}${glassCss}}</style>` : ''
}

/** A picture that follows the app's theme (`themeStyle`), however it was drawn. */
export const themed = (svg: string) => svg.replace(/<\/svg>$/, `${themeStyle(svg)}</svg>`)

/**
 * The band's motion, on two rules so a redraw never blinks or starts a motion over (the reason
 * v1.8.0 took motion out):
 * - Motion inside a picture (the bar's lights, the working dots, an agent chip's ring) is CSS
 *   in the picture's own `<style>` (`motionStyle`), with no time in it: while the state holds,
 *   every redraw draws the same picture and the surface keeps the one it has, so a loop runs on
 *   and a one-shot plays once. The still look (the elements' own attributes) is where every
 *   motion rests, so a surface that plays none, or a person who asks for reduced motion, sees
 *   the right picture. It runs only in the surface's frame (`isInteractive`), drawn while
 *   Claude works.
 * - A figure that changes plays its change once, in CSS inside its picture too: a written
 *   figure rolls like a slot reel (`reelText`), a ring or meter glides to its new value. The
 *   picture holds where the change came from (`glideHolder`) for as long as it plays, so a redraw then sends the same picture; after
 *   that the plain picture, which looks the same as where the motion rests. The surface runs
 *   it at its own frame rate, with no redraw while it moves.
 */
export const MOTION = {
  barMs: 2200, // one light's step to where the next one was
  barPeriod: 280, // px between two lights
  barGlow: 150, // px wide each light
  glowInk: '#ffffff',
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
 * A motion under way: where it comes `from`, and its `age`, the ms since the change began.
 * A picture plays its motion from its age (a negative `animation-delay`), so a surface that
 * draws the picture again mid-motion picks it up where it is instead of starting it over.
 */
export type Since<T> = { from: T; age: number }

/** A motion's start as a builder takes it: a `Since`, or a bare value for a motion just begun. */
export const since = <T>(f: Since<T> | T | null | undefined): Since<T> | null =>
  f === null || f === undefined ? null : typeof f === 'object' ? (f as Since<T>) : { from: f as T, age: 0 }

/**
 * Rings, meters and needles that glide to a new value by themselves, in CSS: `from(key,
 * target, now)` gives the value the picture glides from, the same while the glide is held, then
 * null. A new target mid-glide starts from where the last one had got to (on EASE.out), so a
 * gauge that changes often moves on and never jumps back.
 */
export const glideHolder = (ms = MOTION.glideMs, holdMs = ms) => {
  const glides = new Map<string, { from: number; to: number; at: number }>()
  return {
    from(key: string, target: number | null, now: number): Since<number> | null {
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
      return n.from !== n.to && now - n.at < holdMs ? { from: n.from, age: Math.max(0, now - n.at) } : null
    },
    /** Ms until the last glide under way ends (0 with none): when the plain pictures are due. */
    left(now: number): number {
      let ms = 0
      for (const g of glides.values()) if (g.from !== g.to) ms = Math.max(ms, g.at + holdMs - now)
      return ms
    },
  }
}

/**
 * A figure as SVG text that rolls in from `from` by itself, as a slot reel turned by CSS in the
 * picture: the shared front stays put; the rest is a strip, old over new a line apart, behind a
 * window the figure's height, that turns up a line, 6% past it, and snaps back onto the new
 * value. At rest (no motion run, or reduced motion) the strip stands on the new value.
 */
export const reelText = (x: number, y: number, fs: number, attrs: string, value: string, start?: Since<string> | string | null) => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const from = since(start)?.from
  // Played from its age, so a picture drawn again mid-roll goes on from where the roll is.
  const delay = `-${Math.round(since(start)?.age ?? 0)}ms`
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
        `to{transform:translateY(${-line}px)}}.reel{animation:reel ${MOTION.rollMs}ms ${delay} both}` +
        // The old value dims as it leaves, so the eye follows the one coming in.
        `@keyframes reel-out{to{opacity:.35}}.reel-out{animation:reel-out ${Math.round(MOTION.rollMs * 0.75)}ms ${EASE.inOut} ${delay} both}`,
    )
  )
}

/**
 * A glide in CSS from `from` to where the element rests: `prop` is the property and `css(v)` its
 * value for a reading. Empty when there is nothing to glide. `name` keeps the keyframes apart
 * where one picture holds two glides.
 */
export const glideStyle = (name: string, prop: string, css: (v: number) => string, start: Since<number> | number | null | undefined, to: number) => {
  const g = since(start)
  // Played from its age, so a picture drawn again mid-glide goes on from where the glide is.
  return g === null || !Number.isFinite(g.from) || css(g.from) === css(to)
    ? ''
    : motionStyle(`@keyframes ${name}{from{${prop}:${css(g.from)}}to{${prop}:${css(to)}}}.${name}{animation:${name} ${MOTION.glideMs}ms ${EASE.out} -${Math.round(g.age)}ms both}`)
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
  return cells.length > 0 ? `<path d="${cells.join('')}" fill="${opts.color ?? INK.detail}" fill-opacity="${opts.opacity ?? 0.16}"/>` : ''
}

/** ≈-free money for a stat card: always two decimals, $15.62. */
export const fmtCost = (usd: number) => (Number.isFinite(usd) ? `$${usd.toFixed(2)}` : '—')

/** 0:18, 12:05, 1:02:03 (hours only when needed). */
export const fmtClock = (ms: number) => {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms === Infinity) return '—'
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Token counts with k / M / B / T: 950, 1.5k, 196k, 1.25M, 3.4B. */
export const fmtTokens = (n: number) => {
  if (typeof n !== 'number' || Number.isNaN(n) || n === Infinity) return '—'
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

/** Speed for a tile: 42, 8.5 (one decimal under 10). */
export const fmtSpeed = (tps: number) => (!Number.isFinite(tps) ? '—' : tps < 10 ? String(Math.round(tps * 10) / 10) : String(Math.round(tps)))

/** Rough width of a label in px at a given font size: symbols run wide, capitals a little wider. */
export const labelWidth = (text: string, fs: number) =>
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
  const label = `<text x="${tx}" y="${ty}" text-anchor="middle" font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="${fg}" textLength="${tl}" lengthAdjust="spacingAndGlyphs">${t}</text>`
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
 * The face the band's figures are set in. Tabular digits are all one width, so a figure that
 * changes (a clock every second, a count) keeps its width and nothing after it moves.
 */
export const FIGURE_FONT = 'font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" style="font-variant-numeric:tabular-nums"'

/** Card geometry: the icon tile on the left, label over value beside it. */
export const CARD = { height: 52, tile: 36, icon: 22, textX: 54, pad: 16 }

/** A stat card as SVG: a tinted icon tile on the left, the label over the value beside it. */
export const cardSvg = (label: string, value: string, opts: { icon?: IconName; iconColor?: string } = {}) => {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const iconColor = opts.iconColor ?? '#8c867d'
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
  const valueFont = `font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f2eee8"`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    panelSvg('cardg', width, height, 12) +
    // The halftone gathers in the top-right corner and starts past the label, so no dot sits on text.
    halftone(Math.max(Math.round(width * 0.45), Math.ceil(textX + labelWidth(label, 11.5) + 6)), 6, width - 7, 27, { color: iconColor, opacity: 0.22 }) +
    tile +
    `<text x="${textX}" y="21" font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" font-size="11.5" fill="#aaa49b">${esc(label)}</text>` +
    `<text x="${textX}" y="40" ${valueFont}>${esc(value)}</text>` +
    `</svg>`
  return { svg, width, height }
}

/** The mascot's box, in its own units: a cat-eared rabbit's head, a little wider than tall. */
export const MASCOT = { w: 30, h: 28 }

/** How far the planet's bands drift before their waves repeat, in px of the 30-wide drawing, and how long that takes; the ring's dashes run one dash a `dashMs`. */
const DRIFT = { period: 8, ms: 4000, dash: 4, dashMs: 900 }

/**
 * The band's mascot, a ringed gas giant drawn as line art (the Jupiter Series), as a nested
 * picture at (`x`, `y`) `width` wide: a dark disc with an outline, wavy bands across it, and a
 * tilted ring whose back half passes behind the disc and whose front half crosses it, a dashed
 * line along the ring's middle. Awake (`on`): the outline in ink, the bands in signal orange and
 * amber, the ring's dashes in amber. Asleep: all of it in a quiet grey. With `enter` (how long
 * ago it woke, in ms) it hops once on a spring, anchored to that age like a glide, so a redraw
 * mid-hop goes on from where it is. With `motion` (awake, while Claude works) the bands drift
 * across the disc and the ring's dashes run round it (loops: drawn in the surface's frame, see
 * MOTION). Every part rests on its still look.
 */
export const mascotSvg = (on: boolean, x: number, y: number, width: number, opts: { enter?: number | null; motion?: boolean } = {}) => {
  const M = MASCOT
  const height = +((width * M.h) / M.w).toFixed(2)
  const moving = on && opts.motion === true
  const hop = on && typeof opts.enter === 'number' && opts.enter < MOTION.twinkleMs ? Math.round(opts.enter) : null
  const line = on ? INK.value : INK.detail
  const bandA = on ? HUE.signal : INK.detail
  const bandB = on ? HUE.amber : INK.detail
  const cx = 15
  const cy = 14
  const r = 9
  // The ring: tilted, its outer and inner edges, the front half drawn over the disc.
  const tilt = -22
  const ro = { x: 14.8, y: 5.4 }
  const ri = { x: 11, y: 3.1 }
  const rm = { x: 12.9, y: 4.25 }
  const half = (e: { x: number; y: number }, front: boolean) => `M${cx - e.x} ${cy}A${e.x} ${e.y} 0 0 ${front ? 0 : 1} ${cx + e.x} ${cy}`
  const ringBand = (front: boolean) =>
    `M${cx - ro.x} ${cy}A${ro.x} ${ro.y} 0 0 ${front ? 0 : 1} ${cx + ro.x} ${cy}L${cx + ri.x} ${cy}A${ri.x} ${ri.y} 0 0 ${front ? 1 : 0} ${cx - ri.x} ${cy}Z`
  const ring = (front: boolean) =>
    `<g transform="rotate(${tilt} ${cx} ${cy})">` +
    `<path d="${ringBand(front)}" fill="${HUE.card}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="${half(rm, front)}" fill="none" stroke="${bandB}" stroke-width="0.7" stroke-linecap="round" stroke-dasharray="1.6 ${DRIFT.dash - 1.6}"${moving ? ` class="dash"` : ''}/>` +
    `</g>`
  // Wavy bands, three wave periods wider than the disc on each side, so a slide of one period shows no seam.
  const P = DRIFT.period
  const wave = (y0: number, amp: number) => {
    let d = `M${cx - r - 3 * P} ${y0}`
    for (let k = 0; k < Math.ceil((2 * r + 6 * P) / P); k++) d += `q${P / 4} ${-amp} ${P / 2} 0t${P / 2} 0`
    return d
  }
  const bands =
    `<path d="${wave(8.2, 1.1)}" fill="none" stroke="${bandB}" stroke-width="0.8" stroke-linecap="round"/>` +
    `<path d="${wave(11.4, 1.4)}" fill="none" stroke="${bandA}" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="${wave(15.6, 1.2)}" fill="none" stroke="${bandB}" stroke-width="0.8" stroke-linecap="round"/>` +
    `<path d="${wave(19.4, 1)}" fill="none" stroke="${bandA}" stroke-width="1.1" stroke-linecap="round"/>`
  const disc =
    `<defs><clipPath id="pl-c"><circle cx="${cx}" cy="${cy}" r="${r - 0.5}"/></clipPath></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${HUE.card}"/>` +
    `<g clip-path="url(#pl-c)"><g${moving ? ' class="drift"' : ''}>${bands}</g></g>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${line}" stroke-width="1.1"/>`
  const style =
    (hop !== null ? `@keyframes hop{0%{transform:translateY(0)}35%{transform:translateY(-2px)}70%{transform:translateY(0.4px)}100%{transform:translateY(0)}}.hop{animation:hop ${MOTION.twinkleMs}ms ${EASE.spring} -${hop}ms both}` : '') +
    (moving
      ? `@keyframes drift{to{transform:translateX(${P}px)}}.drift{animation:drift ${DRIFT.ms}ms linear infinite}` +
        `@keyframes dash{to{stroke-dashoffset:${-DRIFT.dash}}}.dash{animation:dash ${DRIFT.dashMs}ms linear infinite}`
      : '')
  return (
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${M.w} ${M.h}" overflow="visible">` +
    `<g${hop !== null ? ' class="hop"' : ''}>${ring(false)}${disc}${ring(true)}</g>` +
    (style ? motionStyle(style) : '') +
    `</svg>`
  )
}

/** A chip on the compact band's top line: the stats' tile look at a smaller size. */
export const CHIP_LINE = { height: 22, fs: 12, labelFs: 11, icon: 13, lead: 7, baseline: 15.3 }

/**
 * A dim line of text that rolls to each new value like the band's figures (`reelText`): the
 * top line's elapsed clock. `minText` holds it as wide as that text from the start, so what
 * follows it never steps right as it grows.
 */
export const tickerSvg = (text: string, opts: { from?: Since<string> | string | null; minText?: string; color?: string } = {}) => {
  const C = CHIP_LINE
  const font = `${FIGURE_FONT} font-size="${C.fs}" fill="${opts.color ?? INK.label}"`
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
    `<text x="${numX}" y="16.3" font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" fill="#f6e3a1" textLength="${digitsW(n)}" lengthAdjust="spacingAndGlyphs">${n}</text>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<title>Tool calls this turn</title>` +
    `<rect width="${width}" height="${height}" rx="${height / 2}" fill="${bg}"/>` +
    iconGroup('bolt', '#ffd166', 9, 5.5, 13, 2.4) +
    numAt(num) +
    `<text x="${wordX}" y="16" font-family="Anthropic Sans,ui-sans-serif,system-ui,sans-serif" font-size="11" fill="#b8a96a" textLength="${wordW}" lengthAdjust="spacingAndGlyphs">${word}</text>` +
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

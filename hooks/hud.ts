// The band's HUD look, FOUNDRY: an industrial field terminal in orange on warm black. Chamfered
// panels with a signal header line, a left rail, segmented meters over a ruler, outlined index
// numerals and corner brackets. Pure builders like chat.ts (no engine calls), drawn from its
// colours so every picture still follows the app's theme (`themeStyle`).

import { EASE, HUE, INK, MASCOT, MOTION, glideStyle, labelWidth, mascotSvg, motionStyle, reelText, themeStyle } from './chat'
import type { Since } from './chat'
import { iconGroup } from './icons'
import type { IconName } from './icons'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The HUD's face: a condensed sans where the system has one, any sans where it has none. */
export const HUD_FAMILY = "Bahnschrift,'DIN Condensed','Roboto Condensed','Barlow Condensed','Arial Narrow',ui-sans-serif,system-ui,sans-serif"
const FACE = `font-family="${HUD_FAMILY}" style="font-stretch:condensed;font-variant-numeric:tabular-nums lining-nums"`
/** The microtext's face: technical captions, a monospace. */
const MONO = "ui-monospace,'JetBrains Mono','SF Mono',Consolas,monospace"

/**
 * A caption's width in px, as a condensed face sets it in capitals with `ls` px of tracking.
 * Captions are pinned to this width (`textLength`), so a system with no condensed face draws
 * them squeezed to it: the same narrow look, and never past its slab or cell.
 */
export const capWidth = (text: string, fs: number, ls = 0) =>
  Math.ceil(
    [...text].reduce((w, ch) => {
      const em = ch === ' ' ? 0.26 : /[.,:;·'|!ilI1/]/.test(ch) ? 0.3 : /[%MW≈—]/.test(ch) ? 0.72 : ch.charCodeAt(0) > 0x2000 ? 0.9 : 0.54
      return w + fs * em + ls
    }, 0),
  )

/** A caption: capitals, tracked, pinned to `capWidth`. `anchor` 'end' sets it to end at `x`. */
export const cap = (x: number, y: number, text: string, fs: number, fill: string, opts: { ls?: number; bold?: boolean; anchor?: 'end'; extra?: string } = {}) => {
  const t = text.toUpperCase()
  const w = capWidth(t, fs, opts.ls ?? 0)
  return `<text x="${opts.anchor === 'end' ? x - w : x}" y="${y}" ${FACE} font-size="${fs}"${opts.bold ? ' font-weight="700"' : ''} fill="${fill}" textLength="${w}" lengthAdjust="spacingAndGlyphs"${opts.extra ?? ''}>${esc(t)}</text>`
}

/** Microtext's width in px: a monospace at `fs` with `ls` px of tracking. */
const microWidth = (text: string, fs = 7, ls = 1) => +([...text].length * (fs * 0.6 + ls)).toFixed(1)
/** Microtext: a tiny technical caption in a monospace, tracked and pinned to `microWidth`. */
const micro = (x: number, y: number, text: string, fill: string, opts: { fs?: number; ls?: number; anchor?: 'end' | 'middle'; extra?: string } = {}) => {
  const fs = opts.fs ?? 7
  const w = microWidth(text, fs, opts.ls ?? 1)
  const at = opts.anchor === 'end' ? x - w : opts.anchor === 'middle' ? x - w / 2 : x
  return `<text x="${+at.toFixed(1)}" y="${y}" font-family="${MONO}" font-size="${fs}" fill="${fill}" textLength="${w}" lengthAdjust="spacingAndGlyphs"${opts.extra ?? ''}>${esc(text)}</text>`
}

/** The brand mark: a diamond (a square on its point), `size` px across, centred on (`cx`, `cy`). */
const diamond = (cx: number, cy: number, size: number, fill: string) => {
  const r = size / 2
  return `<path d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z" fill="${fill}"/>`
}

// A figure is not pinned to a width (it rolls, digit by digit), so its room is reckoned for a
// wide bold face: a system with no condensed face must not run it past its cell.
/**
 * A cell's measures: its padding, the header line (`tabH` tall, its caption `tabFs`), the figure,
 * the meters and the ruler under them, the line under those, and `cut`, the chamfer of its
 * top-right corner.
 */
export const CELL = { pad: 10, tabH: 14, tabFs: 10, fs: 22, valueY: 38, barsY: 45, barH: 5, barPitch: 10, namedPitch: 13, segs: 10, segGap: 2, subFs: 10, subLine: 14, ruleH: 8, bottom: 7, minWidth: 96, cut: 7 }
/**
 * A cell may be cut `SEAM` px from its right edge: nothing but the frame's lines crosses there
 * (the meters, their shares and the faint number end on it; the chamfer, the status squares and
 * the charge marks are past it), so a filler set in the cut widens the cell without redrawing it
 * (hudCellParts).
 */
export const SEAM = CELL.pad
/** The widest a filler is drawn, in px: a cell's, and a whole line's. The surface clips it to the room. */
export const FILL = { cell: 320, line: 2400 }

/** A panel's ground: a near-black card with a hairline, as a rectangle (a filler's, running on). */
const glass = (x: number, width: number, height: number) =>
  `<defs><filter id="glass-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity="0.10"/></filter></defs>` +
  `<rect class="glass" x="${x + 0.5}" y="0.5" width="${width - 1}" height="${height - 1}" fill="#000000" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.12"/>`

/** A panel's outline with its top-right corner cut `cut` px at 45°, on the half pixel. */
const chamfer = (width: number, height: number, cut: number = CELL.cut) => `M0.5 0.5H${width - cut - 0.5}L${width - 0.5} ${cut + 0.5}V${height - 0.5}H0.5Z`

/**
 * A panel's frame, FOUNDRY: the chamfered card; along its top-left a 2 px `accent` bar and down
 * its left edge the rail (`rail` px tall); the chamfer's own edge lit; three status squares under
 * it, in the last SEAM px; an L bracket in the bottom-left corner.
 */
const frame = (width: number, height: number, accent: string, rail: number = CELL.tabH) =>
  `<defs><filter id="glass-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity="0.10"/></filter></defs>` +
  `<path class="glass" d="${chamfer(width, height)}" fill="#000000" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.12"/>` +
  `<rect x="0" y="0" width="22" height="2" fill="${accent}"/>` +
  `<rect x="0" y="0" width="2" height="${Math.min(rail, height)}" fill="${accent}"/>` +
  `<path d="M${width - CELL.cut - 0.5} 0.5L${width - 0.5} ${CELL.cut + 0.5}" stroke="${accent}" stroke-width="1.4"/>` +
  [0, 1, 2].map(k => `<rect x="${width - 5.5}" y="${9 + k * 3.5}" width="2.5" height="2.5" fill="${k === 0 ? accent : INK.detail}"${k === 0 ? '' : ` fill-opacity="${k === 1 ? 0.7 : 0.4}"`}/>`).join('') +
  `<path d="M4.5 ${height - 10}V${height - 4.5}H10" fill="none" stroke="${INK.detail}" stroke-opacity="0.7"/>`

/**
 * A panel's header line: its index in `accent` and a slash, then its name in ink, both in tracked
 * condensed capitals, `NN / NAME`. The figure that was a white slab tab.
 */
const header = (label: string, accent: string, index?: string, x: number = CELL.pad, y = 11.5, fs: number = CELL.tabFs) => {
  const idx = index ? `${index} /` : ''
  const iw = idx ? capWidth(idx, fs, 1.2) + 5 : 0
  const lw = capWidth(label.toUpperCase(), fs, 1.2)
  return {
    width: x + iw + lw,
    svg: (idx ? cap(x, y, idx, fs, accent, { ls: 1.2, bold: true }) : '') + cap(x + iw, y, label, fs, INK.value, { ls: 1.2, bold: true }),
  }
}

/**
 * A ruler: a hairline `w` px long at `y`, a minor tick at each of `n` steps along it and a major
 * one every `major` (and at both ends), hanging down. Drawn in the dim inks.
 */
const ruler = (x: number, y: number, w: number, n: number, major = 5, opts: { minor?: number; long?: number } = {}) => {
  const f = (v: number) => +v.toFixed(2)
  const minorL = opts.minor ?? 1.6
  const longL = opts.long ?? 3.2
  let short = ''
  let long = ''
  for (let k = 0; k <= n; k++) {
    const tx = f(x + (k * w) / n)
    if (k % major === 0 || k === n) long += `M${tx} ${y}V${f(y + longL)}`
    else short += `M${tx} ${y}V${f(y + minorL)}`
  }
  return (
    `<path d="M${x} ${y}H${f(x + w)}" stroke="${INK.detail}" stroke-opacity="0.45" stroke-width="0.6"/>` +
    (short ? `<path d="${short}" stroke="${INK.detail}" stroke-opacity="0.55" stroke-width="0.6"/>` : '') +
    `<path d="${long}" stroke="${INK.label}" stroke-opacity="0.85" stroke-width="0.8"/>`
  )
}

/** A reading as a share of 0 to 1: nothing for no reading. */
const share = (p: number | null) => (p === null || !Number.isFinite(p) ? 0 : Math.max(0, Math.min(100, p)) / 100)
/** How much of `w` px a reading lights: any use at all shows, so a session that has begun never reads as empty. */
const litOf = (p: number | null, w: number) => +(share(p) > 0 ? Math.max(1.5, share(p) * w) : 0).toFixed(1)

/**
 * A segmented meter: `n` segments across `w` px, lit from the left to `percent` in `color` (a
 * segment can be part lit, so the reading is exact), the rest the track; the lit stretch's head,
 * about a segment, in `head` (amber unless given; `null` for none). `slant` leans the segments.
 * With `ruler` a tick ruler hangs under it, a minor tick a segment and a major one every five.
 * With `from` the lit stretch and its head glide there from that reading. `id` names its clips.
 */
export const blocksSvg = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  percent: number | null,
  color: string,
  opts: { n?: number; gap?: number; slant?: number; from?: Since<number> | number | null; head?: string | null; ruler?: boolean } = {},
) => {
  const gap = opts.gap ?? CELL.segGap
  const s = opts.slant ?? 0
  const n = Math.max(1, opts.n ?? CELL.segs)
  const bw = (w - s - gap * (n - 1)) / n
  const d = Array.from({ length: n }, (_, k) => {
    const bx = +(x + k * (bw + gap)).toFixed(2)
    return `M${bx + s} ${y}h${bw.toFixed(2)}l${-s} ${h}h${(-bw).toFixed(2)}z`
  }).join('')
  const lit = (p: number | null) => litOf(p, w)
  const head = opts.head === undefined ? HUE.amber : opts.head
  const hw = +(bw + gap / 2).toFixed(2)
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${lit(percent)}" height="${h}" class="${id}"/></clipPath>` +
    `<path d="${d}" fill="${INK.track}"/>` +
    `<path d="${d}" fill="${color}" clip-path="url(#${id})"/>` +
    // The head: a segment's width ending where the lit stretch ends, slid there (so it glides with it).
    (head && share(percent) > 0
      ? `<clipPath id="${id}h"><rect x="${+(x - hw).toFixed(2)}" y="${y}" width="${hw}" height="${h}" transform="translate(${lit(percent)} 0)" class="${id}h"/></clipPath>` +
        `<path d="${d}" fill="${head}" clip-path="url(#${id}h)"/>` +
        glideStyle(`${id}h`, 'transform', p => `translateX(${lit(p)}px)`, opts.from, percent ?? 0)
      : '') +
    // Half a px short of the meter's end: a tick on it would bleed past a seam set there.
    (opts.ruler ? ruler(x, y + h + 1.5, w - s - 0.5, n, 5) : '') +
    glideStyle(id, 'width', p => `${lit(p)}px`, opts.from, percent ?? 0)
  )
}

/** The speed at which each charge level starts, in tokens a second: signal from the first token, then amber, then ember. */
export const CHARGE_AT = [0, 100, 200]
/** A speed's charge level, 0 (none: no reading, or no speed) to 3: one more for each of CHARGE_AT it has reached. */
export const chargeLevel = (tps: number | null) => (tps === null || !Number.isFinite(tps) || tps <= 0 ? 0 : CHARGE_AT.filter(at => tps >= at).length)
/** Each level's colour, hotter as it climbs: signal up to 100 tok/s, amber up to 200, ember from 200. */
export const CHARGE_COLOR = ['', HUE.signal, HUE.amber, HUE.ember]

// A cheap deterministic hash in [0, 1): the same arc draws the same every time, so a redraw
// with nothing changed sends the same picture.
const jitter = (seed: number, k: number) => {
  let h = (seed * 374761393 + k * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Spots along a conduit, `per` to a width, from one width left of 0 to one right of it: each
 * `[x, j]`, `j` its place in the width, so a pattern drawn from `j` repeats every width and
 * sliding it one width shows no seam.
 */
const spots = (width: number, per: number) => {
  const n = Math.max(3, per)
  return Array.from({ length: 2 * n }, (_, i) => [((i - n) * width) / n, i % n] as const)
}

/** A short angled marker (two chevrons, `»`), `size` px tall, its top-left corner at (`x`, `y`). */
const marker = (x: number, y: number, size: number, color: string) =>
  `<path d="M0 0L4 6L0 12H2.6L6.6 6L2.6 0ZM4.6 0L8.6 6L4.6 12H7.2L11.2 6L7.2 0Z" transform="translate(${x} ${y}) scale(${(size / 12).toFixed(3)})" fill="${color}"/>`

/**
 * A charged cell's bands: the conduits run between `arcs` (just under the figure) and `bars`
 * (the top of the meter). `drop` is how far a charged cell's meters sit lower than a plain one's,
 * which is the room the conduits run in, clear of the figure.
 */
export const CHARGE_CUT = { head: 14, arcs: CELL.valueY + 1, bars: CELL.barsY + 11, foot: 3, drop: 11 }

/**
 * The charge a fast cell wears, by `level` (1 to 3), over a cell `width` by `height`: an
 * industrial power conduit, clean and angular, in layers:
 * - `still`: at 2, a lit chamfered frame and a corner bracket with hazard slashes.
 * - `head`: a chevron marker under the status squares (two at 3).
 * - `arcs`: just above the meter, a rail carrying data packets; at 2 a chevron stream running the
 *   other way along it; at 3 a hot scan pulse racing ahead, and a hazard-tick rail along the top edge.
 * - `foot`: at 3, a hazard-tick rail along the bottom edge.
 * With `motion` every line slides along itself for good (a loop, each at its own pace, faster the
 * higher the level); the band draws it still, as its cell is one picture redrawn with its figure,
 * and a loop in such a picture starts over at every redraw. Every line is drawn two widths long and repeats every width (`spots`).
 */
const chargeLayers = (level: number, width: number, height: number, motion: boolean) => {
  if (level < 1) return { still: '', head: '', arcs: '', foot: '', lines: '' }
  const color = CHARGE_COLOR[level]!
  // Each line's speed in px a second, faster the higher the level, turned into the time one width
  // takes. A pattern that repeats every few px must move well under half its step a frame (60 a
  // second), or the eye sees it strobe or run backwards: the ticks (a step of about 6 px) crawl,
  // the chevrons (about 9 px) walk, and only the pulse, once a width, may race.
  const loop = (pxPerSec: number) => Math.max(400, Math.round((width / pxPerSec) * 1000))
  const pace = loop([0, 60, 80, 100][level]!)
  let n = 0
  const f = (v: number) => +v.toFixed(1)
  // One line of the conduit in its own group: what it draws (`inner`), and its slide one width a
  // loop (`back`: the other way).
  const line = (inner: string, ms: number, back = false) => {
    const cls = `a${n++}`
    return (
      `<g class="${cls}" fill="none" stroke="${color}" stroke-linecap="butt" stroke-linejoin="miter">${inner}</g>` +
      (motion ? motionStyle(`@keyframes ${cls}{from{transform:translateX(${back ? width : 0}px)}to{transform:translateX(${back ? 0 : width}px)}}.${cls}{animation:${cls} ${ms}ms linear infinite}`) : '')
    )
  }
  const rail = (y: number) => `M${-width} ${y}L${width} ${y}`
  // Data packets on a rail: a thin rail, and blocks of different lengths along it, under a glow.
  const packets = (y: number, seed: number, ms: number) => {
    const unit = width / Math.max(3, Math.round(width / 14))
    let d = ''
    for (const [x, j] of spots(width, Math.round(width / unit))) {
      if (jitter(seed, j) > 0.72) continue
      const len = unit * (0.22 + 0.5 * jitter(seed, j + 100))
      d += `M${f(x)} ${y}L${f(x + len)} ${y}`
    }
    return line(
      `<path d="${rail(y)}" stroke-width="0.7" stroke-opacity="0.35" stroke-dasharray="1 2"/>` +
        `<path d="${d}" stroke-width="7" stroke-opacity="0.08"/>` +
        `<path d="${d}" stroke-width="2.4"/>` +
        `<path d="${d}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.6"/>`,
      ms,
    )
  }
  // A stream of chevrons pointing the way they run, every third one lit.
  const chevrons = (y: number, ms: number, back: boolean) => {
    const per = Math.max(3, Math.round(width / 9 / 3) * 3)
    const s = back ? -1 : 1
    let lit = ''
    let dim = ''
    for (const [x, j] of spots(width, per)) {
      const d = `M${f(x - s * 1.4)} ${f(y - 2.8)}L${f(x + s * 1.4)} ${y}L${f(x - s * 1.4)} ${f(y + 2.8)}`
      if (j % 3 === 0) lit += d
      else dim += d
    }
    return line(`<path d="${dim}" stroke-width="1.1" stroke-opacity="0.4"/><path d="${lit}" stroke-width="1.4"/>`, ms, back)
  }
  // A scan pulse: a hot white head with a tail fading behind it, once a width.
  const pulse = (y: number, seed: number, ms: number) => {
    const at = width * jitter(seed, 7)
    const seg = (from: number, to: number, w: number, o: number, white = false) =>
      `<path d="${[at - width, at].map(x => `M${f(x + from)} ${y}L${f(x + to)} ${y}`).join('')}" stroke-width="${w}" stroke-opacity="${o}"${white ? ' stroke="#ffffff"' : ''}/>`
    return line(seg(-46, 10, 7, 0.12) + seg(-44, -24, 1.2, 0.25) + seg(-24, -8, 2, 0.6) + seg(-8, 10, 3.2, 1) + seg(-4, 10, 1.6, 1, true), ms)
  }
  // A measuring rail along an edge: a thin line with ticks, every fourth one a hazard slash.
  const ticks = (y: number, up: number, ms: number, back = false) => {
    let short = ''
    let long = ''
    for (const [x, j] of spots(width, Math.max(4, Math.round(width / 24) * 4))) {
      if (j % 4 === 0) long += `M${f(x)} ${y}L${f(x + 2.4)} ${f(y + up * 2.4)}M${f(x + 2.4)} ${y}L${f(x + 4.8)} ${f(y + up * 2.4)}`
      else short += `M${f(x)} ${y}L${f(x)} ${f(y + up * 0.9)}`
    }
    return line(`<path d="${rail(y)}" stroke-width="0.8" stroke-opacity="0.45"/><path d="${short}" stroke-width="0.8" stroke-opacity="0.6"/><path d="${long}" stroke-width="1.3"/>`, ms, back)
  }
  // Midway between the figure and the meter; from 2 the packets and chevrons sit 2.6 px to either side of it.
  const arcY = f((CHARGE_CUT.arcs + 3.2 + CHARGE_CUT.bars - 0.5) / 2)
  // Drawn in this order, so each line keeps its class name.
  const top = level >= 3 ? ticks(1.2, 1, loop(24)) : ''
  // From 2 the packets ride a little high and the chevrons run under them, so the two never cross.
  const packY = level >= 2 ? f(arcY - 2.6) : arcY
  const arcs =
    packets(packY, level, pace) +
    (level >= 2 ? chevrons(f(arcY + 2.6), loop([0, 0, 70, 90][level]!), true) : '') +
    (level >= 3 ? pulse(packY, level + 40, loop(320)) : '')
  const foot = level >= 3 ? ticks(height - 1.2, -1, loop(24), true) : ''
  return {
    still:
      level >= 2
        ? `<path d="${chamfer(width, height)}" fill="none" stroke="${color}" stroke-opacity="0.65"/>` +
          // A corner bracket and three hazard slashes, in the last SEAM px, so a widened band keeps them in its corner.
          `<path d="M${width - 2} ${height - 15}l0 11l-7 0" fill="none" stroke="${color}" stroke-width="1.6"/>` +
          `<path d="M${width - 2} ${height - 21}L${width - 6} ${height - 17}M${width - 2} ${height - 25}L${width - 6} ${height - 21}M${width - 2} ${height - 29}L${width - 6} ${height - 25}" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity="0.85"/>`
        : '',
    // Under the status squares, in the last SEAM px.
    head: marker(width - 9.4, 21, 10, color) + (level >= 3 ? marker(width - 9.4, 32, 10, color) : ''),
    arcs: top + arcs,
    foot,
    // Every line, and nothing else: each is two widths long, so copies set two widths apart run on as one.
    lines: top + arcs + foot,
  }
}

export type HudBar = { label?: string; percent: number | null; color: string; from?: Since<number> | number | null }

/** A cell's height for what it holds, so a line of cells can share its tallest. */
export const cellHeight = (bars: number, sub: boolean, rule = false, named = false) =>
  CELL.barsY + bars * (named ? CELL.namedPitch : CELL.barPitch) + (sub ? CELL.subLine : 0) + (rule ? CELL.ruleH : 0) + CELL.bottom - (bars || sub || rule ? 0 : 3)

/** What a cell is given beyond its name and figure (hudCellSvg). */
export type CellOpts = {
  index?: string
  /** Where the faint number ends, in px from the cell's left edge, when past the cell's own seam: a line of cells stretched to one width sets it for all (hudCellParts). */
  indexEnd?: number
  width?: number
  height?: number
  sub?: string
  bars?: HudBar[]
  rule?: string
  tone?: string
  reel?: Since<string> | string | null
  toggle?: { on: boolean; enter?: number | null; motion?: boolean }
  /** A power conduit over the cell, by level 1 to 3 (`chargeLevel`); `motion` sets it running (loops). */
  charge?: { level: number; motion?: boolean }
}

/** A cell's measures and its drawing in layers, for hudCellSvg. */
const cellLayers = (label: string, value: string, opts: CellOpts) => {
  const C = CELL
  const bars = opts.bars ?? []
  const shown = value.toUpperCase()
  const mascotW = 34
  const x = C.pad + (opts.toggle ? mascotW + 8 : 0)
  // A mode's name is a word, not a figure: a size down, so the cell is no wider than a figure's.
  const fs = opts.toggle ? 17 : C.fs
  const level = Math.round(opts.charge?.level ?? 0)
  const accent = level > 0 ? CHARGE_COLOR[level]! : (opts.tone ?? HUE.signal)
  const head = header(label, accent, opts.index)
  const labelled = bars.some(b => b.label)
  const nameW = labelled ? Math.max(...bars.map(b => capWidth((b.label ?? '').toUpperCase(), 9, 1))) + 6 : 0
  const pctW = labelled ? capWidth('100%', 10) + 6 : 0
  const subW = opts.sub ? capWidth(opts.sub.toUpperCase(), C.subFs, 0.8) : 0
  const natural = Math.max(C.minWidth, Math.ceil(Math.max(x + Math.ceil(labelWidth(shown, fs) * 1.12) + 14, head.width + 6 + SEAM, x + subW + SEAM, C.pad + nameW + 60 + pctW + C.pad)))
  const width = Math.max(natural, Math.round(opts.width ?? 0))
  const pitch = labelled ? C.namedPitch : C.barPitch
  // A charged cell's meters sit `drop` lower (the arcs run in the room), so it is that much taller.
  const height = Math.max(cellHeight(bars.length, opts.sub !== undefined, opts.rule !== undefined, labelled) + (level > 0 ? CHARGE_CUT.drop : 0), Math.round(opts.height ?? 0))
  const id = `b${opts.index ?? ''}`
  const barX = C.pad + nameW
  const barW = width - 2 * C.pad - nameW - pctW
  const barArt = bars
    .map((b, i) => {
      const y = C.barsY + i * pitch + (labelled ? 3 : 0)
      const pct = b.percent === null || !Number.isFinite(b.percent) ? '—' : `${Math.round(b.percent)}%`
      return (
        (b.label ? cap(C.pad, y + C.barH + 0.6, b.label, 9, INK.label, { ls: 1 }) + cap(width - C.pad, y + C.barH + 0.8, pct, 10, INK.value, { anchor: 'end' }) : '') +
        // The ruler hangs under the last meter only.
        blocksSvg(`${id}-${i}`, barX, y, barW, C.barH, b.percent, b.color, { from: b.from, ruler: i === bars.length - 1 })
      )
    })
    .join('')
  const subY = (opts.toggle ? C.valueY - 4 : C.barsY + bars.length * pitch) + (bars.length ? 10 : 13)
  const charge = chargeLayers(level, width, height, opts.charge?.motion === true)
  // The cell in layers: what never changes while its name, size and charge hold; the figure;
  // the meters and the line under them.
  const indexArt = opts.index
    ? `<text x="${Math.max(width - SEAM, Math.round(opts.indexEnd ?? 0))}" y="${height + 4}" text-anchor="end" ${FACE} font-size="44" font-weight="700" fill="none" stroke="${INK.value}" stroke-opacity="0.13" stroke-width="0.8">${esc(opts.index)}</text>`
    : ''
  const base =
    frame(width, height, accent, level > 0 ? height : C.tabH) +
    indexArt +
    head.svg +
    charge.still
  const figure =
    (opts.toggle ? mascotSvg(opts.toggle.on, C.pad, C.valueY - 2 - (mascotW * MASCOT.h) / MASCOT.w / 2 - 4, mascotW, { enter: opts.toggle.enter ?? null, motion: opts.toggle.motion === true }) : '') +
    reelText(x, opts.toggle ? C.valueY - 4 : C.valueY, fs, `${FACE} font-size="${fs}" font-weight="700" letter-spacing="0.4" fill="${level >= 3 ? CHARGE_COLOR[3] : INK.value}"`, shown, opts.reel)
  const lower = level > 0 ? CHARGE_CUT.drop : 0
  // A figure with no meter: a short bar in its colour, then a dim ruler of ticks to the seam.
  const ruleArt = opts.rule
    ? `<rect x="${C.pad}" y="${C.barsY}" width="22" height="2" fill="${opts.rule}"/>` +
      (() => {
        const rx = C.pad + 26
        const rw = width - SEAM - rx - 1
        const n = Math.max(1, Math.floor(rw / 4))
        return rw > 8 ? ruler(rx, C.barsY + 1, +((n * 4).toFixed(0)), n, 5, { minor: 1.6, long: 3.6 }) : ''
      })()
    : ''
  const meters =
    (lower ? `<g transform="translate(0 ${lower})">` : '') +
    barArt +
    ruleArt +
    (opts.sub ? cap(x, subY, opts.sub, C.subFs, opts.tone ?? INK.detail, { ls: 0.8 }) : '') +
    (lower ? '</g>' : '')
  return { width, height, natural, level, base, figure, meters, charge, indexArt }
}

/** The cell's svg document, `h` px tall from `y`. */
const strip = (width: number, y: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y} ${width} ${h}" width="${width}" height="${h}">${inner}${themeStyle(inner)}</svg>`

/**
 * One stat of the band as a HUD cell, FOUNDRY: a chamfered panel whose header line reads
 * `NN / NAME` (its index in signal, after a signal tick bar, over a left rail), the figure large
 * under it, then its meters (segmented, an amber head, a ruler under the last; with a `label`,
 * that name before it and its share after), then `sub`, a dim line. `rule` draws a short accent
 * bar and a dim ruler under a figure that has no meter. `index` is also the outlined number in
 * the corner. With `toggle` the mascot sits before the figure (the Hanahira mode) and `tone`
 * colours the header, the rail and `sub`. `charge` lays a power conduit over it. `width` and
 * `height` only ever grow the cell, to its column and its line.
 */
export const hudCellSvg = (label: string, value: string, opts: CellOpts = {}) => {
  const c = cellLayers(label, value, opts)
  const svg = strip(c.width, 0, c.height, c.base + c.figure + c.meters + c.charge.head + c.charge.arcs + c.charge.foot)
  return { svg, width: c.width, height: c.height, natural: c.natural }
}

/**
 * A picture of `w` px from `x` of a drawing `h` tall: one piece of a cell cut at its seam.
 * `slice`: a surface that fits a picture into a narrower box keeps its height and crops its
 * right end, where the default would shrink the whole drawing into the box (stripeSvg too).
 */
const slice = (x: number, w: number, h: number, inner: string, y = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMinYMid slice">${x || y ? `<g transform="translate(${-x} ${-y})">${inner}</g>` : inner}${themeStyle(inner)}</svg>`

/** A drawing `width` wide cut at `seam`, with `fill` (drawn from x = 0, `fillW` wide) to set in the cut. */
const stretchParts = (inner: string, fill: string, fillW: number, width: number, height: number, seam: number) => ({
  left: { svg: slice(0, seam, height, inner), width: seam },
  fill: { svg: slice(0, fillW, height, fill), width: fillW },
  right: { svg: slice(seam, width - seam, height, inner), width: width - seam },
  width,
  height,
})

/**
 * hudCellSvg in three pictures, for a band whose width in px is not known: `left` and `right`
 * are the cell cut at its seam, and `fill` is the frame running on (a charged cell's arcs too),
 * drawn `FILL.cell` wide. The band sets `fill` between them in a box that takes the room its
 * line has left and clips the rest, so the cell is exactly as wide as the surface gives it.
 * With `indexEnd` past the seam, `even` is a filler exactly that much wide, to set before `fill`.
 */
export const hudCellParts = (label: string, value: string, opts: CellOpts = {}) => {
  const c = cellLayers(label, value, opts)
  const seam = c.width - SEAM
  // What the cell is short of `indexEnd`: the frame running on from the seam, with the rest of
  // the faint number, so the number sits at one place in every cell of an evened line.
  const short = Math.min(FILL.cell, Math.round(opts.indexEnd ?? 0) - seam)
  // The frame running on from `lead` px past the seam. Each arc is two widths long (arcPath), so
  // its copies sit two widths apart: closer, they would lie on each other and glow twice as bright.
  // Drawn `w` wide: only the copies that width shows, and their CSS once.
  const fillFrom = (lead: number, w: number) =>
    glass(-40, w + 80, c.height) +
    (c.level > 0
      ? (c.level >= 2 ? `<path d="M-40 0.5H${w + 40}M-40 ${c.height - 0.5}H${w + 40}" fill="none" stroke="${CHARGE_COLOR[c.level]}" stroke-opacity="0.65"/>` : '') +
        (Array.from({ length: Math.max(1, Math.ceil((w + seam + lead - c.width) / (2 * c.width)) + 1) }, (_, i) => `<g transform="translate(${i * 2 * c.width - seam - lead} 0)">${c.charge.lines}</g>`).join(''))
      : '')
  const rest = c.figure + c.meters + c.charge.head
  const arcs = c.charge.arcs + c.charge.foot
  const bare = c.indexArt ? c.base.replace(c.indexArt, '') : c.base
  const index = `<g transform="translate(${-seam} 0)">${c.indexArt}</g>`
  // The cell's four pictures, each the whole cell's height.
  const h = c.height
  return {
    left: { svg: slice(0, seam, h, c.base + rest + arcs), width: seam },
    // The filler after `even` goes on from where `even` ends, so its lines run on unbroken.
    fill: { svg: slice(0, FILL.cell, h, fillFrom(Math.max(0, short), FILL.cell)), width: FILL.cell },
    // The right end without the number (one that runs past the seam goes on in `even`) and
    // without the lines: it follows a filler cut at any width, where no line could meet its own.
    // Only what lies in the last SEAM px: the frame, its corner and the charge's marker. The figure
    // and the meters end before the seam, so a new figure leaves this piece as it was (no reload).
    right: { svg: slice(seam, SEAM, h, bare + c.charge.head), width: SEAM },
    even: short > 0 ? { svg: slice(0, short, h, fillFrom(0, short) + index), width: short } : null,
    width: c.width,
    height: c.height,
    natural: c.natural,
  }
}

/**
 * The context line's measures: its height, the figure (`fs` at `baseline`), the header line
 * (`headY`), the meter (`barH` tall from `barY`, a segment every `pitch` px, at least `minBar`
 * long) with its pointer and ruler, the gaps, and a stacked meter's room under the line.
 */
export const HUD_CONTEXT = { height: 44, fs: 24, baseline: 38, headY: 11.5, barY: 19, barH: 8, slant: 0, pitch: 6, minBar: 150, gap: 14, stackGap: 6, stackH: 32 }

/**
 * The context line as the band's hero gauge, its whole width: the header `CTX / CONTEXT` over the
 * big figure; a long segmented meter that takes the room, an amber head and a ▼ pointer over it,
 * a ruler under it (a major tick every 10%, labelled 0 to 100 where there is room); the words at
 * the right. With `stack` the meter goes under, for a band too narrow for one line. The figure
 * takes the meter's colour when `warn`.
 */
const contextLayers = (
  percent: number | null,
  color: string,
  opts: { left?: string | null; window?: string | null; stack?: boolean; width?: number; warn?: boolean; from?: Since<string> | string | null; fromPercent?: Since<number> | number | null } = {},
) => {
  const X = HUD_CONTEXT
  const value = percent === null || !Number.isFinite(percent) ? '—' : `${Math.round(percent)}%`
  const head = header('context', HUE.signal, 'CTX')
  const valueW = Math.max(labelWidth('100%', X.fs), head.width - CELL.pad)
  const words = [opts.left, opts.window].filter(Boolean).join(' · ')
  const wordsW = words ? capWidth(words.toUpperCase(), 10, 1) : 0
  const end = CELL.pad + 6
  const lineNatural = CELL.pad + valueW + X.gap + X.minBar + (words ? X.gap + wordsW : 0) + end
  const natural = Math.ceil(opts.stack ? Math.max(CELL.pad + valueW + (words ? X.gap + wordsW : 0) + end, CELL.pad + X.minBar + end) : lineNatural)
  const width = Math.max(natural, Math.round(opts.width ?? 0))
  const height = opts.stack ? X.height + X.stackH : X.height
  // Where the line may be cut: after the meter and before the words; stacked, after both. The
  // meter, its pointer and its ruler end 4 px short of it.
  const seam = Math.round(opts.stack || !words ? width - end : width - end - wordsW - X.gap / 2)
  const barX = opts.stack ? CELL.pad : CELL.pad + valueW + X.gap
  const barW = seam - 4 - barX
  const barY = opts.stack ? X.height + 4 : X.barY
  // Segments in tens, so a major tick falls between two of them.
  const n = Math.max(10, Math.floor(barW / X.pitch / 10) * 10)
  const lit = litOf(percent, barW)
  const pointer = opts.warn ? color : HUE.amber
  const rulerY = barY + X.barH + 1.5
  const labelled = barW / 10 >= 20
  const labels = labelled
    ? Array.from({ length: 11 }, (_, k) => micro(+(barX + (k * barW) / 10).toFixed(1), rulerY + 10, String(k * 10), INK.detail, { fs: 6.5, ls: 0.4, anchor: k === 0 ? undefined : k === 10 ? 'end' : 'middle' })).join('')
    : ''
  const inner =
    frame(width, height, HUE.signal, opts.stack ? X.height : height) +
    head.svg +
    reelText(CELL.pad, X.baseline, X.fs, `${FACE} font-size="${X.fs}" font-weight="700" fill="${opts.warn ? color : INK.value}"`, value, opts.from) +
    blocksSvg('ctx', barX, barY, barW, X.barH, percent, color, { n, gap: 2, slant: X.slant, from: opts.fromPercent }) +
    ruler(barX, rulerY, barW, 50, 5, { minor: 1.8, long: 3.8 }) +
    labels +
    // The pointer over the lit stretch's head, slid there (so it glides with the meter).
    (share(percent) > 0
      ? `<g class="ctxp" transform="translate(${lit} 0)"><path d="M${barX - 3.5} ${barY - 6.5}h7l-3.5 4.5z" fill="${pointer}"/></g>` +
        glideStyle('ctxp', 'transform', p => `translateX(${litOf(p, barW)}px)`, opts.fromPercent, percent ?? 0)
      : '') +
    (words ? cap(width - end, opts.stack ? X.baseline - 1 : X.barY + X.barH - 0.5, words, 10, INK.label, { ls: 1, anchor: 'end' }) : '')
  return { inner, width, height, natural, seam }
}

type ContextOpts = Parameters<typeof contextLayers>[2]

export const hudContextSvg = (percent: number | null, color: string, opts: ContextOpts = {}) => {
  const c = contextLayers(percent, color, opts)
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}" width="${c.width}" height="${c.height}">${c.inner}${themeStyle(c.inner)}</svg>`, width: c.width, height: c.height, natural: c.natural }
}

/** hudContextSvg in three pictures (see hudCellParts): the meter stays, the words keep the right end. */
export const hudContextParts = (percent: number | null, color: string, opts: ContextOpts = {}) => {
  const c = contextLayers(percent, color, opts)
  return { ...stretchParts(c.inner, glass(-40, FILL.line + 80, c.height), FILL.line, c.width, c.height, c.seam), natural: c.natural }
}

/** A chip of the top line: its height, its text, its chamfer (`lean`) and the room inside its ends. */
export const HUD_CHIP = { height: 20, fs: 11, lean: 5, pad: 9, baseline: 14 }

/** A chip's outline: its top-right and bottom-left corners cut `c` px at 45°, on the half pixel. */
const chipShape = (width: number, h: number, c: number = HUD_CHIP.lean) => `M0.5 0.5H${width - c - 0.5}L${width - 0.5} ${c + 0.5}V${h - 0.5}H${c + 0.5}L0.5 ${h - c - 0.5}Z`
/** An outline chip's corner ticks: short L marks on its two square corners. */
const cornerTicks = (width: number, h: number, color: string) =>
  `<path d="M0.5 4.5V0.5H4.5M${width - 4.5} ${h - 0.5}H${width - 0.5}V${h - 4.5}" fill="none" stroke="${color}" stroke-width="1.2"/>`

/**
 * The branch as an outline chip on the band's top line, after the session's plate: a chamfered
 * hairline box with amber corner ticks, `BR` in microtext, then `// name`, the slashes in amber
 * and the name in ink. The name keeps its own case: branch names are case-sensitive.
 */
export const branchChipSvg = (branch: string) => {
  const H = HUD_CHIP
  const h = H.height
  const fs = H.fs + 1
  const textW = labelWidth(`// ${branch}`, fs)
  const pad = 7
  const brW = microWidth('BR', 7, 1)
  const width = Math.ceil(H.lean + pad + brW + 6 + textW + pad + H.lean)
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
      `<path d="${chipShape(width, h)}" fill="${HUE.amber}" fill-opacity="0.06" stroke="${INK.detail}" stroke-opacity="0.75"/>` +
      cornerTicks(width, h, HUE.amber) +
      micro(H.lean + pad, H.baseline - 1, 'BR', INK.detail) +
      `<text x="${H.lean + pad + brW + 6}" y="${H.baseline}" ${FACE} font-size="${fs}" font-weight="700" fill="${INK.value}" textLength="${textW}" lengthAdjust="spacingAndGlyphs"><tspan fill="${HUE.amber}">//</tspan> ${esc(branch)}</text>` +
      `</svg>`,
    width,
    height: h,
  }
}

/**
 * A chip for the top line, chamfered at two corners: `fill` paints it solid in `color` with dark
 * text and a square mark (a state: working, success, error); otherwise a hairline outline with
 * corner ticks, or with `plain` no shape at all. `icon` stands before the label, or in its place
 * where the label is empty (the clock). `value` follows the label in ink and rolls to each new
 * one. `pad` sets the room inside its ends (HUD_CHIP.pad unless given). `minWidth` holds it as
 * wide as another state's. With `motion` it comes in once and its mark blinks (a loop: its
 * source holds while it works).
 */
export const hudChipSvg = (opts: { label: string; color: string; icon?: IconName; pad?: number; value?: string; fill?: boolean; plain?: boolean; minWidth?: number; motion?: boolean; reel?: Since<string> | string | null }) => {
  const H = HUD_CHIP
  const h = H.height
  const pad = opts.pad ?? H.pad
  const label = opts.label.toUpperCase()
  const mark = opts.fill ? 9 : 0
  const iconX = H.lean + pad + mark
  const iconW = opts.icon ? 12 + (label ? 5 : 0) : 0
  const x = iconX + iconW
  const labelW = label ? capWidth(label, H.fs, 1.2) : 0
  const valueW = opts.value ? 5 + labelWidth(opts.value, H.fs + 1) : 0
  const natural = Math.ceil(x + labelW + valueW + pad + H.lean)
  const width = Math.max(natural, Math.round(opts.minWidth ?? 0))
  const ink = opts.fill ? HUE.card : opts.plain ? INK.detail : INK.label
  const shape = opts.plain
    ? ''
    : `<path d="${chipShape(width, h)}" ` +
      (opts.fill ? `fill="${opts.color}"/>` : `fill="none" stroke="${INK.detail}" stroke-opacity="0.75"/>` + cornerTicks(width, h, INK.label))
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    (opts.motion ? '<g class="chip">' : '') +
    shape +
    (mark ? `<rect x="${H.lean + pad - 1}" y="${h / 2 - 2.5}" width="5" height="5" fill="${HUE.card}"${opts.motion ? ' class="mk"' : ''}/>` : '') +
    (opts.icon ? iconGroup(opts.icon, ink, iconX, h / 2 - 6, 12) : '') +
    (label ? cap(x, H.baseline, label, H.fs, ink, { ls: 1.2, bold: opts.fill === true }) : '') +
    (opts.value ? reelText(x + labelW + 5, H.baseline + 0.3, H.fs + 1, `${FACE} font-size="${H.fs + 1}" font-weight="700" fill="${INK.value}"`, opts.value, opts.reel) : '') +
    (opts.motion ? '</g>' : '') +
    (opts.motion
      ? motionStyle(
          `@keyframes chip-in{from{opacity:0;transform:scale(.88)}}.chip{transform-origin:${width / 2}px ${h / 2}px;animation:chip-in ${MOTION.chipInMs}ms ${EASE.out} both}` +
            `@keyframes mk{50%{opacity:.25}}.mk{animation:mk ${MOTION.dotsMs}ms ${EASE.inOut} infinite}`,
        )
      : '') +
    `</svg>`
  return { svg, width, height: h, natural }
}

/** The session plate's measures: its height, text, the chamfer of its right end, its padding and its hazard tail. */
export const SLAB = { height: 22, fs: 13, lean: 6, pad: 10, mark: 7, tailGap: 3, tail: 26, pitch: 6 }

/**
 * The session's name on a solid signal plate, its text knocked out dark after a ◆, the plate's
 * right end chamfered; a short amber hazard-stripe tail after it. The top line's first word.
 */
export const slabSvg = (text: string) => {
  const S = SLAB
  const w = capWidth(text.toUpperCase(), S.fs, 1)
  const plate = S.pad + S.mark + 6 + w + S.pad + S.lean
  const tx = plate + S.tailGap
  const width = tx + S.tail
  const h = S.height
  const lean = +(h * 0.6).toFixed(1)
  const stripes = Array.from({ length: Math.ceil(S.tail / S.pitch) + 3 }, (_, k) => `M${tx + (k - 1) * S.pitch + lean} 0h${S.pitch / 2}l${-lean} ${h}h${-S.pitch / 2}z`).join('')
  const tailShape = `M${tx} 0H${width - S.lean}L${width} ${S.lean}V${h}H${tx}Z`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    `<path d="M0 0H${plate - S.lean}L${plate} ${S.lean}V${h}H0z" fill="${HUE.signal}"/>` +
    diamond(S.pad + S.mark / 2, h / 2, S.mark, HUE.card) +
    cap(S.pad + S.mark + 6, 15.6, text, S.fs, HUE.card, { ls: 1, bold: true }) +
    `<clipPath id="tail"><path d="${tailShape}"/></clipPath>` +
    `<path d="${tailShape}" fill="${HUE.card}"/>` +
    `<path d="${stripes}" fill="${HUE.amber}" clip-path="url(#tail)"/>` +
    `</svg>`
  return { svg, width, height: h }
}

/** The loading bar's stripes: each one's width along the bar, the gap before the next, and one pitch's run in ms. */
export const STRIPE = { on: 5, off: 5, ms: 700 }

/**
 * The loading bar as hazard stripes on a dark track between two hairline rails, the whole width:
 * `color` while `live`, else dim stripes in `rest` (the track's grey unless given). With `motion`
 * (and `live`) the stripes run to the right, one stripe's pitch a loop; the picture's source
 * never changes, so the loop runs on.
 */
export const stripeSvg = (width: number, height: number, color: string, opts: { live?: boolean; padBottom?: number; motion?: boolean; rest?: string } = {}) => {
  const w = Math.max(120, Math.round(width))
  const h = height
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  const pitch = STRIPE.on + STRIPE.off
  const inset = h >= 6 ? 2 : 0
  const sh = h - 2 * inset
  const lean = +(sh * 0.7).toFixed(1)
  // One stripe in a tile one pitch wide, repeated by a pattern: a few hundred bytes however wide
  // the bar is drawn (the band sends it on every redraw). The filled run starts a pitch to the
  // left, so the slide to the right never opens a gap there.
  const tile = `M${lean} ${inset}h${STRIPE.on}l${-lean} ${sh}h${-STRIPE.on}z`
  const pat = (id: string, fill: string, extra = '') =>
    `<pattern id="${id}" patternUnits="userSpaceOnUse" x="0" y="0" width="${pitch}" height="${h}"><path d="${tile}" fill="${fill}"${extra}/></pattern>`
  const run = (id: string, extra = '') => `<rect x="${-pitch}" y="0" width="${w + 2 * pitch}" height="${h}" fill="url(#${id})"${extra}/>`
  const moving = opts.live === true && opts.motion === true
  const ink = opts.live ? color : (opts.rest ?? INK.track)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + pad}" width="${w}" height="${h + pad}" preserveAspectRatio="xMinYMid slice">` +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="#000000" fill-opacity="0.35"/>` +
    `<defs>${pat('st-p', ink, opts.live ? '' : ' fill-opacity="0.8"')}</defs>` +
    `<g${moving ? ' class="run"' : ''}>` +
    run('st-p') +
    `</g>` +
    (inset
      ? `<path d="M0 0.5H${w}M0 ${h - 0.5}H${w}" stroke="${opts.live ? color : INK.detail}" stroke-opacity="${opts.live ? 0.7 : 0.35}"/>`
      : '') +
    (moving
      ? motionStyle(`@keyframes run{to{transform:translateX(${pitch}px)}}.run{animation:run ${STRIPE.ms}ms linear infinite}`)
      : '') +
    `</svg>`
  )
}

/**
 * The telemetry rail's measures: its height, a tick every `step` px (a major one every fifth),
 * the pattern repeating every `period` px, scrolling `pxPerSec` while live, and its caption's size.
 */
export const TELEMETRY = { height: 12, step: 6, period: 240, pxPerSec: 20, fs: 7 }

/**
 * A full-width decorative telemetry rail for the band's bottom edge, drawn `width` px wide and
 * sliced (the band clips it to its room): a hairline, a ruler of ticks hanging from it (a major
 * one every fifth), a ◆ and microtext (`text`) at the left, and sparse lit signal packets like
 * data in flight. `live` with `motion`: the ruler and packets scroll left at a calm pace (one
 * repeat a loop, so the loop has no seam; well under half a tick a frame). At rest it is still and dimmer. The same inputs draw the same picture.
 */
export const telemetrySvg = (width: number, height: number = TELEMETRY.height, opts: { live?: boolean; motion?: boolean; text?: string } = {}) => {
  const T = TELEMETRY
  const w = Math.max(120, Math.round(width))
  const h = Math.max(8, Math.round(height))
  const live = opts.live === true
  const moving = live && opts.motion === true
  const f = (v: number) => +v.toFixed(2)
  const text = (opts.text ?? '').toUpperCase()
  const textX = 14
  const textW = text ? microWidth(text, T.fs, 1.2) : 0
  const from = text ? Math.ceil(textX + textW + 10) : 14
  const P = T.period
  // One period of the ruler and packets, in a tile a pattern repeats across the width (and one
  // period more for the slide): the band sends this picture on every redraw, so it stays small.
  let minor = ''
  let major = ''
  let packets = ''
  const steps = P / T.step
  for (let k = 0; k < steps; k++) {
    const x = k * T.step + 0.5
    if (k % 5 === 0) major += `M${x} 0.5V${f(h * 0.42)}`
    else minor += `M${x} 0.5V${f(h * 0.22)}`
  }
  for (let k = 0; k < steps; k++) {
    if (jitter(17, k) > 0.16) continue
    const x = k * T.step + 1.5
    const len = T.step * (1 + Math.floor(jitter(29, k) * 3)) - 2
    packets += `M${x} ${f(h - 3.5)}h${len}v2h${-len}z`
  }
  const dim = live ? 1 : 0.55
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMinYMid slice">` +
    `<defs><clipPath id="tl-c"><rect x="${from}" y="0" width="${w - from}" height="${h}"/></clipPath>` +
    `</defs>` +
    `<path d="M0 0.5H${w}" stroke="${INK.detail}" stroke-opacity="${0.5 * dim}"/>` +
    `<path d="M0 ${f(h - 0.5)}H${w}" stroke="${INK.detail}" stroke-opacity="${0.18 * dim}"/>` +
    diamond(6, h / 2 + 0.5, 6, live ? HUE.signal : INK.detail) +
    (text ? micro(textX, f(h / 2 + 3), text, INK.label, { fs: T.fs, ls: 1.2, extra: live ? '' : ' fill-opacity="0.75"' }) : '') +
    `<defs><pattern id="tl-p" patternUnits="userSpaceOnUse" x="${from - 0.5}" y="0" width="${P}" height="${h}">` +
    `<path d="${minor}" stroke="${INK.detail}" stroke-opacity="${0.55 * dim}" stroke-width="0.7"/>` +
    `<path d="${major}" stroke="${INK.label}" stroke-opacity="${0.8 * dim}" stroke-width="0.9"/>` +
    `<path d="${packets}" fill="${HUE.signal}" fill-opacity="${live ? 0.9 : 0.35}"/>` +
    `</pattern></defs>` +
    `<g clip-path="url(#tl-c)"><g${moving ? ' class="tl"' : ''}>` +
    `<rect x="${from}" y="0" width="${w - from + P}" height="${h}" fill="url(#tl-p)"/>` +
    `</g>` +
    `</g>` +
    (moving
      ? motionStyle(
          `@keyframes tl{to{transform:translateX(${-P}px)}}.tl{animation:tl ${Math.round((P / T.pxPerSec) * 1000)}ms linear infinite}`,
        )
      : '') +
    `</svg>`
  return svg
}

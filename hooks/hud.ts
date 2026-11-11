// The band's HUD look: sharp cells with a slab label, a large figure and block meters, in white
// on near-black with one accent. Pure builders like chat.ts (no engine calls), drawn from its
// colours so every picture still follows the app's theme (`themeStyle`).

import { EASE, HUE, INK, MASCOT, MOTION, glideStyle, labelWidth, mascotSvg, motionStyle, reelText, themeStyle } from './chat'
import type { Since } from './chat'
import { iconGroup } from './icons'
import type { IconName } from './icons'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The HUD's face: a condensed sans where the system has one, any sans where it has none. */
export const HUD_FAMILY = "Bahnschrift,'DIN Condensed','Roboto Condensed','Barlow Condensed','Arial Narrow',ui-sans-serif,system-ui,sans-serif"
const FACE = `font-family="${HUD_FAMILY}" style="font-stretch:condensed;font-variant-numeric:tabular-nums lining-nums"`

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
const cap = (x: number, y: number, text: string, fs: number, fill: string, opts: { ls?: number; bold?: boolean; anchor?: 'end'; extra?: string } = {}) => {
  const t = text.toUpperCase()
  const w = capWidth(t, fs, opts.ls ?? 0)
  return `<text x="${opts.anchor === 'end' ? x - w : x}" y="${y}" ${FACE} font-size="${fs}"${opts.bold ? ' font-weight="700"' : ''} fill="${fill}" textLength="${w}" lengthAdjust="spacingAndGlyphs"${opts.extra ?? ''}>${esc(t)}</text>`
}

// A figure is not pinned to a width (it rolls, digit by digit), so its room is reckoned for a
// wide bold face: a system with no condensed one must not run it past its cell.
/** A cell's measures: its padding, the slab label, the figure, the meters and the line under them. */
export const CELL = { pad: 10, tabH: 14, tabFs: 10, fs: 22, valueY: 38, barsY: 45, barH: 4, barPitch: 9, namedPitch: 13, segs: 10, segGap: 2, subFs: 10, subLine: 14, ruleH: 8, bottom: 7, minWidth: 96 }
/**
 * A cell may be cut `SEAM` px from its right edge: nothing but the frame's lines crosses there
 * (the meters, their shares and the faint number end on it; the corner mark is past it), so a
 * filler set in the cut widens the cell without redrawing it (hudCellParts).
 */
export const SEAM = CELL.pad
/** The widest a filler is drawn, in px: a cell's, and a whole line's. The surface clips it to the room. */
export const FILL = { cell: 320, line: 2400 }

/** The cell's ground: a sharp near-black card with a hairline, and a `+` in two corners. */
const glass = (x: number, width: number, height: number) =>
  `<defs><filter id="glass-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity="0.10"/></filter></defs>` +
  `<rect class="glass" x="${x + 0.5}" y="0.5" width="${width - 1}" height="${height - 1}" fill="#000000" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.12"/>`
const frame = (width: number, height: number, low = true) =>
  glass(0, width, height) +
  `<path d="M${width - 10} 6.5h5M${width - 7.5} 4v5${low ? `M5 ${height - 6.5}h5M7.5 ${height - 9}v5` : ''}" stroke="${INK.detail}" stroke-opacity="0.7" fill="none"/>`

/** A slab label at the cell's top-left corner: solid, its text knocked out dark, its end cut on a slant. */
const tab = (label: string, fill: string, h: number = CELL.tabH, y = 0) => {
  const w = capWidth(label.toUpperCase(), CELL.tabFs, 1.4)
  const tw = 6 + w + 11
  return { width: tw, svg: `<path d="M0 ${y}H${tw}L${tw - 6} ${y + h}H0z" fill="${fill}"/>` + cap(6, y + h / 2 + 3.6, label, CELL.tabFs, HUE.card, { ls: 1.4, bold: true }) }
}

/**
 * A block meter: `n` blocks across `w` px, lit from the left to `percent` in `color` (a block
 * can be part lit, so the reading is exact), the rest the track. `slant` leans the blocks.
 * With `from` the lit stretch glides there from that reading. `id` names its clip in the picture.
 */
export const blocksSvg = (id: string, x: number, y: number, w: number, h: number, percent: number | null, color: string, opts: { n?: number; gap?: number; slant?: number; from?: Since<number> | number | null } = {}) => {
  const gap = opts.gap ?? CELL.segGap
  const s = opts.slant ?? 0
  const n = Math.max(1, opts.n ?? CELL.segs)
  const bw = (w - s - gap * (n - 1)) / n
  const d = Array.from({ length: n }, (_, k) => {
    const bx = +(x + k * (bw + gap)).toFixed(2)
    return `M${bx + s} ${y}h${bw.toFixed(2)}l${-s} ${h}h${(-bw).toFixed(2)}z`
  }).join('')
  const share = (p: number | null) => (p === null || !Number.isFinite(p) ? 0 : Math.max(0, Math.min(100, p)) / 100)
  // Any use at all shows: a session that has begun never reads as empty.
  const lit = (p: number | null) => +(share(p) > 0 ? Math.max(1.5, share(p) * w) : 0).toFixed(1)
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${lit(percent)}" height="${h}" class="${id}"/></clipPath>` +
    `<path d="${d}" fill="${INK.track}"/>` +
    `<path d="${d}" fill="${color}" clip-path="url(#${id})"/>` +
    glideStyle(id, 'width', p => `${lit(p)}px`, opts.from, percent ?? 0)
  )
}

/** The speed at which each charge level starts, in tokens a second: blue from the first token, then purple, then red. */
export const CHARGE_AT = [0, 100, 200]
/** A speed's charge level, 0 (none: no reading, or no speed) to 3: one more for each of CHARGE_AT it has reached. */
export const chargeLevel = (tps: number | null) => (tps === null || !Number.isFinite(tps) || tps <= 0 ? 0 : CHARGE_AT.filter(at => tps >= at).length)
/** Each level's colour: blue up to 100 tok/s, purple up to 200, red from 200. */
export const CHARGE_COLOR = ['', HUE.sky, HUE.lilac, HUE.red]

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
 * - `still`: at 2, a lit frame and a corner bracket with hazard ticks.
 * - `head`: a chevron marker under the corner mark (two at 3).
 * - `arcs`: just above the meter, a rail carrying data packets; at 2 a chevron stream running the
 *   other way along it; at 3 a hot scan pulse racing ahead, and a tick rail along the top edge.
 * - `foot`: at 3, a tick rail along the bottom edge.
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
      `<path d="${rail(y)}" stroke-width="0.7" stroke-opacity="0.35"/>` +
        `<path d="${d}" stroke-width="7" stroke-opacity="0.08"/>` +
        `<path d="${d}" stroke-width="2.4"/>` +
        `<path d="${d}" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.75"/>`,
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
  // A measuring rail along an edge: a thin line with ticks, every fourth one long.
  const ticks = (y: number, up: number, ms: number, back = false) => {
    let short = ''
    let long = ''
    for (const [x, j] of spots(width, Math.max(4, Math.round(width / 24) * 4))) {
      if (j % 4 === 0) long += `M${f(x)} ${y}L${f(x)} ${f(y + up * 1.4)}L${f(x + 5)} ${f(y + up * 1.4)}`
      else short += `M${f(x)} ${y}L${f(x)} ${f(y + up * 0.9)}`
    }
    return line(`<path d="${rail(y)}" stroke-width="0.8" stroke-opacity="0.45"/><path d="${short}" stroke-width="0.8" stroke-opacity="0.6"/><path d="${long}" stroke-width="1.2"/>`, ms, back)
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
        ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="${color}" stroke-opacity="0.65"/>` +
          // A corner bracket and two hazard ticks, in the last SEAM px, so a widened band keeps them in its corner.
          `<path d="M${width - 2} ${height - 15}l0 11l-7 0" fill="none" stroke="${color}" stroke-width="1.6"/>` +
          `<path d="M${width - 2} ${height - 21}L${width - 6} ${height - 17}M${width - 2} ${height - 25}L${width - 6} ${height - 21}" fill="none" stroke="${color}" stroke-width="1.2" stroke-opacity="0.8"/>`
        : '',
    // Under the corner mark, in the last SEAM px.
    head: marker(width - 9.4, 12, 10, color) + (level >= 3 ? marker(width - 9.4, 24, 10, color) : ''),
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
  const slab = tab(label, opts.tone ?? INK.value)
  const labelled = bars.some(b => b.label)
  const nameW = labelled ? Math.max(...bars.map(b => capWidth((b.label ?? '').toUpperCase(), 9, 1))) + 6 : 0
  const pctW = labelled ? capWidth('100%', 10) + 6 : 0
  const subW = opts.sub ? capWidth(opts.sub.toUpperCase(), C.subFs, 0.8) : 0
  const natural = Math.max(C.minWidth, Math.ceil(Math.max(x + Math.ceil(labelWidth(shown, fs) * 1.12) + 14, slab.width + 22, x + subW + SEAM, C.pad + nameW + 60 + pctW + C.pad)))
  const width = Math.max(natural, Math.round(opts.width ?? 0))
  const pitch = labelled ? C.namedPitch : C.barPitch
  const level = Math.round(opts.charge?.level ?? 0)
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
        (b.label ? cap(C.pad, y + C.barH + 1.6, b.label, 9, INK.label, { ls: 1 }) + cap(width - C.pad, y + C.barH + 1.8, pct, 10, INK.value, { anchor: 'end' }) : '') +
        blocksSvg(`${id}-${i}`, barX, y, barW, C.barH, b.percent, b.color, { from: b.from })
      )
    })
    .join('')
  const subY = (opts.toggle ? C.valueY - 4 : C.barsY + bars.length * pitch) + (bars.length ? 10 : 13)
  const charge = chargeLayers(level, width, height, opts.charge?.motion === true)
  // The cell in layers: what never changes while its name, size and charge hold; the figure;
  // the meters and the line under them.
  const indexArt = opts.index
    ? `<text x="${Math.max(width - SEAM, Math.round(opts.indexEnd ?? 0))}" y="${height + 3}" text-anchor="end" ${FACE} font-size="42" font-weight="700" fill="${INK.value}" fill-opacity="0.06">${esc(opts.index)}</text>`
    : ''
  const base =
    frame(width, height) +
    indexArt +
    slab.svg +
    charge.still
  const figure =
    (opts.toggle ? mascotSvg(opts.toggle.on, C.pad, C.valueY - 2 - (mascotW * MASCOT.h) / MASCOT.w / 2 - 4, mascotW, { enter: opts.toggle.enter ?? null, motion: opts.toggle.motion === true }) : '') +
    reelText(x, opts.toggle ? C.valueY - 4 : C.valueY, fs, `${FACE} font-size="${fs}" font-weight="700" letter-spacing="0.4" fill="${level >= 3 ? CHARGE_COLOR[3] : INK.value}"`, shown, opts.reel)
  const lower = level > 0 ? CHARGE_CUT.drop : 0
  const meters =
    (lower ? `<g transform="translate(0 ${lower})">` : '') +
    barArt +
    (opts.rule ? `<path d="M${C.pad} ${C.barsY + 1}h22" stroke="${opts.rule}" stroke-width="2"/>` : '') +
    (opts.sub ? cap(x, subY, opts.sub, C.subFs, opts.tone ?? INK.detail, { ls: 0.8 }) : '') +
    (lower ? '</g>' : '')
  return { width, height, natural, level, base, figure, meters, charge, indexArt }
}

/** The cell's svg document, `h` px tall from `y`. */
const strip = (width: number, y: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y} ${width} ${h}" width="${width}" height="${h}">${inner}${themeStyle()}</svg>`

/**
 * One stat of the band as a HUD cell: its name on a slab at the top-left corner, the figure
 * large under it, then its meters (each a line of blocks; with a `label`, that name before it
 * and its share after), then `sub`, a dim line. `rule` draws a short accent line under a
 * figure that has no meter. `index` is the faint number in the corner. With `toggle` the
 * mascot sits before the figure (the Hanahira mode) and `tone` colours the slab and `sub`.
 * `charge` lays a power conduit over it. `width` and `height` only ever grow the cell, to its
 * column and its line.
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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMinYMid slice">${x || y ? `<g transform="translate(${-x} ${-y})">${inner}</g>` : inner}${themeStyle()}</svg>`

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
    right: { svg: slice(seam, SEAM, h, bare + rest), width: SEAM },
    even: short > 0 ? { svg: slice(0, short, h, fillFrom(0, short) + index), width: short } : null,
    width: c.width,
    height: c.height,
    natural: c.natural,
  }
}

/** The context line's measures: its height, the figure, the leaning blocks and the gaps. */
export const HUD_CONTEXT = { height: 30, fs: 17, baseline: 21, barH: 10, slant: 4.5, pitch: 9, minBar: 150, gap: 12, stackGap: 6 }

/**
 * The context line as a HUD cell the band's whole width: the slab, the figure, a row of leaning
 * blocks that takes the room, and what is left. With `stack` the blocks go under, for a band
 * too narrow for one line. The figure takes the meter's colour when `warn`.
 */
const contextLayers = (
  percent: number | null,
  color: string,
  opts: { left?: string | null; window?: string | null; stack?: boolean; width?: number; warn?: boolean; from?: Since<string> | string | null; fromPercent?: Since<number> | number | null } = {},
) => {
  const X = HUD_CONTEXT
  const value = percent === null || !Number.isFinite(percent) ? '—' : `${Math.round(percent)}%`
  const slab = tab('context', INK.value, 16, (X.height - 16) / 2)
  const valueX = slab.width + 8
  const valueW = labelWidth('100%', X.fs)
  const words = [opts.left, opts.window].filter(Boolean).join(' · ')
  const wordsW = words ? capWidth(words.toUpperCase(), 10, 1) : 0
  const end = CELL.pad + 6
  const lineNatural = valueX + valueW + X.gap + X.minBar + (words ? X.gap + wordsW : 0) + end
  const natural = Math.ceil(opts.stack ? Math.max(valueX + valueW + (words ? X.gap + wordsW : 0) + end, CELL.pad + X.minBar + end) : lineNatural)
  const width = Math.max(natural, Math.round(opts.width ?? 0))
  const height = opts.stack ? X.height + X.barH + X.stackGap : X.height
  const barX = opts.stack ? CELL.pad : valueX + valueW + X.gap
  const barW = opts.stack ? width - CELL.pad - end : width - barX - (words ? X.gap + wordsW : 0) - end
  const barY = opts.stack ? X.height - 2 : (X.height - X.barH) / 2
  const inner =
    frame(width, height, false) +
    slab.svg +
    reelText(valueX, X.baseline, X.fs, `${FACE} font-size="${X.fs}" font-weight="700" fill="${opts.warn ? color : INK.value}"`, value, opts.from) +
    blocksSvg('ctx', barX, barY, barW, X.barH, percent, color, { n: Math.max(8, Math.floor(barW / X.pitch)), gap: 3, slant: X.slant, from: opts.fromPercent }) +
    (words ? cap(width - end, X.baseline - 1.5, words, 10, INK.detail, { ls: 1, anchor: 'end' }) : '')
  // Where the line may be cut: after the meter and before the words; stacked, after both.
  const seam = Math.round(opts.stack || !words ? width - end : width - end - wordsW - X.gap / 2)
  return { inner, width, height, natural, seam }
}

type ContextOpts = Parameters<typeof contextLayers>[2]

export const hudContextSvg = (percent: number | null, color: string, opts: ContextOpts = {}) => {
  const c = contextLayers(percent, color, opts)
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}" width="${c.width}" height="${c.height}">${c.inner}${themeStyle()}</svg>`, width: c.width, height: c.height, natural: c.natural }
}

/** hudContextSvg in three pictures (see hudCellParts): the meter stays, the words keep the right end. */
export const hudContextParts = (percent: number | null, color: string, opts: ContextOpts = {}) => {
  const c = contextLayers(percent, color, opts)
  return { ...stretchParts(c.inner, glass(-40, FILL.line + 80, c.height), FILL.line, c.width, c.height, c.seam), natural: c.natural }
}


/** A chip of the top line: its height, its text and how far its ends lean. */
export const HUD_CHIP = { height: 20, fs: 11, lean: 5, pad: 9, baseline: 14 }

/**
 * The branch as a gold chip on the band's top line, after the session's slab: a leaning box in a
 * gold frame on a faint gold ground, `// name` in gold. The name keeps its own case: branch names
 * are case-sensitive.
 */
export const branchChipSvg = (branch: string) => {
  const H = HUD_CHIP
  const h = H.height
  const text = `// ${branch}`
  const fs = H.fs + 1
  const textW = labelWidth(text, fs)
  const pad = 7
  const width = Math.ceil(H.lean + pad + textW + pad + H.lean)
  const shape = `M${H.lean + 0.5} 0.5H${width - 0.5}L${width - H.lean - 0.5} ${h - 0.5}H0.5z`
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
      `<path d="${shape}" fill="${HUE.gold}" fill-opacity="0.14" stroke="${HUE.gold}"/>` +
      `<text x="${H.lean + pad}" y="${H.baseline}" ${FACE} font-size="${fs}" font-weight="700" fill="${HUE.gold}" textLength="${textW}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>` +
      `</svg>`,
    width,
    height: h,
  }
}

/**
 * A chip for the top line, a parallelogram: `fill` paints it solid in `color` with dark text
 * (a state: working, success, error); otherwise an outline, or with `plain` no shape at all.
 * `icon` stands before the label, or in its place where the label is empty (the clock).
 * `value` follows the label in ink and rolls to each new one. `pad` sets the room inside its
 * ends (HUD_CHIP.pad unless given). `minWidth` holds
 * it as wide as another state's. With `motion` it comes in once and its mark blinks (a loop).
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
    : `<path d="M${H.lean + 0.5} 0.5H${width - 0.5}L${width - H.lean - 0.5} ${h - 0.5}H0.5z" ` +
      (opts.fill ? `fill="${opts.color}"/>` : `fill="none" stroke="${INK.detail}" stroke-opacity="0.75"/>`)
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

/** The title slab's measures. */
export const SLAB = { height: 22, fs: 13, lean: 6, pad: 10 }

/** The session's name on a solid slab, its text knocked out dark: the top line's first word. */
export const slabSvg = (text: string) => {
  const S = SLAB
  const w = capWidth(text.toUpperCase(), S.fs, 1)
  const width = S.lean + S.pad + w + S.pad + S.lean
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${S.height}" width="${width}" height="${S.height}">` +
    `<path d="M${S.lean} 0H${width}L${width - S.lean} ${S.height}H0z" fill="${INK.value}"/>` +
    cap(S.lean + S.pad, 15.6, text, S.fs, HUE.card, { ls: 1, bold: true }) +
    `</svg>`
  return { svg, width, height: S.height }
}

/** The loading bar's stripes: each one's width along the bar, and the gap before the next. */
export const STRIPE = { on: 5, off: 5, ms: 700 }

/**
 * The loading bar as warning stripes, leaning, the whole width: `color` while `live`, else
 * `rest` (the track's grey unless given). With `motion` (and `live`) the stripes run to the
 * right, one stripe's pitch a loop, so a redraw sends the same picture and the loop runs on.
 */
export const stripeSvg = (width: number, height: number, color: string, opts: { live?: boolean; padBottom?: number; motion?: boolean; rest?: string } = {}) => {
  const w = Math.max(120, Math.round(width))
  const h = height
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  const pitch = STRIPE.on + STRIPE.off
  const lean = +(h * 0.7).toFixed(1)
  // One pitch more on the left, so the run to the right never opens a gap there.
  const d = Array.from({ length: Math.ceil(w / pitch) + 2 }, (_, k) => `M${(k - 1) * pitch + lean} 0h${STRIPE.on}l${-lean} ${h}h${-STRIPE.on}z`).join('')
  const moving = opts.live === true && opts.motion === true
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + pad}" width="${w}" height="${h + pad}" preserveAspectRatio="xMinYMid slice">` +
    `<path d="${d}" fill="${opts.live ? color : (opts.rest ?? INK.track)}"${moving ? ' class="run"' : ''}/>` +
    (moving ? motionStyle(`@keyframes run{to{transform:translateX(${pitch}px)}}.run{animation:run ${STRIPE.ms}ms linear infinite}`) : '') +
    `</svg>`
  )
}

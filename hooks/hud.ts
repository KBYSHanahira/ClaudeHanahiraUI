// The band's HUD look: sharp cells with a slab label, a large figure and block meters, in white
// on near-black with one accent. Pure builders like chat.ts (no engine calls), drawn from its
// colours so every picture still follows the app's theme (`themeStyle`).

import { EASE, HUE, INK, MASCOT, MOTION, glideStyle, labelWidth, mascotSvg, motionStyle, reelText, themeStyle } from './chat'
import type { Since } from './chat'

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

/** The cell's ground: a sharp near-black card with a hairline, and a `+` in two corners. */
const frame = (width: number, height: number, low = true) =>
  `<defs><filter id="glass-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e293b" flood-opacity="0.10"/></filter></defs>` +
  `<rect class="glass" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="#000000" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.12"/>` +
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

/** The speed at which each charge level starts, in tokens a second: blue, then purple, then gold. */
export const CHARGE_AT = [50, 100, 200]
/** A speed's charge level, 0 (none) to 3: one more for each of CHARGE_AT it has reached. */
export const chargeLevel = (tps: number | null) => (tps === null || !Number.isFinite(tps) ? 0 : CHARGE_AT.filter(at => tps >= at).length)
/** Each level's colour: sky, lilac, then the warning yellow at the top. */
export const CHARGE_COLOR = ['', HUE.sky, HUE.lilac, HUE.hazard]

// A cheap deterministic hash in [0, 1): the same arc draws the same every time, so a redraw
// with nothing changed sends the same picture.
const jitter = (seed: number, k: number) => {
  let h = (seed * 374761393 + k * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * An electric arc across `width` px at height `y`: a jagged line, `amp` px to either side,
 * drawn two widths long with the same shape in each, so sliding it one width shows no seam.
 */
const arcPath = (width: number, y: number, amp: number, seed: number) => {
  const n = Math.max(6, Math.round(width / 8))
  const pt = (k: number) => {
    const j = ((k % n) + n) % n
    return `${((width * (k + (jitter(seed, j * 2) - 0.5) * 0.6)) / n).toFixed(1)} ${(y + (jitter(seed, j * 2 + 1) - 0.5) * 2 * amp).toFixed(1)}`
  }
  let d = `M${pt(-n)}`
  for (let k = -n + 1; k <= n; k++) d += `L${pt(k)}`
  return d
}

/** A small lightning bolt, `size` px tall, its top-left corner at (`x`, `y`). */
const bolt = (x: number, y: number, size: number, color: string, cls = '') =>
  `<path d="M7 0L1 7h4l-2 5 6-7.5H5z" transform="translate(${x} ${y}) scale(${(size / 12).toFixed(3)})" fill="${color}"${cls ? ` class="${cls}"` : ''}/>`

/**
 * Where a charged cell is cut into strips (hudCellParts): under the slab, under the figure, above
 * the meter, and the last px for the bottom edge's arc. `drop` is how far a charged cell's meters
 * sit lower than a plain one's, which is the room the arcs run in, clear of the figure.
 */
export const CHARGE_CUT = { head: 14, arcs: 40, bars: 49, foot: 3, drop: 4 }

/**
 * The electric charge a fast cell wears, by `level` (1 to 3), over a cell `width` by `height`,
 * in layers, one for each strip of the cell it belongs to:
 * - `still`: at 2, a lit frame and sparks at the corners. Nothing in it moves.
 * - `head`: a bolt in the corner (two at 3) that flickers, and at 3 an arc along the top edge.
 * - `arcs`: an arc running just above the meter; at 2 a second, finer one against it; at 3 a third.
 * - `foot`: at 3, an arc along the bottom edge.
 * With `motion` every arc slides along its line for good (a loop, each at its own pace, faster
 * the higher the level) and the bolts flicker. Each layer carries its own CSS, and none depends
 * on the cell's figure, so a strip that holds only its layer keeps one picture while the level
 * holds and its motion runs on, whatever else on the cell is redrawn.
 */
const chargeLayers = (level: number, width: number, height: number, motion: boolean) => {
  if (level < 1) return { still: '', head: '', arcs: '', foot: '' }
  const color = CHARGE_COLOR[level]!
  const C = CELL
  const pace = [0, 1500, 1050, 760][level]!
  let n = 0
  // One arc, sliding one width a loop; `back` slides it the other way.
  const arc = (y: number, amp: number, seed: number, w: number, ms: number, back = false) => {
    const cls = `a${n++}`
    return (
      `<path d="${arcPath(width, y, amp, seed)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="bevel"${motion ? ` class="${cls}"` : ''}/>` +
      (motion ? motionStyle(`@keyframes ${cls}{to{transform:translateX(${back ? -width : width}px)}}.${cls}{${back ? `transform:translateX(${width}px);` : ''}animation:${cls} ${ms}ms linear infinite}`) : '')
    )
  }
  const flicker = motion ? motionStyle(`@keyframes zf{0%,100%{opacity:1}42%{opacity:.35}47%{opacity:1}71%{opacity:.55}}.zf{animation:zf ${900 - level * 170}ms linear infinite}`) : ''
  const spark = (x: number, y: number, dx: number, dy: number) => `<path d="M${x} ${y}l${dx * 5} ${dy * 3}l${-dx * 2} ${dy * 2}l${dx * 5} ${dy * 4}" fill="none" stroke="${color}" stroke-width="1.1"/>`
  const arcY = (CHARGE_CUT.arcs + CHARGE_CUT.bars) / 2
  return {
    still:
      level >= 2
        ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="${color}" stroke-opacity="0.65"/>` +
          spark(width - 3, height - 16, -1, 1) +
          spark(width - 4, C.tabH + 6, -1, 1) +
          spark(width - 46, height - 15, 1, 1)
        : '',
    head:
      bolt(width - 23, 2, 10, color, motion ? 'zf' : '') +
      (level >= 3 ? bolt(width - 35, 2, 10, color, motion ? 'zf' : '') + arc(1.6, 1.3, 51, 1.4, pace) : '') +
      flicker,
    arcs:
      arc(arcY, level >= 2 ? 3.2 : 2.6, level, 1.3, pace) +
      (level >= 2 ? arc(arcY, 3.6, level + 20, 0.8, Math.round(pace * 0.62), true) : '') +
      (level >= 3 ? arc(arcY, 3, level + 40, 1, Math.round(pace * 0.45)) : ''),
    foot: level >= 3 ? arc(height - 1.6, 1.3, 52, 1.4, pace, true) : '',
  }
}

export type HudBar = { label?: string; percent: number | null; color: string; from?: Since<number> | number | null }

/** A cell's height for what it holds, so a line of cells can share its tallest. */
export const cellHeight = (bars: number, sub: boolean, rule = false, named = false) =>
  CELL.barsY + bars * (named ? CELL.namedPitch : CELL.barPitch) + (sub ? CELL.subLine : 0) + (rule ? CELL.ruleH : 0) + CELL.bottom - (bars || sub || rule ? 0 : 3)

/** What a cell is given beyond its name and figure (hudCellSvg). */
export type CellOpts = {
  index?: string
  width?: number
  height?: number
  sub?: string
  bars?: HudBar[]
  rule?: string
  tone?: string
  reel?: Since<string> | string | null
  toggle?: { on: boolean; enter?: number | null; motion?: boolean }
  /** Electric charge over the cell, by level 1 to 3 (`chargeLevel`); `motion` sets it running (loops). */
  charge?: { level: number; motion?: boolean }
}

/** A cell's measures and its drawing in layers, for hudCellSvg and hudCellParts. */
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
  const natural = Math.max(C.minWidth, Math.ceil(Math.max(x + Math.ceil(labelWidth(shown, fs) * 1.12) + 14, slab.width + 22, x + subW + 8, C.pad + nameW + 60 + pctW + C.pad)))
  const width = Math.max(natural, Math.round(opts.width ?? 0))
  const pitch = labelled ? C.namedPitch : C.barPitch
  const height = Math.max(cellHeight(bars.length, opts.sub !== undefined, opts.rule !== undefined, labelled), Math.round(opts.height ?? 0))
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
  const level = Math.round(opts.charge?.level ?? 0)
  const charge = chargeLayers(level, width, height, opts.charge?.motion === true)
  // The cell in layers: what never changes while its name, size and charge hold; the figure;
  // the meters and the line under them. A charged cell is cut into strips of these (hudCellParts).
  const base =
    frame(width, height) +
    (opts.index ? `<text x="${width - 5}" y="${height + 3}" text-anchor="end" ${FACE} font-size="42" font-weight="700" fill="${INK.value}" fill-opacity="0.06">${esc(opts.index)}</text>` : '') +
    slab.svg +
    charge.still
  const figure =
    (opts.toggle ? mascotSvg(opts.toggle.on, C.pad, C.valueY - 2 - (mascotW * MASCOT.h) / MASCOT.w / 2 - 4, mascotW, { enter: opts.toggle.enter ?? null, motion: opts.toggle.motion === true }) : '') +
    reelText(x, opts.toggle ? C.valueY - 4 : C.valueY, fs, `${FACE} font-size="${fs}" font-weight="700" letter-spacing="0.4" fill="${level >= 3 ? HUE.hazard : INK.value}"`, shown, opts.reel)
  const lower = level > 0 ? CHARGE_CUT.drop : 0
  const meters =
    (lower ? `<g transform="translate(0 ${lower})">` : '') +
    barArt +
    (opts.rule ? `<path d="M${C.pad} ${C.barsY + 1}h22" stroke="${opts.rule}" stroke-width="2"/>` : '') +
    (opts.sub ? cap(x, subY, opts.sub, C.subFs, opts.tone ?? INK.detail, { ls: 0.8 }) : '') +
    (lower ? '</g>' : '')
  return { width, height, natural, level, base, figure, meters, charge }
}

/** A window of the cell's one drawing, `h` px tall from `y`: strips laid one under another make the cell. */
const strip = (width: number, y: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y} ${width} ${h}" width="${width}" height="${h}">${inner}${themeStyle()}</svg>`

/**
 * One stat of the band as a HUD cell: its name on a slab at the top-left corner, the figure
 * large under it, then its meters (each a line of blocks; with a `label`, that name before it
 * and its share after), then `sub`, a dim line. `rule` draws a short accent line under a
 * figure that has no meter. `index` is the faint number in the corner. With `toggle` the
 * mascot sits before the figure (the Hanahira mode) and `tone` colours the slab and `sub`.
 * `charge` lays electricity over it. `width` and `height` only ever grow the cell, to its
 * column and its line.
 */
export const hudCellSvg = (label: string, value: string, opts: CellOpts = {}) => {
  const c = cellLayers(label, value, opts)
  const svg = strip(c.width, 0, c.height, c.base + c.figure + c.meters + c.charge.head + c.charge.arcs + c.charge.foot)
  return { svg, width: c.width, height: c.height, natural: c.natural }
}

/**
 * The same cell as pictures laid one under another, so its electricity runs on while its
 * figure changes. A surface swaps a picture whose source changed, which starts its motion over
 * (and, in the surface's frame, blinks); so what moves gets strips of its own, whose pictures
 * hold for as long as the charge level does (`live`: drawn in the surface's frame, where a loop
 * keeps running), and the figure and the meters, which change several times a second, are
 * plain pictures between them, swapped cleanly. An uncharged cell is one plain picture.
 */
export const hudCellParts = (label: string, value: string, opts: CellOpts = {}) => {
  const c = cellLayers(label, value, opts)
  const K = CHARGE_CUT
  const cut = (y: number, h: number, inner: string, live: boolean) => ({ svg: strip(c.width, y, h, c.base + inner), width: c.width, height: h, live })
  const foot = c.level >= 3 ? K.foot : 0
  const parts =
    c.level < 1
      ? [cut(0, c.height, c.figure + c.meters, false)]
      : [
          cut(0, K.head, c.charge.head, true),
          cut(K.head, K.arcs - K.head, c.figure, false),
          cut(K.arcs, K.bars - K.arcs, c.charge.arcs, true),
          cut(K.bars, c.height - K.bars - foot, c.meters, false),
          ...(foot ? [cut(c.height - foot, foot, c.charge.foot, true)] : []),
        ]
  return { parts, width: c.width, height: c.height, natural: c.natural }
}

/** The context line's measures: its height, the figure, the leaning blocks and the gaps. */
export const HUD_CONTEXT = { height: 30, fs: 17, baseline: 21, barH: 10, slant: 4.5, pitch: 9, minBar: 150, gap: 12, stackGap: 6 }

/**
 * The context line as a HUD cell the band's whole width: the slab, the figure, a row of leaning
 * blocks that takes the room, and what is left. With `stack` the blocks go under, for a band
 * too narrow for one line. The figure takes the meter's colour when `warn`.
 */
export const hudContextSvg = (
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
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    frame(width, height, false) +
    slab.svg +
    reelText(valueX, X.baseline, X.fs, `${FACE} font-size="${X.fs}" font-weight="700" fill="${opts.warn ? color : INK.value}"`, value, opts.from) +
    blocksSvg('ctx', barX, barY, barW, X.barH, percent, color, { n: Math.max(8, Math.floor(barW / X.pitch)), gap: 3, slant: X.slant, from: opts.fromPercent }) +
    (words ? cap(width - end, X.baseline - 1.5, words, 10, INK.detail, { ls: 1, anchor: 'end' }) : '') +
    themeStyle() +
    `</svg>`
  return { svg, width, height, natural }
}

/** A chip of the top line: its height, its text and how far its ends lean. */
export const HUD_CHIP = { height: 20, fs: 11, lean: 5, pad: 9, baseline: 14 }

/**
 * A chip for the top line, a parallelogram: `fill` paints it solid in `color` with dark text
 * (a state: working, success, error); otherwise an outline, or with `plain` no shape at all
 * (the version). `value` follows the label in ink and rolls to each new one. `minWidth` holds
 * it as wide as another state's. With `motion` it comes in once and its mark blinks (a loop).
 */
export const hudChipSvg = (opts: { label: string; color: string; value?: string; fill?: boolean; plain?: boolean; minWidth?: number; motion?: boolean; reel?: Since<string> | string | null }) => {
  const H = HUD_CHIP
  const h = H.height
  const label = opts.label.toUpperCase()
  const labelW = capWidth(label, H.fs, 1.2)
  const mark = opts.fill ? 9 : 0
  const x = H.lean + H.pad + mark
  const valueW = opts.value ? 5 + labelWidth(opts.value, H.fs + 1) : 0
  const natural = Math.ceil(x + labelW + valueW + H.pad + H.lean)
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
    (mark ? `<rect x="${H.lean + H.pad - 1}" y="${h / 2 - 2.5}" width="5" height="5" fill="${HUE.card}"${opts.motion ? ' class="mk"' : ''}/>` : '') +
    cap(x, H.baseline, label, H.fs, ink, { ls: 1.2, bold: opts.fill === true }) +
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

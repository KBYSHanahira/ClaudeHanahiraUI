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

/** The speed at which each charge level starts, in tokens a second: blue from the first token, then purple, then gold. */
export const CHARGE_AT = [0, 100, 200]
/** A speed's charge level, 0 (none: no reading, or no speed) to 3: one more for each of CHARGE_AT it has reached. */
export const chargeLevel = (tps: number | null) => (tps === null || !Number.isFinite(tps) || tps <= 0 ? 0 : CHARGE_AT.filter(at => tps >= at).length)
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
 * `forks`: short branches off some of its corners, the same in each width too.
 */
const arcPath = (width: number, y: number, amp: number, seed: number) => {
  const n = Math.max(6, Math.round(width / 8))
  const mod = (k: number) => ((k % n) + n) % n
  const at = (k: number) => {
    const j = mod(k)
    return [(width * (k + (jitter(seed, j * 2) - 0.5) * 0.6)) / n, y + (jitter(seed, j * 2 + 1) - 0.5) * 2 * amp] as const
  }
  const pt = (k: number) => `${at(k)[0].toFixed(1)} ${at(k)[1].toFixed(1)}`
  let line = `M${pt(-n)}`
  let forks = ''
  for (let k = -n; k <= n; k++) {
    if (k > -n) line += `L${pt(k)}`
    const j = mod(k)
    // About one corner in four throws a branch: two short strokes, away from the line's middle.
    if (jitter(seed, 900 + j) < 0.26) {
      const [x, py] = at(k)
      const up = py < y ? -1 : 1
      const r = (i: number, lo: number, hi: number) => lo + jitter(seed, 950 + j * 4 + i) * (hi - lo)
      forks += `M${x.toFixed(1)} ${py.toFixed(1)}l${r(0, 2.5, 4.5).toFixed(1)} ${(up * r(1, 1.5, 3)).toFixed(1)}l${r(2, 1.5, 3.5).toFixed(1)} ${(up * r(3, 0.5, 2.5)).toFixed(1)}`
    }
  }
  return { line, forks }
}

/** A small lightning bolt, `size` px tall, its top-left corner at (`x`, `y`). */
const bolt = (x: number, y: number, size: number, color: string, cls = '') =>
  `<path d="M7 0L1 7h4l-2 5 6-7.5H5z" transform="translate(${x} ${y}) scale(${(size / 12).toFixed(3)})" fill="${color}"${cls ? ` class="${cls}"` : ''}/>`

/**
 * A charged cell's bands: the arcs run between `arcs` (under the figure) and `bars` (above the
 * meter). `drop` is how far a charged cell's meters sit lower than a plain one's, which is the
 * room the arcs run in, clear of the figure.
 */
export const CHARGE_CUT = { head: 14, arcs: 40, bars: 49, foot: 3, drop: 4 }

/**
 * The electric charge a fast cell wears, by `level` (1 to 3), over a cell `width` by `height`,
 * in layers:
 * - `still`: at 2, a lit frame and sparks at the corners. Nothing in it moves.
 * - `head`: a bolt in the corner (two at 3) that flickers, and at 3 an arc along the top edge.
 * - `arcs`: an arc running just above the meter; at 2 a second, finer one against it; at 3 a third.
 * - `foot`: at 3, an arc along the bottom edge.
 * With `motion` every arc slides along its line for good (a loop, each at its own pace, faster
 * the higher the level) and the bolts flicker. The cell is one plain picture, redrawn as its
 * figure changes, and a redrawn picture starts its CSS over; so each loop starts `at` ms into
 * itself (a negative animation-delay), and a redraw goes on from where the last one was.
 */
const chargeLayers = (level: number, width: number, height: number, motion: boolean, at = 0) => {
  if (level < 1) return { still: '', head: '', arcs: '', foot: '', lines: '' }
  const color = CHARGE_COLOR[level]!
  const C = CELL
  const pace = [0, 1500, 1050, 760][level]!
  let n = 0
  const into = (ms: number) => `;animation-delay:-${Math.round(((at % ms) + ms) % ms)}ms`
  // One arc, sliding one width a loop; `back` slides it the other way. Drawn as lightning: a
  // soft glow in two widths under the line, the line with its branches (which flickers, each
  // arc at its own beat), and a hot white thread down its middle.
  const arc = (y: number, amp: number, seed: number, w: number, ms: number, back = false) => {
    const cls = `a${n++}`
    const a = arcPath(width, y, amp, seed)
    const beat = 420 + ((seed * 131) % 5) * 90
    return (
      `<g${motion ? ` class="${cls}"` : ''} fill="none" stroke="${color}" stroke-linejoin="round" stroke-linecap="round">` +
      // Each stroke carries the line itself: a `use` of one shared path would be shorter, but a
      // surface that scrubs the markup may drop it, and the arcs with it.
      `<path d="${a.line}" stroke-width="${w + 5}" stroke-opacity="0.09"/>` +
      `<path d="${a.line}" stroke-width="${w + 2}" stroke-opacity="0.24"/>` +
      `<g${motion ? ` class="${cls}f"` : ''}><path d="${a.line}${a.forks}" stroke-width="${w}" stroke-linejoin="bevel"/>` +
      `<path d="${a.line}" stroke="#ffffff" stroke-width="${(w * 0.38).toFixed(2)}" stroke-opacity="0.8"/></g>` +
      `</g>` +
      (motion
        ? motionStyle(
            `@keyframes ${cls}{to{transform:translateX(${back ? -width : width}px)}}.${cls}{${back ? `transform:translateX(${width}px);` : ''}animation:${cls} ${ms}ms linear infinite${into(ms)}}` +
              `@keyframes ${cls}f{0%,100%{opacity:1}7%{opacity:.45}10%{opacity:1}48%{opacity:.7}52%{opacity:1}81%{opacity:.3}84%{opacity:1}}.${cls}f{animation:${cls}f ${beat}ms linear infinite${into(beat)}}`,
          )
        : '')
    )
  }
  const flicker = motion ? motionStyle(`@keyframes zf{0%,100%{opacity:1}42%{opacity:.35}47%{opacity:1}71%{opacity:.55}}.zf{animation:zf ${900 - level * 170}ms linear infinite${into(900 - level * 170)}}`) : ''
  const spark = (x: number, y: number, dx: number, dy: number) => `<path d="M${x} ${y}l${dx * 5} ${dy * 3}l${-dx * 2} ${dy * 2}l${dx * 5} ${dy * 4}" fill="none" stroke="${color}" stroke-width="1.1"/>`
  const arcY = (CHARGE_CUT.arcs + CHARGE_CUT.bars) / 2
  // Drawn in this order, so each arc keeps its class name.
  const top = level >= 3 ? arc(1.6, 1.3, 51, 1.4, pace) : ''
  const arcs =
    arc(arcY, level >= 2 ? 3.2 : 2.6, level, 1.3, pace) +
    (level >= 2 ? arc(arcY, 3.6, level + 20, 0.8, Math.round(pace * 0.62), true) : '') +
    (level >= 3 ? arc(arcY, 3, level + 40, 1, Math.round(pace * 0.45)) : '')
  const foot = level >= 3 ? arc(height - 1.6, 1.3, 52, 1.4, pace, true) : ''
  return {
    still:
      level >= 2
        ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="${color}" stroke-opacity="0.65"/>` +
          spark(width - SEAM - 1, height - 16, -1, 1) +
          spark(width - SEAM - 1, C.tabH + 6, -1, 1) +
          spark(width - 46, height - 15, 1, 1)
        : '',
    head: bolt(width - 23, 2, 10, color, motion ? 'zf' : '') + (level >= 3 ? bolt(width - 35, 2, 10, color, motion ? 'zf' : '') : '') + top + flicker,
    arcs,
    foot,
    // Every arc, and nothing else: each repeats every `width` px, so copies set `width` apart run on as one line.
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
  /** Electric charge over the cell, by level 1 to 3 (`chargeLevel`); `motion` sets it running (loops), `at` ms (the clock) into them. */
  charge?: { level: number; motion?: boolean; at?: number }
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
  const charge = chargeLayers(level, width, height, opts.charge?.motion === true, opts.charge?.at ?? 0)
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
    reelText(x, opts.toggle ? C.valueY - 4 : C.valueY, fs, `${FACE} font-size="${fs}" font-weight="700" letter-spacing="0.4" fill="${level >= 3 ? HUE.hazard : INK.value}"`, shown, opts.reel)
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
 * `charge` lays electricity over it. `width` and `height` only ever grow the cell, to its
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
const slice = (x: number, w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMinYMid slice">${x ? `<g transform="translate(${-x} 0)">${inner}</g>` : inner}${themeStyle()}</svg>`

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
  const run =
    c.level > 0
      ? (c.level >= 2 ? `<path d="M-40 0.5H${FILL.cell + 40}M-40 ${c.height - 0.5}H${FILL.cell + 40}" fill="none" stroke="${CHARGE_COLOR[c.level]}" stroke-opacity="0.65"/>` : '') +
        Array.from({ length: Math.ceil((FILL.cell + seam) / c.width) }, (_, i) => `<g transform="translate(${i * c.width - seam} 0)">${c.charge.lines}</g>`).join('')
      : ''
  const fill = glass(-40, FILL.cell + 80, c.height) + run
  // What the cell is short of `indexEnd`: the frame running on from the seam, with the rest of
  // the faint number, so the number sits at one place in every cell of an evened line.
  const short = Math.min(FILL.cell, Math.round(opts.indexEnd ?? 0) - seam)
  const rest = c.figure + c.meters + c.charge.head + c.charge.arcs + c.charge.foot
  return {
    ...stretchParts(c.base + rest, fill, FILL.cell, c.width, c.height, seam),
    // The right end without the number: one that runs past the seam goes on in `even`, not here.
    right: { svg: slice(seam, SEAM, c.height, (c.indexArt ? c.base.replace(c.indexArt, '') : c.base) + rest), width: SEAM },
    even: short > 0 ? { svg: slice(0, short, c.height, fill + `<g transform="translate(${-seam} 0)">${c.indexArt}</g>`), width: short } : null,
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

/** A transcript header's measures: its height, the slab's text, the rail it sits on. */
export const SPEAKER = { height: 20, fs: 11, lean: 6, pad: 8, capFs: 10, width: 420, minRail: 60, inMs: 900 }

/**
 * A transcript header, the line over a message: who speaks on a solid slab in `color` (its text
 * knocked out dark, its end cut on a slant), `caption` after it in dim capitals, and a rail that
 * runs on under both to three leaning blocks and a `+`. Every header is `SPEAKER.width` wide, so
 * their rails end in one line down the transcript; `width` sets another, never under its own.
 * With `enter` (how long ago the message came, in ms, under `SPEAKER.inMs`) it comes in once: the
 * slab wipes in from the left, its words follow, the rail runs out and the blocks light one by
 * one. The motion starts `enter` ms into itself, so a redraw goes on from where it was, and it
 * ends on the still look.
 */
export const speakerSvg = (label: string, color: string, opts: { caption?: string; width?: number; enter?: number | null } = {}) => {
  const S = SPEAKER
  const h = S.height
  const name = label.toUpperCase()
  const nameW = capWidth(name, S.fs, 1.4)
  const slabW = S.pad + nameW + S.pad + S.lean
  const words = opts.caption ? `// ${opts.caption}` : ''
  const wordsW = words ? capWidth(words.toUpperCase(), S.capFs, 1.2) : 0
  const railX = slabW + (words ? 8 + wordsW : 0) + 8
  const natural = Math.ceil(railX + S.minRail)
  const width = Math.max(natural, Math.round(opts.width ?? S.width))
  const end = width - 9
  // Three leaning blocks closing the rail, dim to bright, then the corner mark.
  const age = typeof opts.enter === 'number' && Number.isFinite(opts.enter) && opts.enter >= 0 && opts.enter < S.inMs ? Math.round(opts.enter) : null
  const cls = (name: string) => (age === null ? '' : ` class="${name}"`)
  const blocks = [0, 1, 2].map(k => `<path d="M${end - 34 + k * 7} ${h - 7}h4l-2.5 5h-4z" fill="${color}" fill-opacity="${(0.3 + k * 0.3).toFixed(1)}"${cls(`sb sb${k}`)}/>`).join('')
  // Each part's start, in ms from the message's coming, less its age: the slab, its words, the
  // rail, the blocks in turn (each flickering on), the corner mark.
  const run = (name: string, keys: string, ms: number, at: number, ease = EASE.out) => `.${name}{animation:${keys} ${ms}ms ${ease} ${at - (age ?? 0)}ms both}`
  const motion =
    age === null
      ? ''
      : motionStyle(
          `@keyframes sp-wipe{from{transform:scaleX(0)}}@keyframes sp-in{from{opacity:0;transform:translateX(-6px)}}@keyframes sp-on{0%{opacity:0}40%{opacity:1}60%{opacity:.2}}` +
            `.ss,.sr{transform-origin:0 0}` +
            run('ss', 'sp-wipe', 260, 0) +
            run('sn', 'sp-in', 220, 140) +
            run('sc', 'sp-in', 240, 220) +
            run('sr', 'sp-wipe', 520, 120) +
            [0, 1, 2].map(k => run(`sb${k}`, 'sp-on', 220, 520 + k * 70, 'linear')).join('') +
            run('sx', 'sp-on', 220, 680, 'linear'),
        )
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    `<path d="M0 ${h - 0.5}H${end - 40}" stroke="${INK.detail}" stroke-opacity="0.45" fill="none"${cls('sr')}/>` +
    `<path d="M0 0H${slabW}L${slabW - S.lean} ${h}H0z" fill="${color}"${cls('ss')}/>` +
    cap(S.pad, h / 2 + 4, name, S.fs, HUE.card, { ls: 1.4, bold: true, extra: cls('sn') }) +
    (words ? cap(slabW + 8, h / 2 + 3.6, words, S.capFs, INK.detail, { ls: 1.2, extra: cls('sc') }) : '') +
    blocks +
    `<path d="M${end - 5} ${h - 4.5}h5M${end - 2.5} ${h - 7}v5" stroke="${INK.detail}" stroke-opacity="0.7" fill="none"${cls('sx')}/>` +
    motion +
    themeStyle() +
    `</svg>`
  return { svg, width, height: h, natural }
}

/** A tool row's tag: its height, its text and how far its ends lean. */
export const TOOL_TAG = { height: 16, fs: 9, lean: 4, pad: 6, inMs: 260 }

/**
 * A tool row's tag: an outlined parallelogram holding a solid square in `color` and the kind
 * of work in capitals (RUN, READ, EDIT). `minWidth` holds every tag as wide as the widest, so
 * the rows after them line up. With `enter` (the row's age in ms, under `TOOL_TAG.inMs`) it comes in
 * once, from that far in; with `running` its square blinks for as long as the call runs (a loop).
 */
export const toolTagSvg = (label: string, color: string, opts: { minWidth?: number; enter?: number | null; running?: boolean } = {}) => {
  const G = TOOL_TAG
  const h = G.height
  const text = label.toUpperCase()
  const x = G.lean + G.pad + 8
  const natural = Math.ceil(x + capWidth(text, G.fs, 1.2) + G.pad + G.lean)
  const width = Math.max(natural, Math.round(opts.minWidth ?? 0))
  const age = typeof opts.enter === 'number' && Number.isFinite(opts.enter) && opts.enter >= 0 && opts.enter < G.inMs ? Math.round(opts.enter) : null
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">` +
    (age === null ? '' : '<g class="tg">') +
    `<path d="M${G.lean + 0.5} 0.5H${width - 0.5}L${width - G.lean - 0.5} ${h - 0.5}H0.5z" fill="none" stroke="${INK.detail}" stroke-opacity="0.6"/>` +
    `<rect x="${G.lean + G.pad - 1}" y="${h / 2 - 2}" width="4" height="4" fill="${color}"${opts.running ? ' class="tk"' : ''}/>` +
    cap(x, h / 2 + 3.2, text, G.fs, INK.label, { ls: 1.2, bold: true }) +
    (age === null ? '' : '</g>') +
    (age === null && !opts.running
      ? ''
      : motionStyle(
          (age === null ? '' : `@keyframes tg{from{opacity:0;transform:translateX(-8px)}}.tg{animation:tg ${G.inMs}ms ${EASE.out} ${-age}ms both}`) +
            (opts.running ? `@keyframes tk{50%{opacity:.2}}.tk{animation:tk ${MOTION.dotsMs}ms ${EASE.inOut} infinite}` : ''),
        )) +
    themeStyle() +
    `</svg>`
  return { svg, width, height: h, natural }
}

/**
 * The kinds of work a tool row is tagged with, and each one's colour. The words are the plain
 * ones the app itself uses (run, read, edit, search), so a tag never needs explaining.
 */
export const TOOL_KIND = {
  exec: { label: 'run', color: HUE.hazard },
  read: { label: 'read', color: HUE.sky },
  edit: { label: 'edit', color: HUE.mint },
  scan: { label: 'search', color: HUE.sky },
  net: { label: 'web', color: HUE.lilac },
  unit: { label: 'agent', color: HUE.peach },
  link: { label: 'mcp', color: HUE.fur },
  tool: { label: 'tool', color: INK.label },
}

/** Which kind of work a tool does, by its name: a shell is exec, an MCP tool link, an unknown one tool. */
export const toolKind = (tool: string): keyof typeof TOOL_KIND => {
  if (/^mcp__/.test(tool)) return 'link'
  if (/^(Bash|BashOutput|KillShell|Monitor)$/.test(tool)) return 'exec'
  if (/^(Read|NotebookRead)$/.test(tool)) return 'read'
  if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(tool)) return 'edit'
  if (/^(Grep|Glob|LS|ToolSearch)$/.test(tool)) return 'scan'
  if (/^Web(Fetch|Search)$/.test(tool)) return 'net'
  if (/^(Agent|Task|SendMessage)$/.test(tool)) return 'unit'
  return 'tool'
}

/**
 * The tags of the rows around a tool call, in the tool tags' look: what a call gave back (or its
 * error), a run of calls the transcript folds into one line, and what a slash command printed.
 */
export const ROW_TAG = {
  result: { label: 'output', color: INK.detail },
  error: { label: 'error', color: HUE.rose },
  group: { label: 'tools', color: INK.label },
  command: { label: 'command', color: HUE.fur },
}

/** A folded run's tag: its calls' own kind where they are all of one, else the plain `tools`. */
export const groupTag = (tools: readonly string[]) => {
  const kinds = [...new Set(tools.map(toolKind))]
  return kinds.length === 1 ? TOOL_KIND[kinds[0]!] : ROW_TAG.group
}

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

/** An electric arc from (`x0`, `y`) to (`x1`, `y`): a jagged line, `amp` px to either side. */
const arcPath = (x0: number, x1: number, y: number, amp: number, seed: number) => {
  const n = Math.max(4, Math.round((x1 - x0) / 9))
  let d = `M${x0} ${y}`
  for (let k = 1; k < n; k++) d += `L${(x0 + ((x1 - x0) * (k + (jitter(seed, k * 2) - 0.5) * 0.6)) / n).toFixed(1)} ${(y + (jitter(seed, k * 2 + 1) - 0.5) * 2 * amp).toFixed(1)}`
  return `${d}L${x1} ${y}`
}

/** A small lightning bolt, `size` px tall, its top-left corner at (`x`, `y`). */
const bolt = (x: number, y: number, size: number, color: string, cls = '') =>
  `<path d="M7 0L1 7h4l-2 5 6-7.5H5z" transform="translate(${x} ${y}) scale(${(size / 12).toFixed(3)})" fill="${color}"${cls ? ` class="${cls}"` : ''}/>`

/**
 * The electric charge a fast cell wears, by `level` (1 to 3), over a cell `width` by `height`:
 * 1, a bolt in the corner and an arc along the meter; 2, a second, finer arc, wider swings, a
 * lit frame and sparks at the corners; 3, arcs along the top and bottom edges and a second bolt.
 * Each arc is two jagged lines that take turns (with `motion`, a loop; still, the first shows),
 * so it crackles without a picture being sent for every frame. `frame` reshapes every arc: a
 * cell that is redrawn as its figure changes passes a new one each time, so the arcs jump with
 * the redraws too. The lit frame holds steady: only the arcs, sparks and bolts move.
 */
const chargeArt = (level: number, width: number, height: number, barY: number, motion: boolean, frame = 0) => {
  if (level < 1) return ''
  const color = CHARGE_COLOR[level]!
  const C = CELL
  const arc = (x0: number, x1: number, y: number, amp: number, seed: number, w = 1.2) =>
    `<path d="${arcPath(x0, x1, y, amp, seed + frame * 13)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="bevel"${motion ? ' class="za"' : ''}/>` +
    (motion ? `<path d="${arcPath(x0, x1, y, amp, seed + frame * 13 + 7)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="bevel" class="zb"/>` : '')
  const spark = (x: number, y: number, dx: number, dy: number) => `<path d="M${x} ${y}l${dx * 5} ${dy * 3}l${-dx * 2} ${dy * 2}l${dx * 5} ${dy * 4}" fill="none" stroke="${color}" stroke-width="1.1"${motion ? ' class="zb"' : ''}/>`
  const parts = [bolt(width - 24, 3, level >= 2 ? 13 : 11, color, motion ? 'zf' : ''), arc(C.pad, width - C.pad, barY + 1, level >= 2 ? 3.5 : 2.2, level)]
  if (level >= 2)
    parts.push(
      arc(C.pad, width - C.pad, barY + 1, 4.5, level + 20, 0.8),
      `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="${color}" stroke-opacity="0.65"/>`,
      spark(width - 3, height - 14, -1, 1),
      spark(width - 4, C.tabH + 8, -1, 1),
      spark(width - 46, height - 12, 1, 1),
    )
  if (level >= 3) parts.push(arc(0, width, 1.5, 2.5, 51, 1.4), arc(0, width, height - 1.5, 2.5, 52, 1.4), bolt(width - 38, 4, 10, color, motion ? 'zf' : ''))
  return (
    `<g>${parts.join('')}</g>` +
    (motion
      ? motionStyle(
          // Two shapes of each arc take turns, in steps, faster the higher the level; the bolt and frame flicker.
          `@keyframes za{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes zb{0%,49%{opacity:0}50%,100%{opacity:1}}` +
            `@keyframes zf{0%,100%{opacity:1}42%{opacity:.35}47%{opacity:1}71%{opacity:.55}}` +
            `.za{animation:za ${360 - level * 70}ms steps(1) infinite}.zb{animation:zb ${360 - level * 70}ms steps(1) infinite}.zf{animation:zf ${900 - level * 170}ms linear infinite}`,
        )
      : '')
  )
}

export type HudBar = { label?: string; percent: number | null; color: string; from?: Since<number> | number | null }

/** A cell's height for what it holds, so a line of cells can share its tallest. */
export const cellHeight = (bars: number, sub: boolean, rule = false, named = false) =>
  CELL.barsY + bars * (named ? CELL.namedPitch : CELL.barPitch) + (sub ? CELL.subLine : 0) + (rule ? CELL.ruleH : 0) + CELL.bottom - (bars || sub || rule ? 0 : 3)

/**
 * One stat of the band as a HUD cell: its name on a slab at the top-left corner, the figure
 * large under it, then its meters (each a line of blocks; with a `label`, that name before it
 * and its share after), then `sub`, a dim line. `rule` draws a short accent line under a
 * figure that has no meter. `index` is the faint number in the corner. With `toggle` the
 * mascot sits before the figure (the Hanahira mode) and `tone` colours the slab and `sub`.
 * `width` and `height` only ever grow the cell, to its column and its line.
 */
export const hudCellSvg = (
  label: string,
  value: string,
  opts: {
    index?: string
    width?: number
    height?: number
    sub?: string
    bars?: HudBar[]
    rule?: string
    tone?: string
    reel?: Since<string> | string | null
    toggle?: { on: boolean; enter?: number | null; motion?: boolean }
    /** Electric charge over the cell, by level 1 to 3 (`chargeLevel`); `motion` makes it crackle (a loop), and `frame` reshapes its arcs. */
    charge?: { level: number; motion?: boolean; frame?: number }
  } = {},
) => {
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
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    frame(width, height) +
    (opts.index ? `<text x="${width - 5}" y="${height + 3}" text-anchor="end" ${FACE} font-size="42" font-weight="700" fill="${INK.value}" fill-opacity="0.06">${esc(opts.index)}</text>` : '') +
    slab.svg +
    (opts.toggle ? mascotSvg(opts.toggle.on, C.pad, C.valueY - 2 - (mascotW * MASCOT.h) / MASCOT.w / 2 - 4, mascotW, { enter: opts.toggle.enter ?? null, motion: opts.toggle.motion === true }) : '') +
    reelText(x, opts.toggle ? C.valueY - 4 : C.valueY, fs, `${FACE} font-size="${fs}" font-weight="700" letter-spacing="0.4" fill="${(opts.charge?.level ?? 0) >= 3 ? HUE.hazard : INK.value}"`, shown, opts.reel) +
    barArt +
    (opts.rule ? `<path d="M${C.pad} ${C.barsY + 1}h22" stroke="${opts.rule}" stroke-width="2"/>` : '') +
    (opts.sub ? cap(x, subY, opts.sub, C.subFs, opts.tone ?? INK.detail, { ls: 0.8 }) : '') +
    (opts.charge ? chargeArt(Math.round(opts.charge.level), width, height, C.barsY, opts.charge.motion === true, Math.round(opts.charge.frame ?? 0)) : '') +
    themeStyle() +
    `</svg>`
  return { svg, width, height, natural }
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

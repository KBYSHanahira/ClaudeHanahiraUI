// Pure helpers for the agent strip: no engine calls, so tests run them as is.

import type { Agent } from '../types'
import { clip, EASE, fmtClock, fmtSpeed, fmtTokens, HUE, INK, MOTION, motionStyle } from './chat'
import { capWidth, HUD_FAMILY } from './hud'
import { iconGroup } from './icons'

// FOUNDRY: the orange-black field terminal's own scale, coolest to hottest, so the efforts and
// the families still tell apart: steel, amber, signal orange, ember red.
const EFFORT_COLOR: Record<string, string> = {
  low: HUE.steel,
  medium: HUE.amber,
  high: HUE.signal,
  xhigh: HUE.ember,
  max: HUE.ember,
}
const FAMILY_COLOR: Record<string, string> = { haiku: HUE.steel, sonnet: HUE.amber, opus: HUE.signal, fable: HUE.ember }

/**
 * The card's accent colour: by the effort when it is known, else by model family, else grey.
 * Colour only: the words on the card are always the real model and the real effort.
 */
export const accentFor = (effort: string | null, model: string) => {
  if (effort && EFFORT_COLOR[effort]) return EFFORT_COLOR[effort]
  const family = /(haiku|sonnet|opus|fable)/i.exec(model)?.[1]?.toLowerCase()
  return (family && FAMILY_COLOR[family]) || INK.label
}

const FAMILY = '(haiku|sonnet|opus|fable|mythos)'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

/**
 * `claude-opus-5-5` -> `Opus 5.5`, in either naming order, ignoring a date suffix
 * (`claude-3-5-haiku-20241022` -> `Haiku 3.5`). A bare alias gives the family alone.
 * Anything it cannot read with confidence is shown exactly as given, never guessed at.
 */
export const prettyModel = (id: string) => {
  let m = new RegExp(`claude-${FAMILY}-(\\d{1,2})(?:-(\\d{1,2}))?(?!\\d)`, 'i').exec(id)
  if (m) return `${cap(m[1]!)} ${m[2]}${m[3] ? `.${m[3]}` : ''}`
  m = new RegExp(`claude-(\\d{1,2})(?:-(\\d{1,2}))?-${FAMILY}`, 'i').exec(id)
  if (m) return `${cap(m[3]!)} ${m[1]}${m[2] ? `.${m[2]}` : ''}`
  m = new RegExp(`^${FAMILY}$`, 'i').exec(id.trim())
  if (m) return cap(m[1]!)
  return id
}

type Price = [number, number, number, number]

/**
 * US dollars per million tokens: input, output, cache read, 5-minute cache write.
 * From platform.claude.com/docs/en/about-claude/pricing; keyed by "family version" because the
 * price moves between versions of one family. Standard rates only: fast mode, batch and the 1.1x
 * US-only inference multiplier are not applied, as the counts do not say which applied. Haiku 5.5 is the rate for prompts up to 100k tokens:
 * the counts here are totals, so the over-100k rate cannot be told apart. Edit to match yours.
 */
export const PRICES: Record<string, Price> = {
  'fable 5.2': [8, 40, 0.2, 10],
  'fable 5.1': [10, 50, 0.25, 12.5],
  'fable 5': [10, 50, 1, 12.5],
  'mythos 5.2': [8, 40, 0.2, 10],
  'mythos 5.1': [10, 50, 0.25, 12.5],
  'mythos 5': [10, 50, 1, 12.5],
  'opus 5.5': [4, 20, 0.2, 5],
  'opus 5': [5, 25, 0.5, 6.25],
  'opus 4.8': [5, 25, 0.5, 6.25],
  'opus 4.7': [5, 25, 0.5, 6.25],
  'opus 4.6': [5, 25, 0.5, 6.25],
  'opus 4.5': [5, 25, 0.5, 6.25],
  'opus 4.1': [15, 75, 1.5, 18.75],
  'opus 4': [15, 75, 1.5, 18.75],
  'sonnet 5.5': [2, 10, 0.1, 2.5],
  'sonnet 5': [2, 10, 0.2, 2.5],
  'sonnet 4.6': [3, 15, 0.3, 3.75],
  'sonnet 4.5': [3, 15, 0.3, 3.75],
  'sonnet 4': [3, 15, 0.3, 3.75],
  'haiku 5.5': [0.1, 0.5, 0.01, 0.125],
  'haiku 4.5': [1, 5, 0.1, 1.25],
  'haiku 3.5': [0.8, 4, 0.08, 1],
}

/** A bare alias (`opus`) means the newest version of the family. */
const LATEST: Record<string, string> = { fable: 'fable 5.2', mythos: 'mythos 5.2', opus: 'opus 5.5', sonnet: 'sonnet 5.5', haiku: 'haiku 5.5' }

export type Counts = Pick<Agent, 'input' | 'output' | 'cacheRead' | 'cacheWrite'>

/** An estimate from token counts and the table above, not a bill. */
export const agentUsd = (model: string, c: Counts): number | null => {
  if (!countsKnown(c)) return null
  const name = prettyModel(model).toLowerCase()
  // A version the table lacks (or an id we cannot read) has no price: say so, do not borrow another's.
  const price = PRICES[LATEST[name] ?? name]
  if (!price) return null
  const [i, o, r, w] = price
  return (c.input * i + c.output * o + c.cacheRead * r + c.cacheWrite * w) / 1e6
}

export const totalTokens = (c: Counts) => c.input + c.output + c.cacheRead + c.cacheWrite

/** Counts a figure can be built on: a NaN or a negative count is no reading at all. */
const countsKnown = (c: Counts) => [c.input, c.output, c.cacheRead, c.cacheWrite].every(v => Number.isFinite(v) && v >= 0)

export const usd = (v: number | null) => (v === null || !Number.isFinite(v) ? '—' : v < 0.005 ? '$0.00' : `$${v.toFixed(2)}`)

/** What the strip lists: running agents first, then the ones that finished lately; at most `max`. */
export const visibleAgents = (agents: Agent[], now: number, opts: { max?: number; keepMs?: number } = {}) => {
  const max = Math.max(0, opts.max ?? 4)
  const keepMs = opts.keepMs ?? 120_000
  const running = agents.filter(a => a.status === 'running')
  const recent = agents
    // Either way round: after the clock steps back, a card that seems to end ahead of now still leaves.
    .filter(a => a.status !== 'running' && a.endedAt !== null && Math.abs(now - a.endedAt) <= keepMs)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  const all = [...running, ...recent]
  return { shown: all.slice(0, max), more: Math.max(0, all.length - max) }
}

const hash = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

const noise = (seed: number, k: number) => {
  let h = (seed * 2654435761 + k * 40503) >>> 0
  h = ((h ^ (h >>> 15)) * 2246822519) >>> 0
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

/** The inside of a little mirrored pixel creature, on a 9x9 grid (-1..8): the same one for the same seed. */
export const spriteInner = (seed: string, color: string) => {
  const n = hash(seed)
  const cells: string[] = []
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 4; x++) {
      if (noise(n, y * 4 + x) < (y === 0 || y === 6 ? 0.35 : 0.62)) {
        cells.push(`M${x} ${y}h1v1h-1z`)
        if (x < 3) cells.push(`M${6 - x} ${y}h1v1h-1z`)
      }
    }
  }
  return (
    `<rect x="-1" y="-1" width="9" height="9" rx="2" fill="${color}" fill-opacity="0.14"/>` +
    `<path d="M2 1h3v4H2z" fill="${color}"/>` +
    `<path d="${cells.join('')}" fill="${color}"/>` +
    `<rect x="2" y="2" width="1" height="1" fill="#0c0c0d"/><rect x="4" y="2" width="1" height="1" fill="#0c0c0d"/>`
  )
}

export const CARD_W = 248
export const CARD_H = 72
/** The height the bar takes at a card's foot: what a barless card leaves out. */
export const BAR_ROOM = 10

/** The terminal's microtext face. */
const MONO = "ui-monospace,'JetBrains Mono','SF Mono',Consolas,monospace"

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The card's stats line, as drawn: tools, tokens, spend, and how long a finished one took.
 * A running card shows no ticking clock, so its line (and picture) changes only with its figures. */
export const agentStats = (a: Agent) => {
  const cost = agentUsd(a.model, a)
  const costText = cost === null ? '—' : `≈${usd(cost)}`
  const when = a.status === 'running' ? 'working' : fmtClock((a.endedAt ?? a.startedAt) - a.startedAt)
  const tokens = countsKnown(a) ? fmtTokens(totalTokens(a)) : '—'
  // The clip takes from the figures, never the time: a cut `10:00:00` would read as ten minutes.
  const tail = ` · ${when}`
  return `${clip(`${a.tools} tools · ${tokens} · ${costText}`, 40 - tail.length)}${tail}`
}

/** The drawing of one card, in pieces: its frame, what it says, and its bar. */
const cardPieces = (a: Agent, opts: { padBottom?: number; barless?: boolean }) => {
  const W = CARD_W
  const H = opts.barless ? CARD_H - BAR_ROOM : CARD_H
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0)) // transparent room under the card, in px
  const accent = accentFor(a.effort, a.model)
  const running = a.status === 'running'
  const nameFull = clip(a.name, 24)
  const name = esc(nameFull)
  // The name must stop short of the status mark: pin it to the room it has.
  const nameMax = W - 58 - 34
  const nameWant = Math.round(nameFull.length * 7.3)
  const nameFit = nameWant > nameMax ? ` textLength="${nameMax}" lengthAdjust="spacingAndGlyphs"` : ''
  const modelText = a.model ? prettyModel(a.model) : 'model pending'
  const model = esc(modelText)
  const effort = a.effort ? esc(String(a.effort)) : ''
  const modelW = Math.round(modelText.length * 6.3)
  const statsText = agentStats(a)
  const stats = esc(statsText)
  const font = `font-family="${HUD_FAMILY}" style="font-stretch:condensed"`

  // A running card's border holds its accent: with the ring and the bar, it says "busy".
  const edge = running ? accent : INK.line
  const edgeOpacity = running ? 0.55 : 1

  const sr = 6
  const sc = 2 * Math.PI * sr
  const mark = running
    ? `<circle cx="${W - 21}" cy="17" r="${sr}" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="2.2"/>` +
      `<circle cx="${W - 21}" cy="17" r="${sr}" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${(sc * 0.3).toFixed(2)} ${sc.toFixed(2)}"/>`
    : a.status === 'done'
      ? iconGroup('check', HUE.bone, W - 29, 9, 16, 3)
      : a.status === 'error'
        ? iconGroup('cross', HUE.ember, W - 29, 9, 16, 3)
        : iconGroup('ban', HUE.amber, W - 29, 9, 16, 2.6)

  const barX = 10
  const barW = W - 20
  const barY = H - 12
  const litW = running ? Math.round(barW * 0.3) : barW
  const track = `<rect x="${barX}" y="${barY}" width="${barW}" height="3" fill="${INK.track}"/>`
  const lit = (cls = '') => `<rect x="${barX}" y="${barY}" width="${litW}" height="3" fill="${accent}"${cls ? ` class="${cls}"` : ''}/>`

  // Sharp, its top-right corner cut, as every panel of the terminal.
  const frame = `<path d="M0.75 0.75H${W - 10.75}L${W - 0.75} 10.75V${H - 0.75}H0.75z" fill="${HUE.card}" stroke="${edge}" stroke-opacity="${edgeOpacity}" stroke-width="1.5"/>`
  const sprite = `<svg x="10" y="9" width="38" height="38" viewBox="-1 -1 9 9" shape-rendering="crispEdges">${spriteInner(a.id, accent)}</svg>`
  const nameLine = `<text x="58" y="23" ${font} font-size="13" font-weight="700" fill="${INK.value}"${nameFit}>${name}</text>`
  const figures =
    `<text x="58" y="38" ${font} font-size="11" fill="${INK.label}">${model}</text>` +
    (effort ? `<text x="${58 + modelW + 7}" y="38" ${font} font-size="11" font-weight="700" fill="${accent}">${effort}</text>` : '') +
    `<text x="58" y="53" ${font} font-size="10.5" fill="${INK.detail}">${stats}</text>`
  const body = sprite + nameLine + figures + mark
  return { W, H, pad, running, accent, frame, sprite, nameLine, figures, mark, body, track, lit, barX, barY, barW, litW }
}

const svgBox = (W: number, y: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y} ${W} ${h}" width="${W}" height="${h}">${inner}</svg>`

/**
 * One agent as a card, all in one SVG. A running card wears its accent on the border, a
 * part-drawn ring where the check will go, and a lit stretch on its bar; a finished one, its
 * mark and a full bar.
 */
export const agentCardSvg = (
  a: Agent,
  opts: {
    padBottom?: number
    /** The bar is left out, the card a little shorter for it. */
    barless?: boolean
  } = {},
) => {
  const p = cardPieces(a, opts)
  return {
    svg: svgBox(p.W, 0, p.H + p.pad, p.frame + p.body + (opts.barless ? '' : p.track + p.lit())),
    width: p.W,
    height: p.H + p.pad,
  }
}

/** The small card the strip draws: one line, about the height of the band's chips. */
export const AGENT_CHIP = { W: 372, shellW: 208, H: 24, markW: 24 }

/**
 * What a subagent runs on, as the chip says it: the model as the API reported it and the effort
 * the engine sent, then how fast its latest response came, `SONNET 5.5 · LOW · 82 TOK/S`. Unknown
 * parts are left out, never guessed: no model yet reads `MODEL PENDING`, no speed yet shows none.
 * A background command runs on no model and says nothing.
 */
export const agentSpec = (a: Agent) =>
  a.kind === 'shell' ? '' : [a.model ? prettyModel(a.model) : 'model pending', a.effort ? String(a.effort) : '', speedText(a)].filter(Boolean).join(' · ')

/** A subagent's speed as the chip says it, `82 tok/s`; '' until one is measured. */
const speedText = (a: Agent) => (a.kind !== 'shell' && typeof a.tps === 'number' && Number.isFinite(a.tps) && a.tps > 0 ? `${fmtSpeed(a.tps)} tok/s` : '')

/** A background command's card colour: warm, apart from every model's and effort's. */
export const SHELL_COLOR = HUE.bone

/** What a card says it is: a subagent, or a command running in the background. */
export const kindLabel = (a: Agent) => (a.kind === 'shell' ? 'Bg app' : 'Agent')

/**
 * A background task's notification, as the session receives it: its id and how it ended
 * (`completed`, `failed`, `killed`), or null for any other text.
 */
export const taskNotice = (text: string): { id: string; status: string } | null => {
  if (!text.includes('<task-notification>')) return null
  const id = /<task-id>\s*([^<\s]+)\s*<\/task-id>/.exec(text)?.[1]
  const status = /<status>\s*([^<\s]+)\s*<\/status>/.exec(text)?.[1]
  return id && status ? { id, status } : null
}

/** How a notification's word settles a card; null leaves it running. */
export const settledStatus = (s: string): Agent['status'] | null =>
  s === 'completed' ? 'done' : s === 'failed' ? 'error' : s === 'killed' || s === 'stopped' ? 'stopped' : null

/**
 * The host's word on background commands (register's SHELL_PROBE), read into how each ended:
 * `H <file>` a command still holds its output file, `F <file>` the file is there, `K <file>` it
 * ends in `[killed]`; the id is the file's name. A file nobody holds is an ended command, `done`
 * or `stopped`; a held one, or one with no file, is not named. Nothing without the closing `OK`.
 */
export const shellFates = (out: string): Map<string, Agent['status']> => {
  const fates = new Map<string, Agent['status']>()
  const lines = out.split('\n').map(l => l.trim())
  if (!lines.includes('OK')) return fates
  const idOf = (l: string) => /([^/]+)\.output$/.exec(l)?.[1]
  const held = new Set(lines.filter(l => l.startsWith('H ')).map(idOf))
  for (const l of lines) {
    const id = idOf(l)
    if (id && (l.startsWith('F ') || l.startsWith('K ')) && !held.has(id)) fates.set(id, l.startsWith('K ') ? 'stopped' : 'done')
  }
  return fates
}

/**
 * One agent as an operator card of the field terminal, in two pictures laid edge to edge:
 * `body`, what it is on a notched slab in its accent, its sprite in a bracketed frame, its name in
 * capitals and what it runs on, with a hairline rail and its code under it while it runs; `mark`,
 * the right end under the chamfer, where a diamond turns and its core pulses while it runs
 * (`motion`; the picture holds no figure, so it stays the same while it plays) and a finished one
 * draws its check in once. The stats ride on the picture's alt text (agentStats), not on the card,
 * so the strip stays one line.
 */
export const agentChipParts = (a: Agent, opts: { padBottom?: number; motion?: boolean } = {}) => {
  const { H, markW } = AGENT_CHIP
  // A subagent's chip has room for what it runs on; a background command's runs on nothing.
  const W = a.kind === 'shell' ? AGENT_CHIP.shellW : AGENT_CHIP.W
  const bodyW = W - markW
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0))
  const accent = a.kind === 'shell' ? SHELL_COLOR : accentFor(a.effort, a.model)
  const running = a.status === 'running'
  const motion = opts.motion === true
  const face = `font-family="${HUD_FAMILY}" style="font-stretch:condensed"`
  const cy = H / 2
  // The frame: sharp, its top-right corner cut (in the mark's piece), the accent while it runs.
  const C = 7
  const edge = running ? accent : INK.line
  const frame = `<path d="M0.5 0.5H${W - C - 0.5}L${W - 0.5} ${C + 0.5}V${H - 0.5}H0.5z" fill="${HUE.card}" stroke="${edge}" stroke-opacity="${running ? 0.75 : 1}"/>`
  // What it is, on a solid slab: a notch in its left end, its right end cut on a slant, and a
  // thinner slant after it, the slab's echo.
  const kind = kindLabel(a).toUpperCase()
  const kindW = capWidth(kind, 9.5, 1.2)
  const tagW = 8 + kindW + 9
  const tag =
    // A finished card's slab goes dark, its word in the accent: only the working ones stay lit.
    `<path d="M0 0H${tagW}L${tagW - 6} ${H}H0V${cy + 3.5}L3.5 ${cy}L0 ${cy - 3.5}z" fill="${accent}"${running ? '' : ' fill-opacity="0.2"'}/>` +
    `<path d="M${tagW + 2} 0H${tagW + 4.5}L${tagW - 1.5} ${H}H${tagW - 4}z" fill="${accent}" fill-opacity="${running ? 0.45 : 0.2}"/>` +
    `<text x="8" y="${cy + 3.4}" ${face} font-size="9.5" font-weight="700" fill="${running ? HUE.card : accent}" textLength="${kindW}" lengthAdjust="spacingAndGlyphs">${kind}</text>`
  // A subagent wears its pixel creature; a background command, a terminal: in a bracketed frame.
  const sx = tagW + 9
  const S = 14
  const sy = cy - S / 2
  const bx0 = sx - 2.5
  const bx1 = sx + S + 2.5
  const by0 = 2.5
  const by1 = H - 2.5
  const L = 3
  const brackets =
    `<path d="M${bx0} ${by0 + L}V${by0}H${bx0 + L}M${bx1 - L} ${by0}H${bx1}V${by0 + L}M${bx1} ${by1 - L}V${by1}H${bx1 - L}M${bx0 + L} ${by1}H${bx0}V${by1 - L}" ` +
    `fill="none" stroke="${running ? accent : INK.detail}" stroke-opacity="${running ? 0.8 : 0.7}"/>`
  const sprite =
    brackets +
    (a.kind === 'shell'
      ? iconGroup('terminal', accent, sx, sy, S, 2)
      : `<svg x="${sx}" y="${sy}" width="${S}" height="${S}" viewBox="-1 -1 9 9" shape-rendering="crispEdges">${spriteInner(a.id, accent)}</svg>`)
  // What it runs on, set to end just short of the mark: the model dim, the effort in the accent.
  const specEnd = bodyW - 7
  const modelPart = a.kind === 'shell' ? '' : (a.model ? prettyModel(a.model) : 'model pending').toUpperCase()
  const effortPart = a.kind === 'shell' || !a.effort ? '' : String(a.effort).toUpperCase()
  const speedPart = speedText(a).toUpperCase()
  // Laid out from the right: the speed in white, the effort in the accent, the model dim.
  const parts = [
    { t: modelPart, fill: INK.label, weight: 600 },
    { t: effortPart, fill: accent, weight: 700 },
    { t: speedPart, fill: INK.value, weight: 700 },
  ].filter(p => p.t)
  const gap = 9
  const widths = parts.map(p => capWidth(p.t, 10, 0.8))
  const specW = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, parts.length - 1)
  let px = specEnd - specW
  const spec = parts
    .map((p, i) => {
      const t = `<text x="${px}" y="15.6" ${face} font-size="10" font-weight="${p.weight}" fill="${p.fill}" textLength="${widths[i]}" lengthAdjust="spacingAndGlyphs">${esc(p.t)}</text>`
      // A small slanted divider between parts, in the line's ink.
      const div = i < parts.length - 1 ? `<path d="M${px + widths[i]! + gap / 2 + 1.5} 8.5L${px + widths[i]! + gap / 2 - 1.5} 16.5" stroke="${INK.detail}"/>` : ''
      px += widths[i]! + gap
      return t + div
    })
    .join('')
  // The name in capitals, pinned to its width, and to its room where it would run into the spec.
  const nameX = bx1 + 6
  const nameFull = clip(a.name, 22).toUpperCase()
  const nameRoom = (specW ? specEnd - specW - 10 : bodyW - 6) - nameX
  const nameW = Math.max(0, Math.min(capWidth(nameFull, 11.5, 0.8), nameRoom))
  const name = `<text x="${nameX}" y="16" ${face} font-size="11.5" font-weight="700" fill="${running ? INK.value : INK.label}" textLength="${nameW}" lengthAdjust="spacingAndGlyphs">${esc(nameFull)}</text>`
  // Running: a hairline rail in the accent under the name and the spec, a short bright head at its
  // start, and the operator's code where the line has room for it.
  const railY = H - 3.5
  const railEnd = specEnd
  const code = `OP-${(a.id.replace(/[^a-z0-9]/gi, '').slice(-2) || '00').toUpperCase()}`
  const codeW = code.length * 4.6
  const codeEnd = (specW ? specEnd - specW : bodyW - 6) - 10
  const codeFits = running && codeEnd - codeW >= nameX + nameW + 12
  const rail = running
    ? `<path d="M${nameX} ${railY}H${railEnd}" stroke="${accent}" stroke-opacity="0.35" stroke-width="0.75"/>` +
      `<path d="M${nameX} ${railY}h16" stroke="${accent}" stroke-width="1.5"/>` +
      `<path d="M${railEnd - 0.5} ${railY - 2.5}v2.5" stroke="${accent}" stroke-opacity="0.6"/>` +
      (codeFits
        ? `<text x="${codeEnd - codeW}" y="15" font-family="${MONO}" font-size="7" letter-spacing="0.6" fill="${INK.detail}" textLength="${codeW}" lengthAdjust="spacingAndGlyphs">${esc(code)}</text>`
        : '')
    : ''
  // The mark, under the chamfer, past a hairline divider.
  const cx = bodyW + (markW - 1) / 2
  const divider = `<path d="M${bodyW + 0.5} 5V${H - 5}" stroke="${running ? accent : INK.line}" stroke-opacity="${running ? 0.4 : 1}"/>`
  const dia = (r: number) => `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}z`
  // Running: a still outer diamond, an inner one that indexes a quarter turn at a time, a pulsing core.
  const turning =
    `<path d="${dia(7.5)}" fill="none" stroke="${accent}" stroke-opacity="0.3"/>` +
    `<path d="${dia(4.6)}" fill="none" stroke="${accent}" stroke-width="1.5"${motion ? ' class="spin"' : ''}/>` +
    `<path d="${dia(1.8)}" fill="${accent}"${motion ? ' class="pulse"' : ''}/>` +
    (motion
      ? motionStyle(
          `@keyframes spin{0%{transform:rotate(0deg)}60%,100%{transform:rotate(90deg)}}.spin{transform-origin:${cx}px ${cy}px;animation:spin ${MOTION.spinMs}ms ${EASE.inOut} infinite}` +
            `@keyframes pulse{50%{opacity:.25;transform:scale(.5)}}.pulse{transform-origin:${cx}px ${cy}px;animation:pulse ${MOTION.spinMs}ms ${EASE.inOut} infinite}`,
        )
      : '')
  const icon = (n: 'check' | 'cross' | 'ban', color: string) => iconGroup(n, color, cx - 6, cy - 6, 12, n === 'ban' ? 2.2 : 2.6)
  const mark =
    divider +
    (running
      ? turning
      : a.status === 'done'
        ? motion
          ? `<g class="tick">${icon('check', HUE.bone)}</g>` +
            motionStyle(`@keyframes tick{from{stroke-dashoffset:24}}.tick path{stroke-dasharray:24;animation:tick ${MOTION.checkMs}ms ${EASE.out} both}`)
          : icon('check', HUE.bone)
        : a.status === 'error'
          ? icon('cross', HUE.ember)
          : icon('ban', HUE.amber))
  return {
    body: { svg: svgWindow(0, 0, bodyW, H + pad, frame + tag + sprite + rail + name + spec), width: bodyW, height: H + pad },
    mark: { svg: svgWindow(bodyW, 0, markW, H + pad, frame + mark), width: markW, height: H + pad },
  }
}

/** A window of the card's one drawing, `w` by `h` from (`x`, `y`): pieces laid edge to edge make the card. */
const svgWindow = (x: number, y: number, w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`

/** Where the card is cut into its pieces (agentCardParts): under the name, left of the mark, above the bar. */
export const CARD_CUT = { head: 27, mark: CARD_W - 30, bar: CARD_H - 15 }

/**
 * The same card as four pictures laid edge to edge, so what moves never blinks. A surface swaps
 * a picture whose source changed, which blinks a frame and starts its motion over; so what moves
 * gets a piece of its own whose picture holds for as long as the agent runs:
 * - `head`, the name and the sprite's top: still.
 * - `mark`, the corner with the ring: the ring turns while the agent runs (`motion`), and a
 *   finished one draws its check in once.
 * - `body`, the model and the figures, which change as the agent works: a plain image, swapped
 *   cleanly.
 * - `strip`, the bar: its lit stretch slides along it and back while the agent runs, and a
 *   finished one fills to the end once, then rests.
 * Each draws only what shows in its window, so a piece's source changes only with what it shows.
 */
export const agentCardParts = (a: Agent, opts: { padBottom?: number; motion?: boolean } = {}) => {
  const p = cardPieces(a, opts)
  const C = CARD_CUT
  const motion = opts.motion === true
  const markW = p.W - C.mark
  const mark = motion
    ? p.running
      ? p.mark.replace(/(<circle [^>]*stroke-dasharray="[^"]*")\/>/, '$1 class="spin"/>') +
        motionStyle(`@keyframes spin{to{transform:rotate(360deg)}}.spin{transform-box:fill-box;transform-origin:center;animation:spin ${MOTION.spinMs}ms linear infinite}`)
      : a.status === 'done'
        ? `<g class="tick">${p.mark}</g>` +
          motionStyle(`@keyframes tick{from{stroke-dashoffset:24}}.tick path{stroke-dasharray:24;animation:tick ${MOTION.checkMs}ms ${EASE.out} both}`)
        : p.mark
    : p.mark
  const strip = !motion
    ? p.lit()
    : p.running
      ? p.lit('run') +
        motionStyle(`@keyframes run{50%{transform:translateX(${p.barW - p.litW}px)}}.run{animation:run ${MOTION.agentBarMs * 2}ms ${EASE.inOut} infinite}`)
      : p.lit('fill') +
        motionStyle(`@keyframes fill{from{transform:scaleX(.3)}}.fill{transform-box:fill-box;transform-origin:left;animation:fill ${MOTION.agentFillMs}ms ${EASE.out} both}`)
  const bodyH = C.bar - C.head
  const stripH = p.H + p.pad - C.bar
  return {
    head: { svg: svgWindow(0, 0, C.mark, C.head, p.frame + p.sprite + p.nameLine), width: C.mark, height: C.head },
    mark: { svg: svgWindow(C.mark, 0, markW, C.head, p.frame + mark), width: markW, height: C.head },
    body: { svg: svgWindow(0, C.head, p.W, bodyH, p.frame + p.sprite + p.figures), width: p.W, height: bodyH },
    strip: { svg: svgWindow(0, C.bar, p.W, stripH, p.frame + p.track + strip), width: p.W, height: stripH },
  }
}

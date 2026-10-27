// Pure helpers for the agent strip: no engine calls, so tests run them as is.

import type { Agent } from '../types'
import { clip, fmtClock, fmtTokens } from './chat'
import { iconGroup } from './icons'

const EFFORT_COLOR: Record<string, string> = {
  low: '#34c38f',
  medium: '#4aa3f0',
  high: '#e0a03a',
  xhigh: '#f2736b',
  max: '#f2736b',
}
const FAMILY_COLOR: Record<string, string> = { haiku: '#34c38f', sonnet: '#4aa3f0', opus: '#e0a03a', fable: '#9b8cf7' }

/**
 * The card's accent colour: by the effort when it is known, else by model family, else grey.
 * Colour only: the words on the card are always the real model and the real effort.
 */
export const accentFor = (effort: string | null, model: string) => {
  if (effort && EFFORT_COLOR[effort]) return EFFORT_COLOR[effort]
  const family = /(haiku|sonnet|opus|fable)/i.exec(model)?.[1]?.toLowerCase()
  return (family && FAMILY_COLOR[family]) || '#a8a29e'
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
  'fable 5.1': [10, 50, 0.25, 12.5],
  'fable 5': [10, 50, 1, 12.5],
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
const LATEST: Record<string, string> = { fable: 'fable 5.1', mythos: 'mythos 5.1', opus: 'opus 5.5', sonnet: 'sonnet 5.5', haiku: 'haiku 5.5' }

export type Counts = Pick<Agent, 'input' | 'output' | 'cacheRead' | 'cacheWrite'>

/** An estimate from token counts and the table above, not a bill. */
export const agentUsd = (model: string, c: Counts): number | null => {
  const name = prettyModel(model).toLowerCase()
  // A version the table lacks (or an id we cannot read) has no price: say so, do not borrow another's.
  const price = PRICES[LATEST[name] ?? name]
  if (!price) return null
  const [i, o, r, w] = price
  return (c.input * i + c.output * o + c.cacheRead * r + c.cacheWrite * w) / 1e6
}

export const totalTokens = (c: Counts) => c.input + c.output + c.cacheRead + c.cacheWrite

export const usd = (v: number | null) => (v === null ? '—' : v < 0.005 ? '$0.00' : `$${v.toFixed(2)}`)

/** What the strip lists: running agents first, then the ones that finished lately; at most `max`. */
export const visibleAgents = (agents: Agent[], now: number, opts: { max?: number; keepMs?: number } = {}) => {
  const max = opts.max ?? 4
  const keepMs = opts.keepMs ?? 120_000
  const running = agents.filter(a => a.status === 'running')
  const recent = agents
    .filter(a => a.status !== 'running' && a.endedAt !== null && now - a.endedAt <= keepMs)
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
    `<rect x="2" y="2" width="1" height="1" fill="#1b1818"/><rect x="4" y="2" width="1" height="1" fill="#1b1818"/>`
  )
}

export const CARD_W = 248
export const CARD_H = 72
/** The height the bar takes at a card's foot: what a barless card leaves out. */
export const BAR_ROOM = 10

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The card's stats line, as drawn: tools, tokens, spend, and how long a finished one took.
 * A running card shows no ticking clock, so its line (and picture) changes only with its figures. */
export const agentStats = (a: Agent) => {
  const cost = agentUsd(a.model, a)
  const costText = cost === null ? '—' : `≈${usd(cost)}`
  const when = a.status === 'running' ? 'working' : fmtClock((a.endedAt ?? a.startedAt) - a.startedAt)
  return clip(`${a.tools} tools · ${fmtTokens(totalTokens(a))} · ${costText} · ${when}`, 40)
}

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
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'

  // A running card's border holds its accent: with the ring and the bar, it says "busy".
  const edge = running ? accent : '#3a3836'
  const edgeOpacity = running ? 0.55 : 1

  const sr = 6
  const sc = 2 * Math.PI * sr
  const mark = running
    ? `<circle cx="${W - 21}" cy="17" r="${sr}" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="2.2"/>` +
      `<circle cx="${W - 21}" cy="17" r="${sr}" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="${(sc * 0.3).toFixed(2)} ${sc.toFixed(2)}"/>`
    : a.status === 'done'
      ? iconGroup('check', '#7bd88f', W - 29, 9, 16, 3)
      : a.status === 'error'
        ? iconGroup('cross', '#f2736b', W - 29, 9, 16, 3)
        : iconGroup('ban', '#ffd9a0', W - 29, 9, 16, 2.6)

  const barX = 10
  const barW = W - 20
  const barY = H - 12
  const bar = opts.barless
    ? ''
    : `<rect x="${barX}" y="${barY}" width="${barW}" height="4" rx="2" fill="#2b2827"/>` +
      `<rect x="${barX}" y="${barY}" width="${running ? Math.round(barW * 0.3) : barW}" height="4" rx="2" fill="${accent}"/>`

  const card =
    `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="#1d1c1b" stroke="${edge}" stroke-opacity="${edgeOpacity}" stroke-width="1.5"/>` +
    `<svg x="10" y="9" width="38" height="38" viewBox="-1 -1 9 9" shape-rendering="crispEdges">${spriteInner(a.id, accent)}</svg>` +
    `<text x="58" y="23" ${font} font-size="13" font-weight="700" fill="#ece7e4"${nameFit}>${name}</text>` +
    `<text x="58" y="38" ${font} font-size="11" fill="#b9b3af">${model}</text>` +
    (effort ? `<text x="${58 + modelW + 7}" y="38" ${font} font-size="11" font-weight="700" fill="${accent}">${effort}</text>` : '') +
    `<text x="58" y="53" ${font} font-size="10.5" fill="#8f8985">${stats}</text>` +
    mark +
    bar

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + pad}" width="${W}" height="${H + pad}">${card}</svg>`,
    width: W,
    height: H + pad,
  }
}

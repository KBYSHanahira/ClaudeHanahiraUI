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

const FAMILY = '(haiku|sonnet|opus|fable)'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase()

/**
 * `claude-opus-5-5` -> `Opus 5.5`, in either naming order, ignoring a date suffix
 * (`claude-3-5-haiku-20241022` -> `Haiku 3.5`). A bare alias gives the family alone.
 * Anything it cannot read with confidence is shown exactly as given, never guessed at.
 */
export const prettyModel = (id: string) => {
  let m = new RegExp(`claude-${FAMILY}-(\\d{1,2})(?:-(\\d{1,2}))?(?!\\d)`, 'i').exec(id)
  if (m) return `${cap(m[1])} ${m[2]}${m[3] ? `.${m[3]}` : ''}`
  m = new RegExp(`claude-(\\d{1,2})(?:-(\\d{1,2}))?-${FAMILY}`, 'i').exec(id)
  if (m) return `${cap(m[3])} ${m[1]}${m[2] ? `.${m[2]}` : ''}`
  m = new RegExp(`^${FAMILY}$`, 'i').exec(id.trim())
  if (m) return cap(m[1])
  return id
}

/** US dollars per million tokens: input, output, cache read, cache write. List prices, rounded: edit to match yours. */
export const PRICES: Record<string, [number, number, number, number]> = {
  haiku: [1, 5, 0.1, 1.25],
  sonnet: [3, 15, 0.3, 3.75],
  opus: [5, 25, 0.5, 6.25],
  fable: [5, 25, 0.5, 6.25],
}

export type Counts = Pick<Agent, 'input' | 'output' | 'cacheRead' | 'cacheWrite'>

/** An estimate from token counts and the table above, not a bill. */
export const agentUsd = (model: string, c: Counts): number | null => {
  const family = /(haiku|sonnet|opus|fable)/i.exec(model)?.[1]?.toLowerCase()
  const price = family ? PRICES[family] : undefined
  if (!price) return null // an unknown model has no price here: say so, do not borrow another's
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

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * One agent as a card, all in one SVG so it can move as one piece. `pop` makes it bounce in
 * (it just appeared); `flash` washes its border green once (it just finished). A running
 * card has a pulsing border and a light travelling along its bar. SMIL: played only by an
 * `isInteractive` Svg, so `agentMoves` says when a card is worth that.
 */
export const agentCardSvg = (a: Agent, now: number, opts: { pop?: boolean; flash?: boolean; padBottom?: number } = {}) => {
  const W = CARD_W
  const H = CARD_H
  const pad = Math.max(0, Math.round(opts.padBottom ?? 0)) // transparent room under the card, in px
  const accent = accentFor(a.effort, a.model)
  const running = a.status === 'running'
  const ms = (a.endedAt ?? now) - a.startedAt
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
  // A running card shows no ticking clock: its picture would change every second and restart
  // the motion. A finished card shows how long it took.
  const when = running ? 'working' : fmtClock(ms)
  const cost = agentUsd(a.model, a)
  const costText = cost === null ? '—' : `≈${usd(cost)}`
  const stats = esc(clip(`${a.tools} tools · ${fmtTokens(totalTokens(a))} · ${costText} · ${when}`, 40))
  const font = 'font-family="ui-sans-serif,system-ui,sans-serif"'

  const border = running
    ? `<animate attributeName="stroke" values="#3a3836;${accent};#3a3836" dur="2s" repeatCount="indefinite"/>`
    : opts.flash
      ? `<animate attributeName="stroke" from="#7bd88f" to="#3a3836" dur="1.2s" fill="freeze"/>`
      : ''

  const mark = running
    ? `<circle cx="${W - 20}" cy="18" r="4" fill="#f2736b"><animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite"/></circle>`
    : a.status === 'done'
      ? iconGroup('check', '#7bd88f', W - 29, 9, 16, 3)
      : a.status === 'error'
        ? iconGroup('cross', '#f2736b', W - 29, 9, 16, 3)
        : iconGroup('ban', '#ffd9a0', W - 29, 9, 16, 2.6)

  const barX = 10
  const barW = W - 20
  const barY = H - 12
  const bar =
    `<rect x="${barX}" y="${barY}" width="${barW}" height="4" rx="2" fill="#2b2827"/>` +
    (running
      ? `<rect x="${barX}" y="${barY}" width="${Math.round(barW * 0.28)}" height="4" rx="2" fill="${accent}">` +
        `<animate attributeName="x" values="${barX};${barX + barW - Math.round(barW * 0.28)};${barX}" dur="1.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/></rect>`
      : `<rect x="${barX}" y="${barY}" width="${barW}" height="4" rx="2" fill="${accent}"/>`)

  const card =
    `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="#1d1c1b" stroke="#3a3836" stroke-width="1.5">${border}</rect>` +
    `<svg x="10" y="9" width="38" height="38" viewBox="-1 -1 9 9" shape-rendering="crispEdges">${spriteInner(a.id, accent)}</svg>` +
    `<text x="58" y="23" ${font} font-size="13" font-weight="700" fill="#ece7e4"${nameFit}>${name}</text>` +
    `<text x="58" y="38" ${font} font-size="11" fill="#b9b3af">${model}</text>` +
    (effort ? `<text x="${58 + modelW + 7}" y="38" ${font} font-size="11" font-weight="700" fill="${accent}">${effort}</text>` : '') +
    `<text x="58" y="53" ${font} font-size="10.5" fill="#8f8985">${stats}</text>` +
    mark +
    bar

  // Bounce in about the centre: grow past full size, settle back, fade up.
  const cx = W / 2
  const cy = H / 2
  const body = opts.pop
    ? `<g transform="translate(${cx} ${cy})"><g>` +
      `<animateTransform attributeName="transform" type="scale" values="0.82;1.06;1" keyTimes="0;0.6;1" dur="0.5s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1;0.4 0 0.4 1"/>` +
      `<animate attributeName="opacity" from="0" to="1" dur="0.25s" fill="freeze"/>` +
      `<g transform="translate(${-cx} ${-cy})">${card}</g></g></g>`
    : card

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + pad}" width="${W}" height="${H + pad}">${body}</svg>`,
    width: W,
    height: H + pad,
  }
}

/** True when a card has something to play: it is running, or it just appeared or finished. */
export const agentMoves = (a: Agent, opts: { pop?: boolean; flash?: boolean } = {}) => a.status === 'running' || opts.pop === true || opts.flash === true

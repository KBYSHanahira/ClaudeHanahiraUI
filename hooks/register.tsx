import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent, Info, Outcome, Skill, Stats, Tokens, Usage } from '../types'
import { agentChipParts, agentStats, kindLabel, prettyModel, settledStatus, taskNotice, visibleAgents } from './agents'
import {
  HUE,
  INK,
  PILL,
  badgeSvg,
  base,
  cardSvg,
  clip,
  countSvg,
  fmtClock,
  fmtCost,
  fmtElapsed,
  fmtReset,
  fmtSpeed,
  fmtTokens,
  glideHolder,
  glideStyle,
  reelHolder,
  pillSvg,
  ROW,
  liveSpeed,
  speedScale,
  tickerSvg,
  type Since,
  themed,
  tokensPerSec,
} from './chat'
export { clip }
import { CHARGE_COLOR, SEAM, chargeLevel, hudCellParts, hudCellSvg, hudChipSvg, hudContextParts, hudContextSvg, slabSvg, stripeSvg } from './hud'
import type { HudBar } from './hud'
import { iconGroup, iconSvg } from './icons'
import { SKILLS_FROM, SKILLS_VERSION, VERSION } from './version'
import type { IconName } from './icons'

const remember = <V,>(m: Map<string, V>, k: string, v: V) => {
  m.set(k, v)
  if (m.size > 400) m.delete(m.keys().next().value as string)
}

const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

/** The API's usage fields, any of which may be missing (the cache ones are null when unused). */
type UsageCounts = { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }
/** Counts plus one response's usage. A field the response leaves out adds nothing: one missing
 *  figure would otherwise make the running total NaN for the rest of the session. */
export const addUsage = <T extends Partial<Tokens>>(t: T, u: UsageCounts | null | undefined) => {
  const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    ...t,
    input: n(t.input) + n(u?.input_tokens),
    output: n(t.output) + n(u?.output_tokens),
    cacheRead: n(t.cacheRead) + n(u?.cache_read_input_tokens),
    cacheWrite: n(t.cacheWrite) + n(u?.cache_creation_input_tokens),
  }
}
const tokens = atom({ plugin: 'hanahira-claude-ui', key: 'tokens' } as const, NO_TOKENS)

const EMPTY: Stats = { tools: 0, byTool: {}, files: [], last: null }
const NO_USAGE: Usage = { usd: null, percent: null, tokens: null, window: null, limits: [] }

// `tone`: the tile is a state (`short`, in this colour), read under the value when stacked.
// `spark`: the state tile's motion (statSvg), drawn in the surface's frame while Claude works.
type Tile = { key: string; icon: IconName; percent: number | null; big: string; caption: string; sub?: string; short: string; detail?: string; color?: string; calm?: boolean; tone?: string; spark?: { pulse?: boolean; enterFrom?: string }; toggle?: { on: boolean; enter?: number | null; motion?: boolean }; reel?: Since<string> | null; from?: Since<number> | null; name?: string; bars?: HudBar[]; charge?: number }
// Output speed of the latest main-thread response, and the best seen: the ring fills against it.
const speed = atom({ plugin: 'hanahira-claude-ui', key: 'speed' } as const, { tps: null as number | null, peak: 0 })
// How often the live speed redraws the gauge while a response streams, in ms. Each one redraws
// the whole band (some thirty pictures), so twice a second: live enough, at half the load of four.
const LIVE_SPEED_MS = 500
const usage = atom({ plugin: 'hanahira-claude-ui', key: 'usage' } as const, NO_USAGE)
// The weeks counted for one model alone (Fable), which the engine does not hand to a plugin:
// read from the account's usage answer, and when (`at`, ms; 0 before the first try).
const scoped = atom({ plugin: 'hanahira-claude-ui', key: 'scoped' } as const, { at: 0, limits: [] as Usage['limits'] })
// How often that answer is asked for at most, in ms: once a minute, so the per-model week keeps
// up with the work; after a refused or failed request, SCOPED_BACKOFF_MS (the engine's own pace
// for its panel) before the next.
const SCOPED_MS = 60_000
const SCOPED_BACKOFF_MS = 300_000
// How often a running turn re-reads the engine's own figures (limits, context, spend), in ms.
// The engine raises `session.measure` after a turn and when a window moves a whole point; on a
// long turn that leaves the band behind, and the plain `$.session.usage()` call costs nothing.
const USAGE_MS = 10_000
const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
/**
 * Asks the account for its usage, at most once every SCOPED_MS, and keeps the per-model weeks.
 * The session's credential never reaches this code: `$.session.authorize()` gives a handle and
 * the host sets the header itself, for Anthropic's own host alone. With no subscription login
 * (an API key, a gateway) or a refused request, the last reading stays and nothing is guessed.
 */
const refreshScoped = async ($: EngineInterface) => {
  const [now, last] = await Promise.all([$.clock.now(), read($, scoped)])
  // `at` is when the next request may go: SCOPED_MS after a good answer, longer after a bad one.
  if (now < (last?.at ?? 0)) return
  const keep = Array.isArray(last?.limits) ? last.limits : []
  // Marked as tried first, so a failure waits its turn too instead of asking on every beat.
  await update($, scoped, () => ({ at: now + SCOPED_BACKOFF_MS, limits: keep }))
  try {
    const auth = await $.session.authorize()
    if (auth?.kind !== 'bearer') return
    const res = await $.http.fetch(USAGE_URL, { auth: auth.handle, headers: { 'anthropic-beta': 'oauth-2025-04-20', accept: 'application/json' } })
    if (!res.ok) return void $.ui.log(`account usage: HTTP ${res.status}`, { to: 'debug' })
    const limits = scopedLimits(res.text)
    // The same reading keeps the stored list, so the band is not redrawn for nothing.
    await update($, scoped, () => ({ at: now + SCOPED_MS, limits: sameLimits(limits, keep) ? keep : limits }))
  } catch (err) {
    $.ui.log(`account usage: ${err instanceof Error ? err.message : String(err)}`, { to: 'debug' })
  }
}

/** Two lists of limits read the same: no redraw is owed. */
export const sameLimits = (a: Usage['limits'], b: Usage['limits']) =>
  a.length === b.length && a.every((l, i) => l.kind === b[i]!.kind && l.percentUsed === b[i]!.percentUsed && l.resetsAt === b[i]!.resetsAt)

/**
 * The engine's figures as they stand now, into the band's own: asked for while a turn runs
 * (USAGE_MS), since the engine raises `session.measure` only after a turn or a whole point.
 * An unchanged reading stores nothing, so nothing is redrawn; then the per-model weeks, at
 * their own pace.
 */
const refreshUsage = async ($: EngineInterface) => {
  const fresh = await $.session.usage().catch(() => null)
  if (!fresh) return
  const next: Usage = {
    usd: fresh.cost?.usd ?? null,
    percent: fresh.context.percent ?? null,
    tokens: fresh.context.tokens ?? null,
    window: fresh.context.window,
    limits: fresh.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
  }
  const old = await read($, usage)
  const same = old && old.usd === next.usd && old.percent === next.percent && old.tokens === next.tokens && old.window === next.window && sameLimits(next.limits, Array.isArray(old.limits) ? old.limits : [])
  if (!same) await update($, usage, () => next)
  if (next.limits.some(l => l.kind === 'seven_day')) await refreshScoped($)
}
// The model the main thread last answered with, as the API reported it.
const model = atom({ plugin: 'hanahira-claude-ui', key: 'model' } as const, null as string | null)

const stats = atom({ plugin: 'hanahira-claude-ui', key: 'stats' } as const, EMPTY)
/** A stored value is whatever an earlier version or a reload left behind: never trust its shape. */
export const asList = (v: unknown): Agent[] => (Array.isArray(v) ? (v as Agent[]) : [])
const agents = atom({ plugin: 'hanahira-claude-ui', key: 'agents' } as const, [] as Agent[])

// Hanahira Claude UI mode, shown after the speed: on while its skills are at work.
const skill = atom({ plugin: 'hanahira-claude-ui', key: 'skill' } as const, { on: false, loaded: [] } as Skill)
// How the latest main turn ended; none before the first one ends, and none while one runs.
const outcome = atom({ plugin: 'hanahira-claude-ui', key: 'outcome' } as const, null as Outcome | null)
const SKILL_ON = HUE.petal // the mascot's pink: the mode is awake
const SKILL_OFF = INK.detail // asleep: quiet grey, nothing is wrong
export const asSkill = (v: unknown): Skill => {
  const s = v as Partial<Skill> | null | undefined
  const loaded = Array.isArray(s?.loaded) ? s.loaded.filter((x): x is string => typeof x === 'string') : []
  return { on: s?.on === true, loaded }
}
/** Which part of Hanahira Claude UI a skill is ('core', 'design', ...), or null for any other skill. */
export const hanahiraPart = (name: string): string | null => {
  const m = /^hanahira-claude-ui(?:-([a-z][a-z-]*))?$/.exec(name.slice(name.lastIndexOf(':') + 1))
  return m ? (m[1] ?? 'core') : null
}
// The person's switches, as the core skill reads them: a command, or the request in English or
// Thai. A question ("is Hanahira Claude UI on?") switches nothing, nor does `เปิด` hide a `ปิด`.
const SWITCH_ON =
  /hanahira claude ui\s+(?:v\d+\s+)?(?:on|ultra)\b(?!\s*\?)|\b(?:turn\s+on|use)\s+(?:the\s+)?hanahira claude ui\b|เปิด\s*(?:โหมด\s*)?hanahira claude ui/gi
const SWITCH_OFF = /hanahira claude ui\s+(?:v\d+\s+)?off\b(?!\s*\?)|\bturn\s+off\s+(?:the\s+)?hanahira claude ui\b|(?<!เ)ปิด\s*(?:โหมด\s*)?hanahira claude ui/gi
/**
 * A prompt that is a Hanahira skill's own command (`/hanahira-claude-ui:…`): its part, and on
 * unless its argument is `off`. The engine names the command (`{ name, args }`, newer engines);
 * else the text does, typed (`/name args`) or as the engine wraps it (`<command-name>`).
 */
export const skillCommand = (text: string, command?: unknown): { part: string; on: boolean } | null => {
  const c = command as { name?: unknown; args?: unknown } | null | undefined
  const typed =
    /^\s*\/(\S+)(?:\s+(.*))?$/s.exec(text) ??
    /<command-name>\/?([^<\s]+)<\/command-name>(?:[\s\S]*?<command-args>([\s\S]*?)<\/command-args>)?/.exec(text)
  const name = typeof c?.name === 'string' ? c.name : typed?.[1]
  const args = typeof c?.args === 'string' ? c.args : (typed?.[2] ?? '')
  const part = name ? hanahiraPart(name) : null
  return part === null ? null : { part, on: !/^off\b/i.test(args.trim()) }
}
// A transcript row as `$.session.messages()` gives it, as far as the mode needs it.
type ModeRow = { role: string; text?: string; toolUses?: readonly { tool: string; input: Record<string, unknown> }[]; toolResults?: readonly unknown[] }
// What the engine and the skills write into a user message: none of it is the person's switch.
const NOT_TYPED = /<(system-reminder|task-notification|local-command-stdout|local-command-caveat)>[\s\S]*?<\/\1>/g
/**
 * The mode as the transcript tells it, by the core skill's own rule: the person's last switch
 * decides, and a skill of it loading turns it on. An `off` holds until the person writes again,
 * so the skill loaded to say "off" switches nothing back on. A skill's text, sent as a user
 * message, is the skill speaking, not the person.
 */
export const modeFrom = (rows: readonly ModeRow[]): Skill => {
  let mode: Skill = { on: false, loaded: [] }
  let off = false
  const load = (part: string) => {
    if (!off) mode = { on: true, loaded: mode.loaded.includes(part) ? mode.loaded : [...mode.loaded, part] }
  }
  for (const r of rows) {
    if (r.role !== 'user') {
      for (const u of r.toolUses ?? []) {
        const part = u.tool === 'Skill' && typeof u.input?.skill === 'string' ? hanahiraPart(u.input.skill) : null
        if (part !== null) load(part)
      }
      continue
    }
    const text = (r.text ?? '').replace(NOT_TYPED, ' ')
    if (r.toolResults?.length || !text.trim()) continue
    const cmd = skillCommand(text)
    if (!cmd && text.includes('Base directory for this skill:')) continue
    const s = cmd ? (cmd.on ? 'on' : 'off') : modeSwitch(text)
    off = s === 'off'
    if (s === 'off') mode = { on: false, loaded: [] }
    else if (cmd) load(cmd.part)
    else if (s === 'on') mode = { ...mode, on: true }
  }
  return mode
}
/** The last switch in a prompt, or null; code and quoted lines are not the person's switch. */
export const modeSwitch = (text: string): 'on' | 'off' | null => {
  const own = text.replace(/```[\s\S]*?(?:```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/^[ \t]*>.*$/gm, ' ')
  const last = (re: RegExp) => Math.max(-1, ...[...own.matchAll(re)].map(m => m.index ?? -1))
  const on = last(SWITCH_ON)
  const off = last(SWITCH_OFF)
  return on < 0 && off < 0 ? null : off > on ? 'off' : 'on'
}
// The widest each compact-band column has been, per layout: a column only ever widens, so a
// value that gains or loses a digit while a turn runs never moves its neighbours.
const colMax = new Map<string, number>()
const efforts = new Map<string, string>()
// A change plays once, in CSS inside its picture (see MOTION in chat.ts): the figures written
// out roll in (reelHolder, reelText), rings, meters and the speed needle glide (glideHolder).
// Each holds where it came from while it plays, so a redraw then sends the same picture.
const glides = glideHolder()
const reels = reelHolder()

const tick = atom({ plugin: 'hanahira-claude-ui', key: 'tick' } as const, 0)

/**
 * The charge level the speed cell shows: a new level is taken once the speed has stayed at it
 * for `holdMs`, so a speed hovering at a threshold does not swap the arcs' pictures (each swap
 * loads them anew) several times a second. From none, and to none, at once.
 */
export const chargeHolder = (holdMs = 2500) => {
  let shown = 0
  let want = 0
  let since = 0
  return (level: number, nowMs: number) => {
    if (level !== want) {
      want = level
      since = nowMs
    }
    if (shown === 0 || level === 0 || nowMs - since >= holdMs) shown = level
    return shown
  }
}
const chargeHeld = chargeHolder()
const runMs = atom({ plugin: 'hanahira-claude-ui', key: 'runMs' } as const, 0)
const seconds = atom({ plugin: 'hanahira-claude-ui', key: 'seconds' } as const, null)
const info = atom({ plugin: 'hanahira-claude-ui', key: 'info' } as const, null)

// Look and feel: edit these.
// Ring size in px: also sets how close the two rows of tiles sit.
const RING = 38

// The px between two cards of the grid, drawn as an empty picture so it is exact (a Box gap is
// in cells). With each card's own margin (GLASS.margin) the cards sit 8px apart.
const GRID_GAP = 4
const blankArt = (width: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 1" width="${width}" height="1"><rect width="${width}" height="1" fill="none"/></svg>`
const GAP_ART = blankArt(GRID_GAP)

// Stat cards: least width in cells, so they do not shrink to their text.
const CARD_MIN = 18

const THEME = {
  accent: HUE.sky, // the speed meter and other calm gauges
  working: HUE.sky, // the status chip (and, without pictures, the dot) while Claude works
  bar: HUE.hazard, // the loading bar's warning stripes while Claude works
  done: '#8fdcb9', // both once the turn is done
  warm: HUE.sky, // frame, the context meter, the limit meters at rest
  muted: INK.detail, // the figures' icons: quiet, so the meter leads
  fallbackTitle: 'Hanahira',
  // The band's rounded frame; off since each cell is its own glass card.
  frame: false,
  // Two even rows of one-line stats (gauges over figures, in aligned columns) in place of
  // three-line tiles over tall cards: about half the height. false brings back the full band.
  compact: true,
  barPx: 2400, // widest the loading bar is drawn, in px: the surface clips it to its room
  barHeight: 10, // its height in px: leaning stripes
  barMin: 200, // the least the bar is drawn on the top line, in px: under that it takes its own line
  barGap: 4, // room under the bar, in px: keeps it off the rings below
  listAgents: 6, // cards on the strip (agents and background commands): running first, then the latest finished
  keepFinishedMs: 3000, // a finished agent's card stays this long (to show the check), then goes
  stripGap: 8, // room under the agent strip, in px: keeps it off the band's frame
  // Icons in front of each label: swap for any glyph or emoji.
}

type Word = { text: string; quoted: boolean; runs: boolean }

/**
 * A command line read the way the shell reads it: the simple commands it runs, each a list of
 * words with quotes and backslashes taken off. `;`, `|`, `&`, a newline, `(`, `)` and a backtick
 * end a command (`2>&1` and `&>` are redirections, not ends); a backslash-newline joins lines.
 * A quoted word remembers it was quoted, and `runs` marks a double-quoted one holding `$(` or a
 * backtick, which the shell runs even inside the quotes.
 */
const shellCommands = (line: string): Word[][] => {
  const s = line.replace(/\\\r?\n/g, ' ')
  const out: Word[][] = [[]]
  let word = ''
  let quoted = false
  let runs = false
  let has = false
  const end = () => {
    if (has) out[out.length - 1]!.push({ text: word, quoted, runs })
    word = ''
    quoted = runs = has = false
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (c === "'") {
      const close = s.indexOf("'", i + 1)
      const to = close < 0 ? s.length : close
      word += s.slice(i + 1, to)
      quoted = has = true
      i = to
    } else if (c === '"') {
      let j = i + 1
      for (; j < s.length && s[j] !== '"'; j++) {
        if (s[j] === '\\' && j + 1 < s.length) j++
        else if (s[j] === '`' || (s[j] === '$' && s[j + 1] === '(')) runs = true
        word += s[j]
      }
      quoted = has = true
      i = j
    } else if (c === '\\') {
      word += s[i + 1] ?? ''
      has = true
      i++
    } else if (/\s/.test(c) && c !== '\n') {
      end()
    } else if (c === '&' && (s[i - 1] === '>' || s[i - 1] === '<' || s[i + 1] === '>')) {
      word += c
      has = true
    } else if (';&|\n()`'.includes(c)) {
      end()
      out.push([])
    } else {
      word += c
      has = true
    }
  }
  end()
  return out.filter(ws => ws.length)
}

const command = (w: string) => w.split('/').pop()!
const isVolumesFlag = (w: string) =>
  w === '--volumes' || (w.startsWith('--volumes=') && !/=(?:false|0)$/i.test(w)) || /^-[a-zA-Z]*v[a-zA-Z]*$/.test(w)

/** `docker compose … down … -v` (or `docker-compose`), with the flag in any spelling. */
const removesVolumes = (ws: string[]) => {
  const at = ws.findIndex((w, i) => command(w) === 'docker-compose' || (command(w) === 'docker' && ws.slice(i + 1).includes('compose')))
  if (at < 0) return false
  const down = ws.indexOf('down', at + 1)
  return down >= 0 && ws.slice(down + 1).some(isVolumesFlag)
}

/** `ufw enable`, whatever options come before the verb. */
const enablesFirewall = (ws: string[]) => {
  const at = ws.findIndex(w => command(w) === 'ufw')
  return at >= 0 && ws.slice(at + 1).find(w => !w.startsWith('-')) === 'enable'
}

/** Programs whose quoted argument is itself a command line they run. */
const RUNNERS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'eval', 'ssh', 'su', 'watch', 'xargs'])

// `down` removing volumes in any spelling (-v, a short-flag bundle with v, --volumes), and `ufw
// enable`, within one command: a later `ls -v` is not read as down's flag. Text in quotes is an
// argument, not a command (`git commit -m "… ufw enable"`), unless the shell or a runner
// (`bash -c`, `ssh host`) will run it.
export const dangerous = (line: string): boolean =>
  shellCommands(line).some(ws => {
    const words = ws.map(w => w.text)
    if (removesVolumes(words) || enablesFirewall(words)) return true
    const runner = words.some(w => RUNNERS.has(command(w)))
    return ws.some(w => w.quoted && (runner || w.runs) && dangerous(w.text))
  })

export const top = (byTool: Record<string, number>, n: number) =>
  Object.entries(byTool)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)



/** Context meter: ▰ filled, ▱ empty. */
export const meter = (percent: number, width: number) => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return { filled: '▰'.repeat(filled), rest: '▱'.repeat(width - filled) }
}

/** Green while there is room, amber as it fills, red near the limit. */
export const tone = (percent: number) => (percent >= 85 ? '#f2879a' : percent >= 60 ? '#f3cf7a' : '#8fdcb9')

// A limit's colour says how near it is: calm fur, butter from 60%, rose from 85%.
export const ringColor = (percent: number) => (percent >= 85 ? HUE.rose : percent >= 60 ? HUE.butter : THEME.warm)

/** A donut gauge as SVG: a dim track and an arc from 12 o'clock, clockwise. */
export const ringSvg = (percent: number, color: string, size: number, opts: { icon?: IconName; bigIcon?: boolean; from?: Since<number> | number | null } = {}) => {
  // `bigIcon`, for a ring drawn small: a thinner ring and a larger icon, so the icon still
  // reads as what it is at a text row's height.
  const stroke = opts.bigIcon ? 3.5 : 5
  const r = (44 - stroke) / 2
  const c = 2 * Math.PI * r
  const length = (p: number) => (Math.max(0, Math.min(100, p)) / 100) * c
  const arc = length(percent)
  // With `from`, the arc glides there from that reading (glideHolder), in CSS.
  const dash = (p: number) => `${length(p).toFixed(2)} ${c.toFixed(2)}`
  // A disc tinted the arc's colour fills the middle, and the icon fills the disc: big enough
  // to read at a glance, so the gauge reads as one piece.
  const disc = `<circle cx="22" cy="22" r="${opts.bigIcon ? 17 : 15}" fill="${color}" fill-opacity="0.13"/>`
  const track = `${disc}<circle cx="22" cy="22" r="${r}" fill="none" stroke="#2c2c31" stroke-width="${stroke}"/>`
  const fill =
    arc > 0
      ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash(percent)}" transform="rotate(-90 22 22)" class="arc"/>` +
        glideStyle('arc', 'stroke-dasharray', dash, opts.from, percent)
      : ''
  const iconPx = opts.bigIcon ? 25 : 20
  const mark = opts.icon ? iconGroup(opts.icon, color, 22 - iconPx / 2, 22 - iconPx / 2, iconPx, opts.bigIcon ? 2.3 : 2.1) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}">${track}${fill}${mark}</svg>`
}

/** One-cell ring for a surface that cannot draw SVG; no reading draws an empty ring, never a full one. */
export const glyph = (percent: number) =>
  !Number.isFinite(percent) || percent < 12.5 ? '○' : percent < 37.5 ? '◔' : percent < 62.5 ? '◑' : percent < 87.5 ? '◕' : '●'

export const limitLabel = (kind: string) =>
  kind === 'five_hour' ? '5-hour limit' : kind === 'seven_day' ? '7-day limit' : kind === 'spend_limit' ? 'spend limit' : kind

/** What is left of the context window: the tokens when known, else the share. */
export const contextLeft = (tokens: number | null, window: number | null, percent: number | null) =>
  tokens !== null && window !== null && Number.isFinite(window - tokens)
    ? `${fmtTokens(Math.max(0, window - tokens))} left`
    : percent !== null && Number.isFinite(percent)
      ? `${share(percent)}% left`
      : null

/** The share left of 100, from 0 to 100 whatever the engine reports. */
const share = (percentUsed: number) => Math.min(100, Math.max(0, 100 - Math.round(percentUsed)))

/** What is left of a rate limit, as a share. */
export const limitLeft = (percentUsed: number) => (Number.isFinite(percentUsed) ? `${share(percentUsed)}% left` : '—')

/** The limit's name on the compact band, where every character costs room on one line. */
/** A weekly limit kept for one model alone (`seven_day_fable`): that model's name, else null. */
export const weeklyModel = (kind: string) => (kind.startsWith('seven_day_') && kind.length > 10 ? kind.slice(10).replace(/_/g, ' ') : null)

/**
 * The weeks counted for one model alone, from the account's usage answer (the body of
 * `/api/oauth/usage`, the engine's own source for its usage panel): each `weekly_scoped` row
 * of `limits` as a limit of the band's, its kind `seven_day_<model>`. Anything else in the
 * body, or a body that is not that answer, gives none: never a guessed figure.
 */
export const scopedLimits = (body: string): Usage['limits'] => {
  let rows: unknown
  try {
    rows = (JSON.parse(body) as { limits?: unknown } | null)?.limits
  } catch {
    return []
  }
  if (!Array.isArray(rows)) return []
  const out: Usage['limits'] = []
  for (const row of rows as { kind?: unknown; percent?: unknown; resets_at?: unknown; scope?: { model?: { display_name?: unknown } } }[]) {
    const name = row?.scope?.model?.display_name
    if (row?.kind !== 'weekly_scoped' || typeof name !== 'string' || typeof row.percent !== 'number' || !Number.isFinite(row.percent)) continue
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!slug || out.some(l => l.kind === `seven_day_${slug}`)) continue
    // The reset is an ISO time, or seconds since the epoch.
    const at = typeof row.resets_at === 'number' && Number.isFinite(row.resets_at) ? new Date(row.resets_at * 1000).toISOString() : typeof row.resets_at === 'string' ? row.resets_at : undefined
    out.push({ kind: `seven_day_${slug}`, percentUsed: Math.max(0, Math.round(row.percent * 10) / 10), ...(at ? { resetsAt: at } : {}) })
  }
  return out
}

export const shortLimitLabel = (kind: string) =>
  kind === 'five_hour' ? '5h limit' : kind === 'seven_day' ? '7d limit' : limitLabel(kind)

const short = (tool: string) => tool.replace(/^mcp__.*__/, '')

type PillSpec = { text: string; fg: string; bg: string; color?: string; running?: boolean; icon?: 'check' | 'cross' | 'ban'; minWidth?: number }

const PILL_GLYPH = { check: '✓', cross: '✕', ban: '⊘' }

/**
 * A status at the right of a row, in the row's own grammar: a tile tinted the state's colour
 * with its mark (a check, a cross, dots while running), then the word in that colour, as the
 * left side shows the kind's tile and verb. A bare figure (+12, −3) is the word alone. Held to a
 * width (`minWidth`), it stays a capsule. Without SVG, a tinted text block.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pillEl = (els: { Text: any; Svg: any; Box?: any }, p: PillSpec) => {
  const { Text, Svg, Box } = els
  if (!Svg) {
    const label = p.icon ? `${PILL_GLYPH[p.icon]} ${p.text}` : p.text
    return <Text backgroundColor={p.bg} color={p.fg} bold>{` ${label} `}</Text>
  }
  if (p.minWidth !== undefined || !Box) {
    const b = pillSvg(p.text, p.fg, p.bg, ROW.pill, p.running === true, p.icon, p.minWidth)
    // An image, never a frame: a frame reloads (and blanks) whenever its picture changes.
    return <Svg source={b.svg} alt={p.text} width={b.width} height={b.height} />
  }
  const color = p.color ?? p.fg
  const mark = p.running ? 'dots' : p.icon
  const word = p.text.charAt(0).toUpperCase() + p.text.slice(1)
  return (
    <Box gap={1} alignItems="center">
      {mark ? <Svg source={badgeSvg(color, mark, ROW.tile, p.running === true)} alt={mark} width={ROW.tile} height={ROW.tile} /> : null}
      <Text weight="semibold" color={color}>{word}</Text>
    </Box>
  )
}

/** A small icon where the surface draws SVG, else a plain glyph. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconEl = (els: { Text: any; Svg: any }, name: IconName, color: string, size: number, fallback: string) => {
  const { Text, Svg } = els
  return Svg ? <Svg source={themed(iconSvg(name, color, size))} alt={name} width={size} height={size} /> : <Text dimColor>{fallback}</Text>
}

// A second beat while an agent runs: it can outlive the turn that started it.
let agentTicker: { cancel: () => void } | null = null
// True while a turn's own beat runs: it redraws the band every second already, so the agents'
// beat then only looks at the engine's list, and the band is not redrawn twice a second.
let turnBeat = false

// The folder and its branch. Read again after every turn: a turn can switch the branch.
// One of Hanahira Claude UI's skills loaded: the mode is on, and the part is named. At the top
// of the file, as the engine lets `$` be handed only to a function declared here.
const loadPart = ($: EngineInterface, part: string) =>
  update($, skill, v => {
    const { loaded } = asSkill(v)
    return { on: true, loaded: loaded.includes(part) ? loaded : [...loaded, part] }
  })

// The mode, read again from the transcript: it outlives a reload, and a skill load whose event
// another plugin kept from this one.
const reconcileMode = async ($: EngineInterface) => {
  const rows = await $.session.messages().catch(() => null)
  if (Array.isArray(rows)) await update($, skill, () => modeFrom(rows as readonly ModeRow[]))
}

const locate = async ($: EngineInterface) => {
  const cwd = await $.session.cwd()
  const git = await $.process
    .run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd })
    .catch(() => null)
  const branch = git !== null && git.exitCode === 0 ? git.stdout.trim() : null
  const value: Info = { name: base(cwd), branch }
  await update($, info, old => (old?.name === value.name && old?.branch === value.branch ? old : value))
}

// A card whose agent ended without a turn.complete of its own (stopped from the tasks list,
// say) would read "running" for good and keep the beat going: the engine's list settles it.
const reconcileAgents = async ($: EngineInterface) => {
  const list = asList(await read($, agents))
  const live = list.some(a => a.status === 'running') ? await $.agent.list().catch(() => null) : null
  if (live) {
    const byId = new Map(live.map(a => [a.id, a.status]))
    const now = await $.clock.now()
    const settled = (s: string | undefined): Agent['status'] | null =>
      s === undefined || s === 'completed' ? 'done' : s === 'failed' ? 'error' : s === 'killed' ? 'stopped' : null
    let changed = false
    await update($, agents, l =>
      asList(l).map(a => {
        // A background command is no agent: the engine's agent list never names it, so only its
        // notification settles it (prompt.submit).
        const status = a.status === 'running' && a.kind !== 'shell' ? settled(byId.get(a.id)) : null
        if (status) changed = true
        return status ? { ...a, status, endedAt: now } : a
      }),
    )
    // A card settled here leaves like any other: one redraw once its stay is over.
    if (changed) $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
  }
  await restAgentBeat($)
}

// Nothing running any more: the beat stops. Every path that settles a card ends here, so the
// beat never outlives the last running card (a background command settled by its notification).
const restAgentBeat = async ($: EngineInterface) => {
  if (asList(await read($, agents)).some(a => a.status === 'running')) return
  agentTicker?.cancel()
  agentTicker = null
}

// The beat while an agent runs: a redraw a second (unless the turn's own beat redraws), and every
// few seconds a look at the engine's list, so an agent that ends while the session is idle still
// settles its card.
const agentBeat = ($: EngineInterface) => {
  if (agentTicker) return
  let beats = 0
  agentTicker = $.clock.every(1000, () => {
    beats += 1
    if (beats % 5 === 0) void reconcileAgents($).catch(() => undefined)
    if (!turnBeat) void update($, tick, n => (n ?? 0) + 1)
  })
}

export const register: Register = on => {
  let startedAt = 0
  let ticker: { cancel: () => void } | null = null
  // What the running turn's clock shows: set on each beat alone, so it moves once a second
  // whenever else the band redraws. Every other figure shows its value as it comes, on its own.
  let beatSecs = 0
  // When the running turn last re-read the engine's figures (refreshUsage), in ms.
  let usageAt = 0
  // One redraw as the last motion under way ends, so the band rests on its plain pictures even
  // with nothing else to redraw it (a turn just ended): a surface that stopped painting a
  // picture mid-motion (a window out of focus) then shows where it rests, not a frame of it.
  let restDue = 0
  // Characters of streamed text per output token, learned from each finished response, so the
  // live speed reads in tokens; 4 until the first response has been measured.
  let charsPerToken = 4
  // This prompt switched the mode off: the skill it loads to say so does not switch it back on.
  let switchedOff = false

  on('session.start', async ($, e, next) => {
    await locate($)
    await reconcileMode($)
    // Fresh figures at load, so a change of shape (a new field) shows at once, not next turn.
    const fresh = await $.session.usage().catch(() => null)
    if (fresh) {
      await update($, usage, () => ({
        usd: fresh.cost?.usd ?? null,
        percent: fresh.context.percent ?? null,
        tokens: fresh.context.tokens ?? null,
        window: fresh.context.window,
        limits: fresh.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
      }))
      if (fresh.rateLimits.some(l => l.kind === 'seven_day')) await refreshScoped($)
    }
    return next(e)
  })

  // Spend and context fill, as the status line has them.
  on('session.measure', async ($, e, next) => {
    await update($, usage, () => ({
      usd: e.cost?.usd ?? null,
      percent: e.context.percent ?? null,
      tokens: e.context.tokens ?? null,
      window: e.context.window,
      limits: e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
    }))
    // Only an account with a weekly limit has a week counted per model.
    if (e.rateLimits.some(l => l.kind === 'seven_day')) await refreshScoped($)
    return next(e)
  })

  // Hanahira Claude UI mode: the person's switch turns it on or off; one of its skills loading
  // turns it on and names the part. A skill loads typed as /name (prompt.submit) or through the
  // Skill tool (tool.call). No skill.prompt hook: a security plugin answers that event first and
  // passes it on past this one, and the engine then prints a skipped-hook line on every load.

  on('prompt.submit', async ($, e, next) => {
    // A background task's notification settles its card (an agent's or a command's) and,
    // being nobody's typing, switches nothing.
    const notice = taskNotice(e.text)
    if (notice) {
      const status = settledStatus(notice.status)
      const list = asList(await read($, agents))
      if (status && list.some(a => a.id === notice.id && a.status === 'running')) {
        const now = await $.clock.now()
        await update($, agents, l => asList(l).map(a => (a.id === notice.id && a.status === 'running' ? { ...a, status, endedAt: now } : a)))
        $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
        await restAgentBeat($)
      }
    }
    // A prompt the person did not type (isMeta, newer engines) switches nothing.
    const typed = !(e as { isMeta?: true }).isMeta && !notice
    const cmd = typed ? skillCommand(e.text, (e as { command?: unknown }).command) : null
    const s = cmd ? (cmd.on ? 'on' : 'off') : typed ? modeSwitch(e.text) : null
    // Only the person's own prompt sets it: a notification arriving mid-turn must not clear an `off`.
    if (typed) switchedOff = s === 'off'
    if (s === 'off') await update($, skill, () => ({ on: false, loaded: [] }))
    else if (cmd) await loadPart($, cmd.part)
    else if (s === 'on') await update($, skill, v => ({ ...asSkill(v), on: true }))
    return next(e)
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const part = hanahiraPart(e.skill)
    if (part !== null && !switchedOff) await loadPart($, part)
    return next(e)
  })

  // The main turn starts: the clock and the beat start here, not at prompt.submit, which a
  // turn begun without a typed prompt (a continuation) never raises, and which a prompt typed
  // while a turn runs raises mid-turn.
  on('turn.start', async ($, e, next) => {
    const startedAgent = (e as unknown as { agentId?: string }).agentId
    if (startedAgent !== undefined) {
      // An ended agent sent a message works again under its id: its card runs again.
      const known = asList(await read($, agents)).find(a => a.id === startedAgent)
      if (known && known.status !== 'running') {
        await update($, agents, l => asList(l).map(a => (a.id === startedAgent ? { ...a, status: 'running' as const, endedAt: null } : a)))
        agentBeat($)
      }
      return next(e)
    }
    startedAt = await $.clock.now()
    // A beat every second while the turn runs, so the clock and figures move live.
    ticker?.cancel()
    const turnStart = startedAt
    beatSecs = 0
    turnBeat = true
    ticker = $.clock.every(1000, () => {
      void (async () => {
        // Seconds by the clock, not by counting beats: a timer held back (a window out of
        // focus) then still reads true, and a long turn's clock never stops short.
        beatSecs = Math.max(0, Math.floor(((await $.clock.now()) - turnStart) / 1000))
        await update($, tick, n => (n ?? 0) + 1)
        // The limits, context and spend, re-read as the turn goes: not on every beat.
        const now = await $.clock.now()
        if (now - usageAt >= USAGE_MS) {
          usageAt = now
          await refreshUsage($).catch(() => {})
        }
      })()
    })
    await update($, stats, () => EMPTY)
    await update($, outcome, () => null)
    return next(e)
  })

  // A subagent starts: one record, kept while it runs and a while after.
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (e.workflow || e.isTeammate || !('agentId' in r) || !r.agentId) return r
    const agentId = r.agentId
    const now = await $.clock.now()
    const a: Agent = {
      id: agentId,
      name: e.description || e.subagentType,
      type: e.subagentType,
      model: r.model,
      effort: efforts.get(e.tool_use_id) ?? null,
      background: e.background,
      status: 'running',
      startedAt: now,
      endedAt: null,
      tools: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    }
    await update($, agents, list => [...asList(list).filter(x => x.id !== agentId), a].slice(-12))
    agentBeat($)
    return r
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    if (dangerous(e.command)) {
      return { deny: `${$.plugin.name}: blocked (compose down -v / firewall enable)` }
    }
    return next(e)
  })

  // Every tool call: stats, and an agent's start and end. One unmatched hook only.
  on('tool.call', async ($, e, next) => {
    const name = short(e.tool as string)

    // Bookkeeping calls are not work worth counting.
    if (name === 'TodoWrite' || name === 'update_plan' || name === 'wrap_up') return next(e)

    // Work done inside a subagent counts on its card; asking for one remembers the effort.
    const agentId = (e as unknown as { agentId?: string }).agentId
    if (agentId) {
      await update($, agents, list => asList(list).map(a => (a.id === agentId ? { ...a, tools: a.tools + 1 } : a)))
    }
    if (name === 'Agent' || name === 'Task') {
      const effort = (e as unknown as { effort?: string }).effort
      if (effort) remember(efforts, e.tool_use_id, effort)
    }

    const args = e as unknown as { file_path?: string; command?: string; pattern?: string }
    const target = args.file_path ? base(args.file_path) : (args.command ?? args.pattern ?? '')
    const isWrite = name === 'Edit' || name === 'Write' || name === 'NotebookEdit'
    await update($, stats, s => ({
      tools: s.tools + 1,
      byTool: { ...s.byTool, [name]: (s.byTool[name] ?? 0) + 1 },
      files:
        isWrite && args.file_path && !s.files.includes(args.file_path)
          ? [...s.files, args.file_path]
          : s.files,
      last: target ? `${name} ${clip(target.replace(/\s+/g, ' '), 38)}` : name,
    }))
    const t0 = await $.clock.now()
    const result = await next(e)
    const t1 = await $.clock.now()

    // A command sent to the background (by Claude, or with Ctrl+B): a card of its own, kind
    // `shell`, kept until its notification arrives. The main loop's only.
    if (name === 'Bash' && !agentId) {
      const out = (result as { result?: unknown }).result as { backgroundTaskId?: string } | undefined
      const input = e as unknown as { description?: string; command?: string }
      if (out?.backgroundTaskId) {
        const id = out.backgroundTaskId
        const rec: Agent = {
          id,
          name: input.description || clip((input.command ?? 'command').replace(/\s+/g, ' '), 40),
          type: 'shell',
          kind: 'shell',
          model: '',
          effort: null,
          background: true,
          status: 'running',
          startedAt: t1,
          endedAt: null,
          tools: 0,
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
        }
        await update($, agents, list => [...asList(list).filter(x => x.id !== id), rec].slice(-12))
        agentBeat($)
      }
    }

    // The Agent tool's own record carries the id and the model (a launch the spawn hook missed
    // is caught here), and, for a foreground agent, that it is already done.
    if ((name === 'Agent' || name === 'Task') && !agentId) {
      const input = e as unknown as { description?: string; subagent_type?: string; model?: string; effort?: string }
      const out = (result as { result?: unknown }).result as
        | { agentId?: string; status?: string; resolvedModel?: string; totalToolUseCount?: number }
        | undefined
      if (out?.agentId) {
        const id = out.agentId
        const finished = out.status === 'completed'
        await update($, agents, list => {
          const rest = asList(list).filter(x => x.id !== id)
          const old = asList(list).find(x => x.id === id)
          const rec: Agent = {
            id,
            name: input.description || old?.name || input.subagent_type || 'agent',
            type: input.subagent_type || old?.type || 'general-purpose',
            model: out.resolvedModel || old?.model || input.model || '',
            effort: input.effort ?? old?.effort ?? efforts.get(e.tool_use_id) ?? null,
            background: out.status === 'async_launched' || (old?.background ?? false),
            status: finished ? 'done' : (old?.status ?? 'running'),
            startedAt: old?.startedAt ?? t0,
            endedAt: finished ? t1 : (old?.endedAt ?? null),
            tools: Math.max(old?.tools ?? 0, out.totalToolUseCount ?? 0),
            input: old?.input ?? 0,
            output: old?.output ?? 0,
            cacheRead: old?.cacheRead ?? 0,
            cacheWrite: old?.cacheWrite ?? 0,
          }
          return [...rest, rec].slice(-12)
        })
        if (!finished) agentBeat($)
        if (finished) $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
      }
    }
    return result
  })

  // Every model response, the moment it lands: its tokens, and the spend and context as
  // the status line has them. (turn.complete used to add the turn's tokens at the very end.)
  on('turn.step', async function* ($, e, next) {
    const t0 = await $.clock.now()
    const aid0 = (e as unknown as { agentId?: string }).agentId
    // The main thread's speed moves with the stream, like a speedometer: every piece is counted
    // as it passes and the gauge is redrawn a few times a second. Writes are not awaited, so
    // the stream never waits on the band.
    const stream = next(e)
    const samples: Array<[number, number]> = []
    let chars = 0
    let drawnAt = 0
    for await (const c of stream) {
      yield c
      if (aid0) continue
      if (c.kind === 'text' || c.kind === 'thinking') chars += c.text.length
      else if (c.kind === 'input') chars += c.json.length
      else continue
      const at = performance.now()
      samples.push([at, chars])
      while (samples.length > 2 && at - samples[0]![0] > 2000) samples.shift()
      if (at - drawnAt < LIVE_SPEED_MS) continue
      const tps = liveSpeed(samples, at, { charsPerToken })
      if (tps === null) continue
      drawnAt = at
      // The peak is set by a response's own average alone (below): a buffered burst read live
      // would set a peak no real speed reaches, and the needle would sit near zero after it.
      void update($, speed, s => ({ tps, peak: s.peak ?? 0 }))
    }
    const r = await stream.result
    const u = r.usage
    if (!aid0 && u && u.output_tokens >= 50 && chars > 0) {
      charsPerToken = Math.max(1.5, Math.min(6, charsPerToken * 0.6 + (chars / u.output_tokens) * 0.4))
    }
    // What this request really used: the effort the engine sent, the model the API reported.
    const sent = (e as unknown as { effort?: string | number }).effort
    const effort = typeof sent === 'number' ? `budget ${fmtTokens(sent)}` : sent
    const aid = (e as unknown as { agentId?: string }).agentId
    if (u) {
      await update($, tokens, t => addUsage(t, u))
    }
    // Speed of the main thread only: subagents run beside it and would blur the figure.
    const tps = !aid && u ? tokensPerSec(u.output_tokens, (await $.clock.now()) - t0) : null
    if (!aid && u?.model) await update($, model, () => u.model)
    // The response's own average settles the needle once it ends.
    if (tps !== null) await update($, speed, s => ({ tps, peak: Math.max(s.peak ?? 0, tps) }))
    if (aid) {
      await update($, agents, list =>
        asList(list).map(a =>
          a.id !== aid
            ? a
            : {
                ...addUsage(a, u),
                model: u?.model || a.model,
                // The engine's word wins over what was asked: no effort sent means none applies.
                effort: effort ?? null,
              },
        ),
      )
    }
    const now = await $.session.usage().catch(() => null)
    if (now) {
      await update($, usage, () => ({
        usd: now.cost?.usd ?? null,
        percent: now.context.percent ?? null,
        tokens: now.context.tokens ?? null,
        window: now.context.window,
        limits: now.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
      }))
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    // A subagent's turn closes its own card; only the main turn closes the clock.
    const agentId = (e as unknown as { agentId?: string }).agentId
    if (agentId) {
      const now = await $.clock.now()
      const reason = (e as unknown as { reason: string }).reason
      await update($, agents, list =>
        asList(list).map(a =>
          a.id === agentId
            ? { ...a, status: reason === 'error' || reason === 'refusal' ? ('error' as const) : reason === 'aborted' ? ('stopped' as const) : ('done' as const), endedAt: now }
            : a,
        ),
      )
      $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
      await restAgentBeat($)
      return next(e)
    }
    ticker?.cancel()
    ticker = null
    turnBeat = false
    const reason = (e as unknown as { reason?: string }).reason
    await update($, outcome, () => (reason === 'error' || reason === 'refusal' ? 'error' : e.isAborted || reason === 'aborted' ? 'stopped' : 'done'))
    // The turn's length as the engine reports it; failing that, from the start this module heard
    // (none after a reload mid-turn: startedAt is 0 and the span would be epoch seconds).
    const nowMs = await $.clock.now()
    const ran = Number.isFinite(e.durationMs) && e.durationMs >= 0 ? e.durationMs : startedAt > 0 ? nowMs - startedAt : null
    if (ran !== null) {
      await update($, seconds, () => Math.round(ran / 1000))
      await update($, runMs, t => (t ?? 0) + ran)
    }
    startedAt = 0
    await locate($).catch(() => undefined)
    await reconcileAgents($)
    await reconcileMode($)
    await update($, tick, n => (n ?? 0) + 1)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const [stNow, secs, where, useNow, tk, run, , nowMs, roster, spNow, mdl, skNow, endedAs, scNow] = await Promise.all([
      read($, stats),
      read($, seconds),
      read($, info),
      read($, usage),
      read($, tokens),
      read($, runMs),
      read($, tick), // only to be redrawn on each beat
      $.clock.now(),
      read($, agents),
      read($, speed),
      read($, model),
      read($, skill),
      read($, outcome),
      read($, scoped),
    ])
    // What the band draws: each figure as stored, and where a change came from while it plays
    // (see MOTION in chat.ts): `reel` for a figure written out, `from` for a ring or meter.
    const reel = (key: string, text: string) => reels.value(key, text, nowMs)
    const from = (key: string, v: number | null) => glides.from(key, v, nowMs)

    const st = stNow
    const use = {
      ...useNow,
      // The engine's limits, then the account's per-model weeks it does not carry.
      limits: [
        ...(Array.isArray(useNow.limits) ? useNow.limits : []),
        ...(Array.isArray(scNow?.limits) ? scNow.limits : []).filter(m => weeklyModel(m.kind) && !(Array.isArray(useNow.limits) ? useNow.limits : []).some(l => l.kind === m.kind)),
      ].map(l => ({ ...l, shown: l.percentUsed })),
    }
    const sp = spNow
    const sk = asSkill(skNow)
    // The looping pictures (status dot, loading bar, working chip) are drawn in the surface's
    // sandboxed frame while Claude works, where a loop keeps running: as a plain image a loop
    // would show one still frame and move only when the band redraws. Idle they hold no loop,
    // so they go back to plain images and the motion stops.
    const loop = e.props.isWorking ? { isInteractive: true } : {}
    const live = e.props.isWorking && startedAt > 0
    const liveMs = live ? beatSecs * 1000 : 0
    // Time spent running: the finished turns, and the running one as it goes.
    const runShown = (run ?? 0) + liveMs
    const shownSecs = live ? beatSecs : secs
    const shownTools = st.tools
    const elapsedArt =
      shownSecs === null ? null : tickerSvg(fmtElapsed(shownSecs), { from: reel('elapsed', fmtElapsed(shownSecs)), minText: '59m 59s' })
    const { Box, Text } = $.ui.resolve(e)

    // Long names are cut, so a deep folder or branch never squeezes the bar out of the row.
    const title = clip(base(where?.name || '') || THEME.fallbackTitle, 32)
    const branch = where?.branch ? clip(where.branch, 28) : null
    const titleArt = slabSvg(title)

    const table = $.ui.resolve(e)
    const Svg = 'Svg' in table ? table.Svg : null


    // Overall figures, as five cards: spend, tokens, time spent running, model, and UI version.
    const allTokens = (tk.input ?? 0) + (tk.output ?? 0) + (tk.cacheRead ?? 0) + (tk.cacheWrite ?? 0)
    // `roll` names the figure's slot roll: a new value rolls in over the old one.
    const cards: { label: string; value: string; icon: IconName; color: string; roll?: string }[] = [
      { label: 'Cost', value: use.usd === null ? '—' : `≈${fmtCost(use.usd)}`, icon: 'coin' as IconName, color: '#f3cf7a', roll: 'usd' },
      { label: 'Tokens', value: fmtTokens(allTokens), icon: 'hash' as IconName, color: '#a9b6ec', roll: 'tokens' },
      // Live: it counts every second while a turn runs, on the band's beat, each second rolling
      // in like the other figures (only the digits that change turn).
      { label: 'Run time', value: fmtClock(Math.floor(runShown / 1000) * 1000), icon: 'timer' as IconName, color: '#8fdcb9', roll: 'time' },
      { label: 'Model', value: mdl ? prettyModel(mdl) : '—', icon: 'sparkles' as IconName, color: HUE.petal, roll: 'model' },
      // The compact band shows the version as dim text in the top row instead.
      ...(THEME.compact ? [] : [{ label: 'UI', value: `v${VERSION} ${SKILLS_FROM}`, icon: 'cube' as IconName, color: '#f6b896' }]),
    ]

    const cardArt = cards.map(c => cardSvg(c.label, c.value, { icon: c.icon, iconColor: c.color }))

    // Room for three digits, so the count growing never shifts the version after it.
    const countArt = countSvg(shownTools, { minWidth: countSvg(999).width })

    // The compact band's top-line chips: status, tool count and version in the stats' own tile
    // look. Status is held as wide as 'working' and the count as wide as three digits, so
    // nothing on the line moves when a turn starts or the count grows.
    const toolWord = shownTools === 1 ? 'tool' : 'tools'
    // Working in petal pink; once the turn ends, how it went: success in green, error, stopped, or idle
    // before the first turn. Held as wide as the widest, so nothing after it moves.
    type Status = 'working' | Outcome | 'idle'
    const STATUS: Record<Status, Parameters<typeof hudChipSvg>[0]> = {
      working: { color: THEME.working, label: 'working', fill: true, motion: true },
      done: { color: THEME.done, label: 'success', fill: true },
      error: { color: HUE.rose, label: 'error', fill: true },
      stopped: { color: INK.label, label: 'stopped' },
      idle: { color: INK.label, label: 'idle' },
    }
    const status: Status = e.props.isWorking ? 'working' : (endedAs ?? 'idle')
    const statusW = Math.max(...Object.values(STATUS).map(o => hudChipSvg({ ...o, motion: false }).natural))
    // The bar rests green unless the turn went wrong.
    const barRest = status === 'done' ? THEME.done : INK.track
    // The turn's clock, framed like the count: as wide as '59m 59s' from the start, so the
    // chips after it do not step right as it grows. Each second rolls in on the beat.
    const timeW = hudChipSvg({ color: INK.label, label: '', icon: 'clock', pad: 6, value: '59m 59s' }).natural
    const chips = [
      ...(shownSecs !== null
        ? [{ key: 'time', alt: fmtElapsed(shownSecs), art: hudChipSvg({ color: INK.label, label: '', icon: 'clock', pad: 6, value: fmtElapsed(shownSecs), reel: reel('elapsed', fmtElapsed(shownSecs)), minWidth: timeW }) }]
        : []),
      { key: 'status', alt: status === 'done' ? 'Success' : status[0]!.toUpperCase() + status.slice(1), art: hudChipSvg({ ...STATUS[status], minWidth: statusW }) },
      { key: 'tools', alt: `${shownTools} tool calls`, art: hudChipSvg({
        color: INK.label,
        label: toolWord,
        value: String(shownTools),
        reel: reel('tools', String(shownTools)),
        minWidth: hudChipSvg({ color: '', label: 'tools', value: '999' }).natural,
      }) },
      { key: 'version', alt: `UI v${VERSION} ${SKILLS_FROM}`, art: hudChipSvg({ color: INK.detail, label: `v${VERSION} // ${SKILLS_FROM}` }) },
    ]

    // Pixel width of the loading bar: what the row leaves after everything else on it, so the
    // pill and the counter are never pushed past the edge. Text is estimated per character;
    // the time gets room for its widest form, so the bar does not twitch as the seconds grow.
    const textPx = (t: string, bold = false) => Math.ceil(t.length * (bold ? 8.2 : 7.6))
    const gapPx = 8
    // The top line is two groups: who (dot, folder, branch) and how it goes (time, status,
    // count, version). When both do not fit on one line, the second group takes a line of its
    // own, whole, instead of running past the frame; the bar goes where there is room for it.
    const leftPx = slabSvg(title).width + (branch ? gapPx + textPx(`// ${branch}`) : 0) + 3 * gapPx
    const rightPx =
      // The clock counts for what it took before it had a frame (an icon and its figures), so
      // the frame's few px more never move the bar or the chips to another line.
      (14 + gapPx + textPx('59m 59s')) +
      (THEME.compact
        ? chips.filter(c => c.key !== 'time').reduce((w, c) => w + c.art.width + gapPx, 0)
        : pillSvg('working', PILL.busy.fg, PILL.busy.bg, 24, true).width + countArt.width + 2 * gapPx) +
      gapPx
    // The frame's and the line card's padding and border, and slack for font differences.
    const framePx = 4 * gapPx + 24 + 4 * 8
    const topRoomPx = e.props.bodyColumns * 8 - framePx

    // The agent strip: running agents first, then the ones that finished lately.
    const crew = visibleAgents(asList(roster), nowMs, { max: THEME.listAgents, keepMs: THEME.keepFinishedMs })
    // Each a small one-line card in two pictures (agentChipParts): the name holds still, the ring runs on.
    // A running agent's ring turns by its own state, not the session's: a background agent works on
    // while the session sits idle, and a ring that stopped then would read as stuck.
    const crewCards = crew.shown.map(a => {
      const moving = e.props.isWorking || a.status === 'running'
      return { a, moving, art: agentChipParts(a, { padBottom: THEME.stripGap, motion: moving }) }
    })

    // A week counted for one model alone (`seven_day_fable`) is no cell of its own: it is a
    // second meter in the 7-day cell, under the week's. With no 7-day window it stays a cell.
    const weekly = use.limits.some(l => l.kind === 'seven_day')
    const limitTiles = use.limits
      .filter(l => !(weekly && weeklyModel(l.kind)))
      .map(l => ({ ...l, models: l.kind === 'seven_day' ? use.limits.filter(m => weeklyModel(m.kind)) : [] }))
    // Stat tiles: a ring when the figure is a percentage, else the icon.
    const speedPct = sp.tps === null ? 0 : Math.min(100, (sp.tps / speedScale(sp.peak ?? 0)) * 100)
    const charge = e.props.isWorking ? chargeHeld(chargeLevel(sp.tps), nowMs) : chargeHeld(0, nowMs)
    const tiles: Tile[] = [
      {
        key: 'context',
        icon: 'brain' as IconName,
        percent: use.percent,
        big: use.percent === null || !Number.isFinite(use.percent) ? '—' : `${Math.round(use.percent)}%`,
        caption: use.tokens !== null && use.window !== null ? `context · ${fmtTokens(use.tokens)}/${fmtTokens(use.window)}` : 'context used',
        // What is left stays on every layout; the window's size is the detail given up first.
        short: ['context', contextLeft(use.tokens, use.window, use.percent)].filter(Boolean).join(' · '),
        detail: use.window !== null ? `${fmtTokens(use.window)} window` : undefined,
      },
      ...limitTiles.map(l => ({
        key: l.kind,
        name: shortLimitLabel(l.kind),
        // Its meter, and one more for each model the week is also counted for on its own.
        bars: [
          { ...(l.models.length ? { label: 'all' } : {}), percent: l.percentUsed, color: ringColor(l.percentUsed), from: from(`limit-${l.kind}`, l.percentUsed) },
          ...l.models.map(m => ({ label: weeklyModel(m.kind)!, percent: m.percentUsed, color: m.percentUsed >= 60 ? ringColor(m.percentUsed) : HUE.petal, from: from(`limit-${m.kind}`, m.percentUsed) })),
        ],
        icon: (l.kind === 'five_hour' ? 'hourglass' : l.kind === 'seven_day' ? 'calendar' : 'gauge') as IconName,
        percent: l.percentUsed,
        big: `${Math.round(l.shown)}%`,
        reel: reel(`limit-${l.kind}`, `${Math.round(l.shown)}%`),
        from: from(`limit-${l.kind}`, l.percentUsed),
        caption: `of ${limitLabel(l.kind)}`,
        sub: fmtReset(l.resetsAt, nowMs) ?? undefined,
        short: `${shortLimitLabel(l.kind)} · ${limitLeft(l.shown)}`,
        // "resets 12m", not a bare "12m": beside "49% left" a lone span reads as time left.
        detail: fmtReset(l.resetsAt, nowMs)?.replace(/^resets in /, 'resets ') ?? undefined,
      })),
      // Model speed: the ring fills against the best seen this session, and never turns red.
      {
        key: 'speed',
        icon: 'bolt' as IconName,
        // Against a round full scale clear of the best seen, as on a speedometer's dial.
        percent: speedPct,
        // The needle swings to each reading; the figure itself just changes, as on a dial.
        from: from('tps', speedPct),
        big: sp.tps === null ? '—' : fmtSpeed(sp.tps),
        caption: 'tokens / sec',
        sub: sp.peak > 0 ? `peak ${fmtSpeed(sp.peak)}` : undefined,
        short: 'tok/s',
        detail: sp.peak > 0 ? `peak ${fmtSpeed(sp.peak)}` : undefined,
        color: THEME.accent,
        calm: true,
        name: 'tok/s',
        // Electric while the turn streams: blue from the first token a second, purple from 100, gold from 200.
        charge,
        bars: [{ percent: speedPct, color: charge ? CHARGE_COLOR[charge]! : THEME.accent, from: from('tps', speedPct) }],
      },
      // Hanahira Claude UI mode: active or not and the skills' version, under the name, and the
      // companions loaded beside the core.
      {
        key: 'skill',
        name: 'mode',
        icon: 'sparkle' as IconName,
        percent: null,
        big: 'Hanahira',
        caption: `Claude UI V${SKILLS_VERSION} ${sk.on ? 'active' : 'deactive'}`,
        short: `${sk.on ? 'Active' : 'Deactive'} · V${SKILLS_VERSION}`,
        detail: sk.on ? sk.loaded.filter(p => p !== 'core').join(', ') || undefined : undefined,
        color: sk.on ? SKILL_ON : SKILL_OFF,
        tone: sk.on ? SKILL_ON : SKILL_OFF,
        // A switch, as on a smart-home panel: it slides over once as the mode switches on.
        // How long ago the mode woke (a glide held like the figures'), so the mascot's hop is
        // anchored to that moment and never replays on a later redraw.
        toggle: { on: sk.on, enter: from('mascot-awake', sk.on ? 1 : 0)?.age ?? null, motion: sk.on && e.props.isWorking },
      },
    ]
    // A tile's ring (or, where pictures are not drawn, a glyph of it), at either size.
    const ringEl = (t: Tile, size: number) =>
      t.percent === null ? (
        iconEl({ Text, Svg }, t.icon, t.color ?? THEME.accent, size, '◆')
      ) : Svg ? (
        <Svg
          source={ringSvg(t.percent, t.color ?? ringColor(t.percent), size, { icon: t.icon })}
          alt={`${t.big} ${t.caption}`}
          width={size}
          height={size}
        />
      ) : (
        <Text color={t.color ?? ringColor(t.percent)}>{glyph(t.percent)}</Text>
      )

    // The compact band's cells: gauges (context, limits, speed) over figures (the cards'
    // values). Each column is as wide as its widest cell, so the two rows line up.
    // `bare` leaves the detail out (the reset time, the token count, the peak): the first
    // thing given up when a row would not fit on one line.
    // How a cell spells itself: `line`, everything on one line; `stack`, the value and its name
    // over the rest in smaller lines (narrower, every detail kept); `tall`, the value alone
    // over everything else (narrower still); `bare`, one line without the detail.
    type Mode = 'line' | 'stack' | 'tall' | 'bare'
    // `live`: the cell moves, so it is drawn in the surface's frame.
    type Cell = { key: string; alt: string; value: string; label: string; bareLabel: string; live?: boolean; draw: (width?: number, mode?: Mode, height?: number) => ReturnType<typeof hudCellSvg>; parts: (width?: number, mode?: Mode, height?: number, indexEnd?: number) => ReturnType<typeof hudCellParts> }
    // Context is the hero line above the grid (below); the other gauges share the grid.
    // What a gauge's cell is drawn from.
    const cellArgs = (t: Tile, width: number | undefined, mode: Mode, height: number | undefined): Parameters<typeof hudCellSvg> => {
      const [, ...rest] = t.short.split(' · ')
      const sub = [...(t.toggle ? [t.short] : rest), ...(t.detail ? [t.detail] : [])].join(' · ')
      return [
        t.name ?? t.short.split(' · ')[0]!,
        t.big,
        {
          index: String(index(`tile-${t.key}`)).padStart(2, '0'),
          width,
          height,
          reel: t.reel,
          ...(t.bars ? { bars: t.bars } : {}),
          ...(mode !== 'bare' && sub ? { sub } : {}),
          ...(t.toggle ? { toggle: t.toggle, tone: t.tone } : {}),
          ...(t.charge ? { charge: { level: t.charge, motion: true } } : {}),
        },
      ]
    }
    // Each cell's faint number: its place on the grid, gauges first.
    const order = [...tiles.filter(t => t.key !== 'context').map(t => `tile-${t.key}`), ...cards.map(c => `card-${c.label}`)]
    const index = (key: string) => order.indexOf(key) + 1
    const gaugeCells: Cell[] = tiles.filter(t => t.key !== 'context').map(t => ({
      key: `tile-${t.key}`,
      alt: `${t.big} ${t.caption}`,
      value: t.big,
      label: [t.short, t.detail].filter(Boolean).join(' · '),
      bareLabel: t.short,
      live: t.spark !== undefined || t.toggle?.motion === true,
      // A HUD cell (hudCellSvg): its name on the slab, the figure, its meters, and under them
      // what is left and the detail on one dim line, which `bare` leaves out.
      draw: (width, mode = 'line', height) => hudCellSvg(...cellArgs(t, width, mode, height)),
      parts: (width, mode = 'line', height, indexEnd) => { const [name, big, o] = cellArgs(t, width, mode, height); return hudCellParts(name, big, { ...o, indexEnd }) },
    }))
    const figureCells: Cell[] = cards.map(c => {
      const label = c.label.toLowerCase()
      const figureOpts = (width?: number, height?: number) => ({ index: String(index(`card-${c.label}`)).padStart(2, '0'), width, height, rule: THEME.accent, reel: c.roll ? reel(c.roll, c.value) : null })
      return {
        key: `card-${c.label}`,
        alt: `${c.label} ${c.value}`,
        value: c.value,
        label,
        bareLabel: label,
        // A figure has no meter: a short accent rule under it instead.
        draw: (width, _mode, height) => hudCellSvg(label, c.value, figureOpts(width, height)),
        parts: (width, _mode, height, indexEnd) => hudCellParts(label, c.value, { ...figureOpts(width, height), indexEnd }),
      }
    })
    // The stats sit on a grid: gauges in the first lines, figures under them, k columns to a
    // line, each column as wide as its widest cell, so every line lines up with the others.
    // The layouts, widest first; the band takes the first that fits its room: every cell on
    // one line; every cell stacked, then tall (still two lines of stats, every detail kept,
    // each line taller); one line without details; two columns (then without details); one column. A
    // narrower or wider band so picks a whole layout, never a cell that wrapped on its own.
    // Room is estimated at 8px a cell, less the frame, its padding and some slack.
    const roomPx = e.props.bodyColumns * 8 - 4 * 8 - 16
    // The hero line: the context figure at 20px and its meter, the one thing drawn big. On a
    // band too narrow for the figure, meter and words on one line, the meter goes under.
    const ctxOpts = {
      left: contextLeft(use.tokens, use.window, use.percent),
      window: use.window !== null ? `${fmtTokens(use.window)} window` : null,
      warn: use.percent !== null && use.percent >= 85,
      // The figure rolls in and the meter's blocks light up to it.
      from: reel('context', use.percent === null ? '—' : `${Math.round(use.percent)}%`),
      fromPercent: from('context', use.percent),
    }
    const ctxColor = ringColor(use.percent ?? 0)
    // Between two cards, a spacer picture of this many px (GRID_GAP): a Box gap is counted in
    // cells, whose px width the band cannot know, and the rows must come out one exact width.
    const cellGapPx = GRID_GAP
    const across = Math.max(gaugeCells.length, figureCells.length, 1)
    const layouts: { k: number; mode: Mode }[] = [
      { k: across, mode: 'line' },
      { k: across, mode: 'bare' },
      ...(across > 2 ? ([{ k: 2, mode: 'line' }, { k: 2, mode: 'bare' }] as const) : []),
      { k: 1, mode: 'bare' },
    ]
    const chunk = (row: Cell[], k: number) =>
      Array.from({ length: Math.ceil(row.length / k) }, (_, i) => row.slice(i * k, i * k + k))
    const widthsFor = (k: number, mode: Mode) => {
      const lines = [...chunk(gaugeCells, k), ...chunk(figureCells, k)]
      return {
        lines,
        colW: Array.from({ length: k }, (_, j) =>
          Math.max(0, ...lines.map(l => l[j]?.draw(undefined, mode).natural ?? 0)),
        ),
      }
    }
    const lineW = (ws: number[]) => ws.reduce((a, b) => a + b, 0) + cellGapPx * Math.max(0, ws.length - 1)
    // The layout is chosen from what the cells need now. The widest a column has been only pads
    // the chosen layout, and only while it still fits: one wide value (a long reset time, four
    // companions) must not hold the band on a narrower layout after it has gone.
    const natural =
      layouts.map(l => ({ ...l, ...widthsFor(l.k, l.mode) })).find(l => lineW(l.colW) <= roomPx) ??
      { k: 1, mode: 'bare' as Mode, ...widthsFor(1, 'bare') }
    const held = natural.colW.map((w, j) => Math.max(w, colMax.get(`${natural.k}:${natural.mode}:${j}`) ?? 0))
    const picked = { ...natural, colW: lineW(held) <= roomPx ? held : natural.colW }
    picked.colW.forEach((w, j) => colMax.set(`${picked.k}:${picked.mode}:${j}`, w))
    // One system: every column the same width where the room allows it, so the grid reads as a
    // grid; else each column keeps its own (the rows still line up).
    const evenW = picked.colW.map(() => Math.max(...picked.colW))
    const chosen = { ...picked, colW: lineW(evenW) <= roomPx ? evenW : picked.colW }
    // The grid's width as drawn: the least the band is. The band itself takes the pane's whole
    // width, which it cannot know in px (a cell's px differ with the app's text size), so the
    // surface's own layout gives it: every cell and the context line are cut at a seam, and a
    // filler in the cut takes what room the line has left (`stretch`). All rows so end on the
    // pane's right edge, whatever its size.
    const gridPx = lineW(chosen.colW)
    // What a column is short of the widest (none where the columns were drawn even).
    const evenPx = (j: number) => Math.max(...chosen.colW) - (chosen.colW[j] ?? 0)
    const ctxWidth = gridPx
    const ctxLine = hudContextSvg(use.percent, ctxColor, { ...ctxOpts, width: ctxWidth })
    // On its own glass card, like the cells under it; too narrow for one line, the meter goes under.
    const ctxArt = hudContextParts(use.percent, ctxColor, { ...ctxOpts, stack: ctxLine.natural > ctxWidth, width: ctxWidth })
    // A picture in three (hudCellParts): its two ends as drawn, and between them the filler, in
    // a box that starts from no width, grows into the room left and clips the filler to it.
    type Parts = ReturnType<typeof hudCellParts> | ReturnType<typeof hudContextParts>
    // `art.even`: a cell narrower than its line's widest has a second filler that makes it up,
    // one that starts that wide and gives way first where the line is short of room: with room,
    // every cell of a line comes out the same width (and its faint number at the same place);
    // without, each still shows whole.
    const stretch = (key: string, art: Parts, alt: string, props: { isInteractive?: boolean } = {}) => {
      if (!Svg) return []
      type Piece = { svg: string; width: number }
      // A cell in strips (a charged one): each of its pictures is its strips one under another,
      // the charge's own in the surface's frame while Claude works, where they run on.
      const rows = 'rows' in art && art.rows ? art.rows : null
      const pic = (k: string, of: (r: { left: Piece; fill: Piece; right: Piece; even: Piece | null }) => Piece | null) =>
        rows ? (
          <Box key={k} flexDirection="column" flexShrink={0}>
            {rows.map(r => {
              const p = of(r)!
              return <Svg key={`${k}-${r.id}`} source={p.svg} alt={alt} width={p.width} height={r.height} {...(r.live ? loop : {})} />
            })}
          </Box>
        ) : (
          <Svg key={k} source={of(art as never)!.svg} alt={alt} width={of(art as never)!.width} height={art.height} {...props} />
        )
      return [
        pic(key, r => r.left),
        ...('even' in art && art.even
          ? [
              <Box key={`${key}-even`} flexGrow={0} flexShrink={1} minWidth={0} overflow="hidden">
                {pic(`${key}-even-p`, r => r.even)}
              </Box>,
            ]
          : []),
        <Box key={`${key}-fill`} width={0} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          {pic(`${key}-fill-p`, r => r.fill)}
        </Box>,
        pic(`${key}-end`, r => r.right),
      ]
    }
    // Every cell of a line is as tall as its tallest, so the line reads as one row.
    const lineH = chosen.lines.map(line => Math.max(0, ...line.map((c, j) => c.draw(chosen.colW[j], chosen.mode).height)))
    // The top line fits the same width: past it, its second group takes a line of its own.
    const headRoomPx = Math.min(topRoomPx, gridPx - 24)
    const stacked = leftPx + rightPx > headRoomPx
    // The bar sits on the top line only with room to read as a bar (THEME.barMin px); with
    // less it takes a line of its own under it. Stacked, the name's line is the bar's.
    const barInline = stacked ? leftPx + THEME.barMin <= headRoomPx : leftPx + rightPx + THEME.barMin <= headRoomPx
    // On a line of its own and still too wide: the version chip, the least needed, gives way.
    const versionChip = chips.find(c => c.key === 'version')
    const showVersion = !(THEME.compact && stacked && versionChip && rightPx > headRoomPx)
    // Whatever this draw set moving, the band draws its plain pictures as the last of it ends.
    const motionLeft = Math.max(reels.left(nowMs), glides.left(nowMs))
    if (motionLeft > 0 && nowMs + motionLeft > restDue) {
      restDue = nowMs + motionLeft
      $.clock.after(motionLeft + 20, () => void update($, tick, n => (n ?? 0) + 1))
    }

    return (
      // The band takes the pane's whole width; its rows stretch to it (`stretch`).
      <Box flexDirection="column">
          {crewCards.length > 0 ? (
            <Box columnGap={1} rowGap={0} alignItems="center" flexWrap="wrap">
              {crewCards.map(({ a, moving, art }) =>
                Svg ? (
                  <Box key={`agent-${a.id}`} flexDirection="row">
                    <Svg source={themed(art.body.svg)} alt={`${kindLabel(a)} ${a.name}: ${a.kind === 'shell' ? 'running in the background' : agentStats(a)}`} width={art.body.width} height={art.body.height} />
                    <Svg source={themed(art.mark.svg)} alt={`${a.name} ${a.status === 'running' ? 'working' : a.status}`} width={art.mark.width} height={art.mark.height} {...(moving ? { isInteractive: true } : {})} />
                  </Box>
                ) : (
                  <Text key={`agent-${a.id}`} dimColor>{`◈ ${kindLabel(a)} · ${a.name} · ${a.status === 'running' ? 'working' : a.status}`}</Text>
                ),
              )}
              {crew.more > 0 ? <Text dimColor>{`+${crew.more} more`}</Text> : null}
            </Box>
          ) : null}
      <Box
        flexDirection="column"
        paddingX={1}
        {...(THEME.frame ? { borderStyle: 'round', borderColor: THEME.warm } : {})}
      >
        <Box
          flexDirection={stacked ? 'column' : 'row'}
          columnGap={1}
          alignItems={stacked ? 'stretch' : 'center'}
          // On a surface that draws the cards, the top line gets one of its own.
        >
          <Box gap={1} alignItems="center" flexGrow={1} flexShrink={1} minWidth={0}>
            {Svg ? (
              // The session's name on its slab; the branch after it, as a path.
              <Svg source={themed(titleArt.svg)} alt={title} width={titleArt.width} height={titleArt.height} />
            ) : (
              <Box gap={1} alignItems="center">
                <Text color={THEME.working}>●</Text>
                <Text bold>{title}</Text>
              </Box>
            )}
            {branch ? <Text dimColor>{`// ${branch}`}</Text> : null}
            {Svg && barInline ? (
              // The bar takes what its line leaves, as the surface lays it out (from no width,
              // growing): bodyColumns * 8 undercounts Desktop's row, and a bar sized from it
              // came out under the cut-off and was dropped. Drawn THEME.barPx wide and clipped to fit.
              <Box flexGrow={1} flexShrink={1} minWidth={0} alignItems="center">
                <Box width={0} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
                  <Svg
                    source={themed(stripeSvg(THEME.barPx, THEME.barHeight, THEME.bar, { live: e.props.isWorking, rest: barRest, padBottom: THEME.barGap, motion: true }))}
                    alt={e.props.isWorking ? 'Working' : 'Idle'}
                    width={THEME.barPx}
                    height={THEME.barHeight + THEME.barGap}
                    {...loop}
                  />
                </Box>
              </Box>
            ) : null}
          </Box>
          <Box gap={1} alignItems="center" flexShrink={0}>
            {shownSecs !== null && !(THEME.compact && Svg) ? (
              // As wide as '59m 59s' from the start, so the pill does not step right as it grows.
              <Box gap={1} alignItems="center" minWidth={9}>
                {iconEl({ Text, Svg }, 'clock', '#a3a3ab', 14, '⏱')}
                {Svg ? (
                  // Each second rolls in on the beat, like the band's figures.
                  <Svg source={themed(elapsedArt!.svg)} alt={fmtElapsed(shownSecs)} width={elapsedArt!.width} height={elapsedArt!.height} />
                ) : (
                  <Text dimColor>{fmtElapsed(shownSecs)}</Text>
                )}
              </Box>
            ) : null}
            {THEME.compact && Svg ? (
              chips
                .filter(c => showVersion || c.key !== 'version')
                .map(c => <Svg key={`chip-${c.key}`} source={themed(c.art.svg)} alt={c.alt} width={c.art.width} height={c.art.height} {...(c.key === 'status' ? loop : {})} />)
            ) : (
              <Box gap={1} alignItems="center">
              {pillEl(
                { Text, Svg },
                // Idle is held as wide as working, so nothing after the pill moves when a turn starts.
                e.props.isWorking
                  ? { text: 'working', running: true, ...PILL.busy }
                  : { text: 'idle', fg: INK.label, bg: INK.line, minWidth: pillSvg('working', PILL.busy.fg, PILL.busy.bg, 24, true).width },
              )}
              {Svg ? (
                <Svg source={themed(countArt.svg)} alt={`${shownTools} tool calls`} width={countArt.width} height={countArt.height} />
              ) : (
                <Text dimColor>{`⚡ ${shownTools} ${shownTools === 1 ? 'tool' : 'tools'}`}</Text>
              )}
              {THEME.compact ? <Text dimColor>{`v${VERSION} ${SKILLS_FROM}`}</Text> : null}
              </Box>
            )}
          </Box>
        </Box>

        {Svg && !barInline ? (
          // No room beside the name for a bar worth the name: it runs under the top line, the
          // band's whole width: drawn THEME.barPx wide and clipped to the room, like the cells' fillers.
          <Box flexDirection="row">
            <Box width={0} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
              <Svg
                source={themed(stripeSvg(THEME.barPx, THEME.barHeight, THEME.bar, { live: e.props.isWorking, rest: barRest, padBottom: THEME.barGap, motion: true }))}
                alt={e.props.isWorking ? 'Working' : 'Idle'}
                width={THEME.barPx}
                height={THEME.barHeight + THEME.barGap}
                {...loop}
              />
            </Box>
          </Box>
        ) : null}
        {THEME.compact ? (
          Svg ? (
            <Box flexDirection="row" flexWrap="nowrap">
              {stretch('context', ctxArt, `${useNow.percent === null ? '—' : `${Math.round(useNow.percent)}%`} context`)}
            </Box>
          ) : (
            <Text>
              <Text bold>{use.percent === null || !Number.isFinite(use.percent) ? '—' : `${Math.round(use.percent)}%`}</Text>
              <Text dimColor> context </Text>
              <Text color={ctxColor}>{meter(use.percent ?? 0, 20).filled}</Text>
              <Text dimColor>{meter(use.percent ?? 0, 20).rest}</Text>
              {ctxOpts.left ? <Text dimColor>{` · ${ctxOpts.left}`}</Text> : null}
            </Text>
          )
        ) : null}
        {THEME.compact ? (
          // Compact: the grid chosen above, one Box per line, nothing left to wrap on its own.
          <Box flexDirection="column">
            {chosen.lines.map((line, r) => (
              <Box key={`line-${r}`} columnGap={Svg ? 0 : 1} alignItems="center" flexWrap="nowrap">
                {[...line, ...(Svg ? Array.from({ length: chosen.k - line.length }, () => null) : [])].flatMap((c, j) => {
                  // A short line keeps its columns: an empty place as wide as a cell's, growing as one does.
                  if (c === null)
                    return !Svg ? [] : [
                      <Svg key={`gap-${r}-${j}`} source={blankArt(GRID_GAP + (chosen.colW[j] ?? 0))} alt="gap" width={GRID_GAP + (chosen.colW[j] ?? 0)} height={1} />,
                      ...(evenPx(j) > 0
                        ? [
                            <Box key={`even-${r}-${j}`} flexGrow={0} flexShrink={1} minWidth={0} overflow="hidden">
                              <Svg source={blankArt(evenPx(j))} alt="gap" width={evenPx(j)} height={1} />
                            </Box>,
                          ]
                        : []),
                      <Box key={`fill-${r}-${j}`} width={0} flexGrow={1} flexShrink={1} minWidth={0} />,
                    ]
                  if (!Svg)
                    return (
                      <Text key={c.key}>
                        <Text bold>{c.value}</Text>
                        <Text dimColor>{` ${chosen.mode === 'bare' ? c.bareLabel : c.label}`}</Text>
                      </Text>
                    )
                  // Each cell in three pictures, stretched to its share of the line; a charged one
                  // in strips, its arcs in pictures of their own (hudCellParts `rows`).
                  const cell = stretch(c.key, c.parts(chosen.colW[j], chosen.mode, lineH[r], Math.max(...chosen.colW) - SEAM), c.alt, c.live ? loop : {})
                  return j === 0 ? cell : [<Svg key={`gap-${c.key}`} source={GAP_ART} alt="gap" width={GRID_GAP} height={1} />, ...cell]
                })}
              </Box>
            ))}
          </Box>
        ) : (
        <Box flexDirection="row" alignItems="flex-start" flexWrap="nowrap" gap={2} width="100%">
          <Box flexDirection="column" flexShrink={1} flexGrow={1} minWidth={0}>
        <Box columnGap={3} rowGap={1} alignItems="center" flexWrap="wrap">
          {tiles.map(t => (
            <Box key={`tile-${t.key}`} gap={1} alignItems="center">
              {ringEl(t, RING)}
              <Box flexDirection="column">
                <Text bold>{t.big}</Text>
                <Text dimColor>{t.caption}</Text>
                {t.sub ? <Text dimColor>{t.sub}</Text> : null}
              </Box>
            </Box>
          ))}
        </Box>

        <Box gap={1} marginTop={1} alignItems="flex-start" flexWrap="nowrap">
          {/* Cards are images, not interactive frames: a frame reloads (and blanks) on every
              new picture, an image swaps in place. */}
          {cards.map((c, i) =>
            Svg && cardArt[i] ? (
              <Svg
                key={`card-${c.label}`}
                source={cardArt[i].svg}
                alt={`${c.label} ${c.value}`}
                width={cardArt[i].width}
                height={cardArt[i].height}
              />
            ) : (
              <Box
                key={`card-${c.label}`}
                flexDirection="column"
                borderStyle="round"
                borderColor={INK.line}
                paddingX={2}
                minWidth={CARD_MIN}
              >
                <Text dimColor>{c.label}</Text>
                <Text bold>{c.value}</Text>
              </Box>
            ),
          )}
        </Box>
          </Box>
        </Box>
        )}
      </Box>
      </Box>
    )
  })

  // A `Client` that failed on a surface says why in the log; the engine draws the site again.
  on('ui.fault', ($, e, next) => {
    $.ui.log(`${e.surface} ${e.component} ${e.module} [${e.element}] ${e.phase}: ${e.reason}`)
    return next(e)
  })
}

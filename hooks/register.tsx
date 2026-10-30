import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Agent, Info, Outcome, Skill, Stats, Tokens, Usage } from '../types'
import { agentCardParts, agentStats, prettyModel, visibleAgents } from './agents'
import {
  KIND_COLOR,
  KIND_GLYPH,
  KIND_ICON,
  INK,
  PILL,
  badgeSvg,
  base,
  cardSvg,
  clip,
  contextSvg,
  countSvg,
  dotSvg,
  describe,
  fileChange,
  relPath,
  fmtClock,
  fmtCost,
  fmtDuration,
  fmtElapsed,
  fmtReset,
  fmtSpeed,
  fmtTokens,
  glideHolder,
  glideStyle,
  reelHolder,
  loadingSvg,
  MOTION,
  pillSvg,
  chipSvg,
  ROW,
  taskKind,
  taskPill,
  taskSummary,
  STAT,
  liveSpeed,
  speedScale,
  speedoSvg,
  statSvg,
  statusPill,
  tickerSvg,
  GLASS,
  type Since,
  inCard,
  themed,
  tokensPerSec,
} from './chat'
export { clip }
import { iconGroup, iconSvg } from './icons'
import { VERSION } from './version'
import type { IconName } from './icons'

// Per-call facts the transcript rows read: how long a call took, which Bash
// commands are repeats. Plain module state; a row redraws when its call resolves.
const durations = new Map<string, number>()
const reruns = new Set<string>()
const seenCommands = new Set<string>()
const remember = <V,>(m: Map<string, V>, k: string, v: V) => {
  m.set(k, v)
  if (m.size > 400) m.delete(m.keys().next().value as string)
}
/** Adds to a set that keeps only its latest 400, so a long session does not grow it for good. */
const keep = (s: Set<string>, k: string) => {
  s.delete(k)
  s.add(k)
  if (s.size > 400) s.delete(s.values().next().value as string)
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
type Tile = { key: string; icon: IconName; percent: number | null; big: string; caption: string; sub?: string; short: string; detail?: string; color?: string; calm?: boolean; tone?: string; spark?: { pulse?: boolean; enterFrom?: string }; toggle?: { on: boolean; enter?: boolean }; reel?: Since<string> | null; from?: Since<number> | null }
// Output speed of the latest main-thread response, and the best seen: the ring fills against it.
const speed = atom({ plugin: 'hanahira-claude-ui', key: 'speed' } as const, { tps: null as number | null, peak: 0 })
// How often the live speed redraws the gauge while a response streams, in ms.
const LIVE_SPEED_MS = 250
const usage = atom({ plugin: 'hanahira-claude-ui', key: 'usage' } as const, NO_USAGE)
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
const SKILL_ON = '#34c38f' // the green of the mode's own banner
const SKILL_OFF = '#f2736b' // the red of its switch-off box, as the rings' red
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
// The Hanahira mode as the band last drew it, and whether it switched on in this turn: the
// sparkle turns in once, as it does, and the picture keeps that until the turn ends.
let lastOn: boolean | null = null
let twinkle = false

const tick = atom({ plugin: 'hanahira-claude-ui', key: 'tick' } as const, 0)
const runMs = atom({ plugin: 'hanahira-claude-ui', key: 'runMs' } as const, 0)
const seconds = atom({ plugin: 'hanahira-claude-ui', key: 'seconds' } as const, null)
const info = atom({ plugin: 'hanahira-claude-ui', key: 'info' } as const, null)

// Look and feel: edit these.
// Ring size in px: also sets how close the two rows of tiles sit.
const RING = 38

// Stat cards: least width in cells, so they do not shrink to their text.
const CARD_MIN = 18

const THEME = {
  accent: '#9b8cf7', // the status dot
  working: '#f2736b', // the loading bar and the status chip while Claude works
  done: '#34c38f', // both once the turn is done
  // The top line's card, in grey at low alpha so it reads on the light theme and the dark.
  lineCard: { bg: '#8080800f', border: '#8080802e' },
  warm: '#e8825f', // frame, the context meter, the limit rings
  muted: INK.detail, // the figures' icons: quiet, so the meter leads
  fallbackTitle: 'Hanahira',
  // The band's rounded frame; off since each cell is its own glass card.
  frame: false,
  // Two even rows of one-line stats (gauges over figures, in aligned columns) in place of
  // three-line tiles over tall cards: about half the height. false brings back the full band.
  compact: true,
  barPx: 900, // widest the loading bar grows, in px
  barHeight: 8, // its height in px
  barGap: 4, // room under the bar, in px: keeps it off the rings below
  listAgents: 4, // agent cards on the strip: running first, then the latest finished
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
export const tone = (percent: number) => (percent >= 85 ? '#f2736b' : percent >= 60 ? '#f2c94c' : '#7bd88f')

/** Ring colour:the theme's warm tone, red once the window is nearly spent. */
export const ringColor = (percent: number) => (percent >= 85 ? '#f2736b' : THEME.warm)

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
  const track = `${disc}<circle cx="22" cy="22" r="${r}" fill="none" stroke="#3b3737" stroke-width="${stroke}"/>`
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
      {mark ? <Svg source={badgeSvg(color, mark, ROW.tile, p.running === true)} alt="" width={ROW.tile} height={ROW.tile} /> : null}
      <Text weight="semibold" color={color}>{word}</Text>
    </Box>
  )
}

/** The busy pill of a running row. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runningPill = (els: { Text: any; Svg: any; Box?: any }) => pillEl(els, { text: 'running', running: true, ...PILL.busy })

/** A small icon where the surface draws SVG, else a plain glyph. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconEl = (els: { Text: any; Svg: any }, name: IconName, color: string, size: number, fallback: string) => {
  const { Text, Svg } = els
  return Svg ? <Svg source={themed(iconSvg(name, color, size))} alt="" width={size} height={size} /> : <Text dimColor>{fallback}</Text>
}

/** The transcript's own colours, beside the kinds' and the pills'. */
const CHAT = {
  // The band's frame (THEME.warm at 55% over the band), so your card and the band read as one.
  userEdge: '#8e5541',
  userGround: '#221d1b',
  diffEdge: INK.line,
}

type RowSpec = {
  color: string
  icon: IconName
  glyph: string
  verb: string
  target: string
  /** The target is a file or a pattern: set in the surface's monospaced face. */
  mono?: boolean
  running?: boolean
  status: unknown
  ms?: number
}

/**
 * One transcript row, the grammar every tool, group and task row shares: the kind tile, the
 * verb in the kind's colour and the target, then the status and the time at the right. The verb
 * and target give way (cut in the middle, so a file name stays); the right side never shrinks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolRow = (els: { Box: any; Text: any; Svg: any }, r: RowSpec) => {
  const { Box, Text, Svg } = els
  return (
    <Box justifyContent="space-between" alignItems="center" gap={1}>
      <Box gap={1} alignItems="center" flexShrink={1} minWidth={0}>
        {Svg ? (
          <Svg source={badgeSvg(r.color, r.icon, ROW.tile, r.running === true)} alt={r.verb} width={ROW.tile} height={ROW.tile} />
        ) : (
          <Text color={r.color} bold>{` ${r.glyph} `}</Text>
        )}
        <Text wrap="truncate-middle">
          <Text weight="semibold" color={r.color}>{r.verb}</Text>
          <Text> </Text>
          <Text mono={r.mono === true}>{r.target}</Text>
        </Text>
      </Box>
      <Box gap={1} alignItems="center" flexShrink={0}>
        {r.status}
        {r.ms !== undefined ? <Text dimColor tabular>{fmtDuration(r.ms)}</Text> : null}
      </Box>
    </Box>
  )
}

/** What a file write changed, as two pills: +added, −removed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const changePills = (els: { Box: any; Text: any; Svg: any }, added: number, removed: number) => {
  const { Box } = els
  return (
    <Box gap={1} alignItems="center">
      {added > 0 ? pillEl(els, { text: `+${added}`, ...PILL.ok }) : null}
      {removed > 0 ? pillEl(els, { text: `−${removed}`, ...PILL.bad }) : null}
    </Box>
  )
}

/**
 * The change itself, under the row, the way an editor shows it: the file's path, then the
 * lines in the engine's own `Code` diff, with its syntax colours, line numbers and change
 * markers on every surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const diffCard = (els: { Box: any; Text: any; Code: any }, d: { source: string; path: string; more: number }) => {
  const { Box, Text, Code } = els
  return (
    <Box flexDirection="column" marginLeft={4}>
      {d.path ? (
        <Box paddingX={1}>
          <Text mono color={INK.label} wrap="truncate-start">{d.path}</Text>
        </Box>
      ) : null}
      <Box flexDirection="column" borderStyle="round" borderColor={CHAT.diffEdge} paddingX={1} overflow="hidden">
        <Code source={d.source} format="diff" {...(d.path ? { path: d.path } : {})} wrap="truncate-end" />
        {d.more > 0 ? <Text dimColor>{`… ${d.more} more lines`}</Text> : null}
      </Box>
    </Box>
  )
}

// A second beat while an agent runs: it can outlive the turn that started it.
let agentTicker: { cancel: () => void } | null = null

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
  if (!list.some(a => a.status === 'running')) return
  const live = await $.agent.list().catch(() => null)
  if (!live) return
  const byId = new Map(live.map(a => [a.id, a.status]))
  const now = await $.clock.now()
  const settled = (s: string | undefined): Agent['status'] | null =>
    s === undefined || s === 'completed' ? 'done' : s === 'failed' ? 'error' : s === 'killed' ? 'stopped' : null
  await update($, agents, l =>
    asList(l).map(a => {
      const status = a.status === 'running' ? settled(byId.get(a.id)) : null
      return status ? { ...a, status, endedAt: now } : a
    }),
  )
  if (!asList(await read($, agents)).some(a => a.status === 'running')) {
    agentTicker?.cancel()
    agentTicker = null
  }
}

// The beat while an agent runs: a redraw a second, and every few seconds a look at the
// engine's list, so an agent that ends while the session is idle still settles its card.
const agentBeat = ($: EngineInterface) => {
  if (agentTicker) return
  let beats = 0
  agentTicker = $.clock.every(1000, () => {
    beats += 1
    if (beats % 5 === 0) void reconcileAgents($).catch(() => undefined)
    void update($, tick, n => (n ?? 0) + 1)
  })
}

export const register: Register = on => {
  let startedAt = 0
  let ticker: { cancel: () => void } | null = null
  // What the running turn's clocks and tool count show: set on each beat alone, so each moves
  // once a second, in step, whenever else the band redraws.
  let beatSecs = 0
  let beatTools = 0
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
    return next(e)
  })

  // Hanahira Claude UI mode: the person's switch turns it on or off; one of its skills loading
  // turns it on and names the part. A skill loads typed as /name (prompt.submit) or through the
  // Skill tool (tool.call). No skill.prompt hook: a security plugin answers that event first and
  // passes it on past this one, and the engine then prints a skipped-hook line on every load.

  on('prompt.submit', async ($, e, next) => {
    // A prompt the person did not type (isMeta, newer engines) switches nothing.
    const typed = !(e as { isMeta?: true }).isMeta
    const cmd = typed ? skillCommand(e.text, (e as { command?: unknown }).command) : null
    const s = cmd ? (cmd.on ? 'on' : 'off') : typed ? modeSwitch(e.text) : null
    switchedOff = s === 'off'
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
    if ((e as unknown as { agentId?: string }).agentId !== undefined) return next(e)
    startedAt = await $.clock.now()
    // A beat every second while the turn runs, so the clock and figures move live.
    ticker?.cancel()
    let beats = 0
    beatSecs = 0
    beatTools = 0
    ticker = $.clock.every(1000, () => {
      beats += 1
      if (beats > 7200) ticker?.cancel() // two hours: never leave one running
      void (async () => {
        beatSecs = beats
        beatTools = (await read($, stats))?.tools ?? 0
        await update($, tick, n => (n ?? 0) + 1)
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
    const key = e.command.trim()
    if (seenCommands.has(key)) keep(reruns, e.tool_use_id)
    keep(seenCommands, key)
    return next(e)
  })

  // Every tool call: stats and timing. One unmatched hook only.
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
    remember(durations, e.tool_use_id, t1 - t0)

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
      void update($, speed, s => ({ tps, peak: Math.max(s.peak ?? 0, tps) }))
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
            ? { ...a, status: reason === 'error' ? ('error' as const) : reason === 'aborted' ? ('stopped' as const) : ('done' as const), endedAt: now }
            : a,
        ),
      )
      $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
      if (!asList(await read($, agents)).some(a => a.status === 'running')) {
        agentTicker?.cancel()
        agentTicker = null
      }
      return next(e)
    }
    ticker?.cancel()
    ticker = null
    const reason = (e as unknown as { reason?: string }).reason
    await update($, outcome, () => (reason === 'error' ? 'error' : e.isAborted || reason === 'aborted' ? 'stopped' : 'done'))
    // The turn's length as the engine reports it; failing that, from the start this module heard
    // (none after a reload mid-turn: startedAt is 0 and the span would be epoch seconds).
    const nowMs = await $.clock.now()
    const ran = Number.isFinite(e.durationMs) && e.durationMs >= 0 ? e.durationMs : startedAt > 0 ? nowMs - startedAt : null
    if (ran !== null) {
      await update($, seconds, () => Math.round(ran / 1000))
      await update($, runMs, t => (t ?? 0) + ran)
    }
    startedAt = 0
    twinkle = false
    await locate($).catch(() => undefined)
    await reconcileAgents($)
    await reconcileMode($)
    await update($, tick, n => (n ?? 0) + 1)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const [stNow, secs, where, useNow, tk, run, , nowMs, roster, spNow, mdl, skNow, endedAs] = await Promise.all([
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
    ])
    // What the band draws: each figure as stored, and where a change came from while it plays
    // (see MOTION in chat.ts): `reel` for a figure written out, `from` for a ring or meter.
    const reel = (key: string, text: string) => reels.value(key, text, nowMs)
    const from = (key: string, v: number | null) => glides.from(key, v, nowMs)

    const st = stNow
    const use = {
      ...useNow,
      limits: (Array.isArray(useNow.limits) ? useNow.limits : []).map(l => ({ ...l, shown: l.percentUsed })),
    }
    const sp = spNow
    const sk = asSkill(skNow)
    if (lastOn === false && sk.on) twinkle = true
    if (!sk.on) twinkle = false
    lastOn = sk.on
    // The looping pictures (status dot, loading bar, working chip) are drawn in the surface's
    // sandboxed frame while Claude works, the only place SMIL runs: as a plain image a loop
    // would show one still frame and move only when the band redraws. Idle they hold no loop,
    // so they go back to plain images and the motion stops.
    const loop = e.props.isWorking ? { isInteractive: true } : {}
    const live = e.props.isWorking && startedAt > 0
    const liveMs = live ? beatSecs * 1000 : 0
    // Time spent running: the finished turns, and the running one as it goes.
    const runShown = (run ?? 0) + liveMs
    const shownSecs = live ? beatSecs : secs
    const shownTools = live ? beatTools : st.tools
    const elapsedArt =
      shownSecs === null ? null : tickerSvg(fmtElapsed(shownSecs), { from: reel('elapsed', fmtElapsed(shownSecs)), minText: '59m 59s' })
    const { Box, Text } = $.ui.resolve(e)

    // Long names are cut, so a deep folder or branch never squeezes the bar out of the row.
    const title = clip(base(where?.name || '') || THEME.fallbackTitle, 32)
    const branch = where?.branch ? clip(where.branch, 28) : null

    const table = $.ui.resolve(e)
    const Svg = 'Svg' in table ? table.Svg : null


    // Overall figures, as five cards: spend, tokens, time spent running, model, and UI version.
    const allTokens = (tk.input ?? 0) + (tk.output ?? 0) + (tk.cacheRead ?? 0) + (tk.cacheWrite ?? 0)
    // `roll` names the figure's slot roll: a new value rolls in over the old one.
    const cards: { label: string; value: string; icon: IconName; color: string; roll?: string }[] = [
      { label: 'Cost', value: use.usd === null ? '—' : `≈${fmtCost(use.usd)}`, icon: 'coin' as IconName, color: '#f2c94c', roll: 'usd' },
      { label: 'Tokens', value: fmtTokens(allTokens), icon: 'hash' as IconName, color: '#9b8cf7', roll: 'tokens' },
      // Live: it counts every second while a turn runs, on the band's beat, each second rolling
      // in like the other figures (only the digits that change turn).
      { label: 'Time', value: fmtClock(Math.floor(runShown / 1000) * 1000), icon: 'timer' as IconName, color: '#5eb5f7', roll: 'time' },
      { label: 'Model', value: mdl ? prettyModel(mdl) : '—', icon: 'sparkles' as IconName, color: '#e8825f', roll: 'model' },
      // The compact band shows the version as dim text in the top row instead.
      ...(THEME.compact ? [] : [{ label: 'UI', value: `v${VERSION}`, icon: 'cube' as IconName, color: '#f28b82' }]),
    ]

    const cardArt = cards.map(c => cardSvg(c.label, c.value, { icon: c.icon, iconColor: c.color }))

    // Room for three digits, so the count growing never shifts the version after it.
    const countArt = countSvg(shownTools, { minWidth: countSvg(999).width })

    // The compact band's top-line chips: status, tool count and version in the stats' own tile
    // look. Status is held as wide as 'working' and the count as wide as three digits, so
    // nothing on the line moves when a turn starts or the count grows.
    const toolWord = shownTools === 1 ? 'tool' : 'tools'
    // Working in red; once the turn ends, how it went: success in green, error, stopped, or idle
    // before the first turn. Held as wide as the widest, so nothing after it moves.
    type Status = 'working' | Outcome | 'idle'
    const STATUS: Record<Status, Parameters<typeof chipSvg>[0]> = {
      working: { color: THEME.working, label: 'working', dots: true, motion: true },
      done: { color: THEME.done, label: 'success', icon: 'check' },
      error: { color: THEME.working, label: 'error', icon: 'cross' },
      stopped: { color: '#a8a29e', label: 'stopped', icon: 'ban', quiet: true },
      idle: { color: '#a8a29e', label: 'idle', icon: 'pause', quiet: true },
    }
    const status: Status = e.props.isWorking ? 'working' : (endedAs ?? 'idle')
    const statusW = Math.max(...Object.values(STATUS).map(o => chipSvg({ ...o, strong: true, motion: false }).natural))
    // The bar rests green unless the turn went wrong.
    const barRest = status === 'error' || status === 'stopped' ? INK.track : THEME.done
    const chips = [
      { key: 'status', alt: status === 'done' ? 'Success' : status[0]!.toUpperCase() + status.slice(1), art: chipSvg({ ...STATUS[status], strong: true, minWidth: statusW }) },
      { key: 'tools', alt: `${shownTools} tool calls`, art: chipSvg({
        color: '#f2c94c',
        icon: 'bolt',
        value: String(shownTools),
        reel: reel('tools', String(shownTools)),
        label: toolWord,
        minWidth: chipSvg({ color: '', icon: 'bolt', value: '999', label: 'tools' }).natural,
        quiet: true,
      }) },
      { key: 'version', alt: `UI v${VERSION}`, art: chipSvg({ color: '#8f8985', icon: 'tag', label: `v${VERSION}`, quiet: true }) },
    ]

    // Pixel width of the loading bar: what the row leaves after everything else on it, so the
    // pill and the counter are never pushed past the edge. Text is estimated per character;
    // the time gets room for its widest form, so the bar does not twitch as the seconds grow.
    const textPx = (t: string, bold = false) => Math.ceil(t.length * (bold ? 8.2 : 7.6))
    const gapPx = 8
    // The top line is two groups: who (dot, folder, branch) and how it goes (time, status,
    // count, version). When both do not fit on one line, the second group takes a line of its
    // own, whole, instead of running past the frame; the bar goes where there is room for it.
    const leftPx = 14 + 14 + textPx(title, true) + (branch ? 14 + gapPx + textPx(branch) : 0) + 3 * gapPx
    const rightPx =
      (14 + gapPx + textPx('59m 59s')) +
      (THEME.compact
        ? chips.reduce((w, c) => w + c.art.width, 0) + gapPx * chips.length
        : pillSvg('working', PILL.busy.fg, PILL.busy.bg, 24, true).width + countArt.width + 2 * gapPx) +
      gapPx
    // The frame's and the line card's padding and border, and slack for font differences.
    const framePx = 4 * gapPx + 24 + 4 * 8
    const topRoomPx = e.props.bodyColumns * 8 - framePx
    const stacked = leftPx + rightPx > topRoomPx
    // On a line of its own and still too wide: the version chip, the least needed, gives way.
    const versionChip = chips.find(c => c.key === 'version')
    const showVersion = !(THEME.compact && stacked && versionChip && rightPx > topRoomPx)

    // The agent strip: running agents first, then the ones that finished lately.
    const crew = visibleAgents(asList(roster), nowMs, { max: THEME.listAgents, keepMs: THEME.keepFinishedMs })
    // Each card in four pictures (agentCardParts): its figures swap as an image, its ring and bar run on.
    const crewCards = crew.shown.map(a => ({ a, art: agentCardParts(a, { padBottom: THEME.stripGap, motion: e.props.isWorking }) }))

    // Stat tiles: a ring when the figure is a percentage, else the icon.
    const speedPct = sp.tps === null ? 0 : Math.min(100, (sp.tps / speedScale(sp.peak ?? 0)) * 100)
    const tiles: Tile[] = [
      {
        key: 'context',
        icon: 'brain' as IconName,
        percent: use.percent,
        big: use.percent === null ? '—' : `${use.percent}%`,
        caption: use.tokens !== null && use.window !== null ? `context · ${fmtTokens(use.tokens)}/${fmtTokens(use.window)}` : 'context used',
        // What is left stays on every layout; the window's size is the detail given up first.
        short: ['context', contextLeft(use.tokens, use.window, use.percent)].filter(Boolean).join(' · '),
        detail: use.window !== null ? `${fmtTokens(use.window)} window` : undefined,
      },
      ...(Array.isArray(use.limits) ? use.limits : []).map(l => ({
        key: l.kind,
        icon: (l.kind === 'five_hour' ? 'hourglass' : l.kind === 'seven_day' ? 'calendar' : 'gauge') as IconName,
        percent: l.percentUsed,
        big: `${Math.round(l.shown)}%`,
        reel: reel(`limit-${l.kind}`, `${Math.round(l.shown)}%`),
        from: from(`limit-${l.kind}`, l.percentUsed),
        caption: `of ${limitLabel(l.kind)}`,
        sub: fmtReset(l.resetsAt, nowMs) ?? undefined,
        short: `${shortLimitLabel(l.kind)} · ${limitLeft(l.shown)}`,
        detail: fmtReset(l.resetsAt, nowMs)?.replace(/^resets in /, '') ?? undefined,
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
      },
      // Hanahira Claude UI mode: active or not, under the name, and the companions loaded
      // beside the core.
      {
        key: 'skill',
        icon: 'sparkle' as IconName,
        percent: null,
        big: 'Hanahira',
        caption: `Claude UI ${sk.on ? 'active' : 'deactive'}`,
        short: sk.on ? 'Active' : 'Deactive',
        detail: sk.on ? sk.loaded.filter(p => p !== 'core').join(', ') || undefined : undefined,
        color: sk.on ? SKILL_ON : SKILL_OFF,
        tone: sk.on ? SKILL_ON : SKILL_OFF,
        // A switch, as on a smart-home panel: it slides over once as the mode switches on.
        toggle: { on: sk.on, enter: twinkle },
      },
    ]
    // A tile's ring (or, where pictures are not drawn, a glyph of it), at either size.
    const ringEl = (t: Tile, size: number) =>
      t.percent === null ? (
        <Text>{t.icon}</Text>
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
    type Cell = { key: string; alt: string; value: string; label: string; bareLabel: string; live?: boolean; draw: (width?: number, mode?: Mode) => ReturnType<typeof statSvg> }
    // Context is the hero line above the grid (below); the other gauges share the grid.
    const gaugeCells: Cell[] = tiles.filter(t => t.key !== 'context').map(t => ({
      key: `tile-${t.key}`,
      alt: `${t.big} ${t.caption}`,
      value: t.big,
      label: [t.short, t.detail].filter(Boolean).join(' · '),
      bareLabel: t.short,
      live: t.spark !== undefined,
      // Each cell on its own glass card (inCard): what it holds is the column less the card.
      draw: (cardW, mode = 'line') => {
        const width = cardW === undefined ? undefined : cardW - GLASS.extra
        // Stacked: the name beside the value, what is left and the detail on lines under it;
        // tall: the name under the value too. Every gauge gets as many lines under it (blank
        // where it has less), so a line of gauges keeps one height and one baseline.
        const [name = t.short, ...rest] = t.short.split(' · ')
        const more = [...rest, ...(t.detail ? [t.detail] : [])]
        // A state reads under the value in both, its colour on the line it takes.
        const under = t.tone
          ? mode === 'stack' ? [[name, ...more].join(' · ')] : mode === 'tall' ? [name, ...more, '', '', ''].slice(0, 3) : undefined
          : mode === 'stack' ? [more.join(' · ')] : mode === 'tall' ? [name, ...more, '', '', ''].slice(0, 3) : undefined
        return inCard(statSvg(t.big, mode === 'stack' ? (t.tone ? '' : name) : mode === 'tall' ? '' : t.short, {
          tone: t.tone,
          reel: t.reel,
          detail: mode === 'line' ? t.detail : undefined,
          ...(under ? { stack: under } : {}),
          width,
          // Speed is no share of a limit: a speedometer whose needle follows the stream.
          ...(t.key === 'speed'
            ? { ring: speedoSvg((t.percent ?? 0) / 100, t.color ?? THEME.accent, STAT.glyph, t.from ? { from: t.from.from / 100, age: t.from.age } : null) }
            : t.percent === null
            ? t.toggle
              ? { toggle: t.toggle, color: t.color ?? THEME.accent }
              : { icon: t.icon, color: t.color ?? THEME.accent, spark: t.spark }
            : {
                ring: ringSvg(t.percent, t.color ?? ringColor(t.percent), STAT.glyph, { icon: t.icon, bigIcon: true, from: t.from }),
              }),
        }))
      },
    }))
    const figureCells: Cell[] = cards.map(c => {
      const label = c.label.toLowerCase()
      return {
        key: `card-${c.label}`,
        alt: `${c.label} ${c.value}`,
        value: c.value,
        label,
        bareLabel: label,
        // Stacked, the label goes under the value, so the column is no wider than the value.
        draw: (cardW, mode = 'line') => {
          const width = cardW === undefined ? undefined : cardW - GLASS.extra
          const under = mode === 'stack' || mode === 'tall'
          // Each figure's icon on a tile tinted its own colour, like the gauges' rings above.
          return inCard(statSvg(c.value, under ? '' : label, { icon: c.icon, color: c.color, width, reel: c.roll ? reel(c.roll, c.value) : null, ...(under ? { stack: [label] } : {}) }))
        },
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
    // On its own glass card, like the cells under it.
    const ctxLine = inCard(contextSvg(use.percent, ctxColor, ctxOpts))
    const ctxArt = ctxLine.natural > roomPx ? inCard(contextSvg(use.percent, ctxColor, { ...ctxOpts, stack: true })) : ctxLine
    // The cards keep their own margin (GLASS.margin), so one column between them is enough.
    const cellGapPx = 8
    const across = Math.max(gaugeCells.length, figureCells.length, 1)
    const layouts: { k: number; mode: Mode }[] = [
      { k: across, mode: 'line' },
      { k: across, mode: 'stack' },
      { k: across, mode: 'tall' },
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
          Math.max(colMax.get(`${k}:${mode}:${j}`) ?? 0, ...lines.map(l => l[j]?.draw(undefined, mode).natural ?? 0)),
        ),
      }
    }
    const lineW = (ws: number[]) => ws.reduce((a, b) => a + b, 0) + cellGapPx * Math.max(0, ws.length - 1)
    const chosen =
      layouts.map(l => ({ ...l, ...widthsFor(l.k, l.mode) })).find(l => lineW(l.colW) <= roomPx) ??
      { k: 1, mode: 'bare' as Mode, ...widthsFor(1, 'bare') }
    chosen.colW.forEach((w, j) => colMax.set(`${chosen.k}:${chosen.mode}:${j}`, w))
    // Whatever this draw set moving, the band draws its plain pictures as the last of it ends.
    const motionLeft = Math.max(reels.left(nowMs), glides.left(nowMs))
    if (motionLeft > 0 && nowMs + motionLeft > restDue) {
      restDue = nowMs + motionLeft
      $.clock.after(motionLeft + 20, () => void update($, tick, n => (n ?? 0) + 1))
    }

    return (
      <Box flexDirection="column">
          {crewCards.length > 0 ? (
            <Box columnGap={2} rowGap={1} alignItems="center" flexWrap="wrap">
              {crewCards.map(({ a, art }) =>
                Svg ? (
                  <Box key={`agent-${a.id}`} flexDirection="column">
                    <Box flexDirection="row">
                      <Svg source={themed(art.head.svg)} alt={`${a.name}, ${a.status}`} width={art.head.width} height={art.head.height} />
                      <Svg source={themed(art.mark.svg)} alt={`${a.name} ${a.status === 'running' ? 'working' : a.status}`} width={art.mark.width} height={art.mark.height} {...loop} />
                    </Box>
                    <Svg source={themed(art.body.svg)} alt={agentStats(a)} width={art.body.width} height={art.body.height} />
                    <Svg source={themed(art.strip.svg)} alt={`${a.name} progress`} width={art.strip.width} height={art.strip.height} {...loop} />
                  </Box>
                ) : (
                  <Text key={`agent-${a.id}`} dimColor>{`◈ ${a.name} · ${a.status === 'running' ? 'working' : a.status}`}</Text>
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
          {...(Svg ? { borderStyle: 'round', borderColor: THEME.lineCard.border, backgroundColor: THEME.lineCard.bg, paddingX: 1 } : {})}
        >
          <Box gap={1} alignItems="center" flexGrow={1} flexShrink={1} minWidth={0}>
            {Svg ? (
              <Svg source={themed(dotSvg(THEME.accent, e.props.isWorking, 14, true))} alt="" width={14} height={14} {...loop} />
            ) : (
              <Text color={THEME.accent}>●</Text>
            )}
            {iconEl({ Text, Svg }, 'folder', '#a8a29e', 14, '')}
            <Text bold>{title}</Text>
            {branch ? (
              <Box gap={1} alignItems="center">
                {iconEl({ Text, Svg }, 'branch', '#a8a29e', 14, '⎇')}
                <Text dimColor>{branch}</Text>
              </Box>
            ) : null}
            {Svg ? (
              // The bar takes what its line leaves, as the surface lays it out (from no width,
              // growing): bodyColumns * 8 undercounts Desktop's row, and a bar sized from it
              // came out under the cut-off and was dropped. Drawn THEME.barPx wide and clipped to fit.
              <Box flexGrow={1} flexShrink={1} minWidth={0} alignItems="center">
                <Box width={0} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
                  <Svg
                    source={themed(loadingSvg(THEME.barPx, THEME.barHeight, THEME.working, {
                      live: e.props.isWorking,
                      rest: barRest,
                      padBottom: THEME.barGap,
                      motion: true,
                    }))}
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
            {shownSecs !== null ? (
              // As wide as '59m 59s' from the start, so the pill does not step right as it grows.
              <Box gap={1} alignItems="center" minWidth={9}>
                {iconEl({ Text, Svg }, 'clock', '#a8a29e', 14, '⏱')}
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
                  : { text: 'idle', fg: '#8a8480', bg: '#2a2727', minWidth: pillSvg('working', PILL.busy.fg, PILL.busy.bg, 24, true).width },
              )}
              {Svg ? (
                <Svg source={themed(countArt.svg)} alt={`${shownTools} tool calls`} width={countArt.width} height={countArt.height} />
              ) : (
                <Text dimColor>{`⚡ ${shownTools} ${shownTools === 1 ? 'tool' : 'tools'}`}</Text>
              )}
              {THEME.compact ? <Text dimColor>{`v${VERSION}`}</Text> : null}
              </Box>
            )}
          </Box>
        </Box>

        {THEME.compact ? (
          Svg ? (
            <Svg source={ctxArt.svg} alt={`${useNow.percent === null ? '—' : `${Math.round(useNow.percent)}%`} context`} width={ctxArt.width} height={ctxArt.height} />
          ) : (
            <Text>
              <Text bold>{use.percent === null ? '—' : `${use.percent}%`}</Text>
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
              <Box key={`line-${r}`} columnGap={1} alignItems="center" flexWrap="nowrap">
                {line.map((c, j) => {
                  if (!Svg)
                    return (
                      <Text key={c.key}>
                        <Text bold>{c.value}</Text>
                        <Text dimColor>{` ${chosen.mode === 'bare' ? c.bareLabel : c.label}`}</Text>
                      </Text>
                    )
                  const art = c.draw(chosen.colW[j], chosen.mode)
                  return <Svg key={c.key} source={art.svg} alt={c.alt} width={art.width} height={art.height} {...(c.live ? loop : {})} />
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
                borderColor="#4a4240"
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

  // ---- Transcript ----------------------------------------------------------

  // The prompt you typed: a card framed in the band's own warm edge, on a faintly warm ground.
  // A task's notification: a row of the same grammar as a tool's, its status as a pill.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.props.isExpanded && e.props.origin.kind !== 'composer') return next(e)
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null
    if (e.props.origin.kind === 'composer') {
      if (!e.props.isExpanded) return next(e)
      return (
        <Box borderStyle="round" borderColor={CHAT.userEdge} backgroundColor={CHAT.userGround} paddingX={1}>
          <Text>{e.props.text}</Text>
        </Box>
      )
    }
    const task = e.props.task
    if (e.props.origin.kind !== 'task-notification' || !task) return next(e)
    const kind = taskKind(task.type)
    const verb = kind === 'run' ? 'Task' : 'Agent'
    return toolRow({ Box, Text, Svg }, {
      color: KIND_COLOR[kind],
      icon: KIND_ICON[kind],
      glyph: KIND_GLYPH[kind],
      verb,
      target: clip(taskSummary(e.props.text, verb), 96),
      status: pillEl({ Box, Text, Svg }, taskPill(task.status)),
      ms: task.durationMs,
    })
  })

  // A tool call: kind tile, coloured verb, target, status pill, duration. An Edit or Write that
  // changed lines counts them in its pills and shows the change under the row.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props
    const d = describe(p.tool, p.input, reruns.has(p.tool_use_id))
    const ms = durations.get(p.tool_use_id)
    const table = $.ui.resolve(e)
    const { Box, Text, Code } = table
    const Svg = 'Svg' in table ? table.Svg : null
    const els = { Box, Text, Svg }

    // What the call changed, when it is a file write that landed. Drawn here, in the row, so it
    // shows wherever the row does; the ToolResult under it then draws nothing (see below).
    // (`isExpanded` read loosely: older engines' props do not have it.)
    const expanded = (p as { isExpanded?: boolean }).isExpanded === true
    const change = !p.isRunning && !p.isErrored && !p.isInterrupted && !expanded ? fileChange(p.tool, p.output) : null
    const status = p.isRunning
      ? runningPill(els)
      : change && change.added + change.removed > 0
        ? changePills({ Box, Text, Svg }, change.added, change.removed)
        : pillEl(els, statusPill(p.tool, p))
    const row = toolRow({ Box, Text, Svg }, {
      color: KIND_COLOR[d.kind],
      icon: KIND_ICON[d.kind],
      glyph: KIND_GLYPH[d.kind],
      verb: d.verb,
      target: d.target,
      mono: d.kind === 'read' || d.kind === 'edit' || d.kind === 'write' || d.kind === 'delete',
      running: p.isRunning,
      status,
      ms: p.isRunning ? undefined : ms,
    })
    if (!change || change.rows.length === 0) return row
    const cwd = await $.session.cwd().catch(() => null)
    return (
      <Box flexDirection="column">
        {row}
        {diffCard({ Box, Text, Code }, { ...change, path: relPath(change.path, cwd) })}
      </Box>
    )
  })

  // The result block under a standalone row. An Edit or Write's change is drawn in its ToolUse
  // row already, so here it is nothing; the full view (ctrl+o) keeps the engine's own.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const p = e.props
    if ((p as { isExpanded?: boolean }).isExpanded === true || p.isErrored) return next(e)
    const change = fileChange(p.tool, p.output)
    if (!change || change.rows.length === 0) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  // A folded run of reads and searches: one summary row, counted by what each call did.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.props.isExpanded) return next(e)
    const calls = e.props.calls
    const counts: Record<string, number> = {}
    for (const c of calls) {
      const verb = describe(c.tool, c.input).verb
      counts[verb] = (counts[verb] ?? 0) + 1
    }
    const summary = top(counts, 4)
      .map(([verb, n]) => `${verb} ${n}`)
      .join(' · ')
    const isRunning = calls.some(c => c.isRunning)
    const isErrored = calls.some(c => c.isErrored)
    const pill = isErrored
      ? { text: 'error', icon: 'cross' as const, ...PILL.bad }
      : { text: `${calls.length} calls`, icon: 'check' as const, ...PILL.ok }
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null

    return toolRow({ Box, Text, Svg }, {
      color: KIND_COLOR.search,
      icon: KIND_ICON.search,
      glyph: KIND_GLYPH.search,
      verb: 'Explore',
      target: summary,
      running: isRunning,
      status: isRunning ? runningPill({ Box, Text, Svg }) : pillEl({ Box, Text, Svg }, pill),
    })
  })

  // A `Client` that failed on a surface says why in the log; the engine draws the site again.
  on('ui.fault', ($, e, next) => {
    $.ui.log(`${e.surface} ${e.component} ${e.module} [${e.element}] ${e.phase}: ${e.reason}`)
    return next(e)
  })

  // The end-of-turn line: a pill instead of a dim word.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    // While the line waits on background agents it says so, not "done"; ctrl+o shows the engine's own.
    // (Read loosely: older engines' props have neither field.)
    const extra = e.props as { waitingFor?: unknown; isExpanded?: boolean }
    if (extra.waitingFor || extra.isExpanded) return next(e)
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null
    return (
      <Box gap={1} alignItems="center">
        {pillEl({ Box, Text, Svg }, { text: e.props.word, icon: 'check' as const, ...PILL.ok })}
        <Text dimColor>{fmtDuration(e.props.durationMs)}</Text>
      </Box>
    )
  })
}

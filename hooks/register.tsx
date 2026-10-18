import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Agent, Info, Stats, Tokens, Usage } from '../types'
import { agentCardSvg, agentStats, prettyModel, visibleAgents } from './agents'
import {
  KIND_COLOR,
  KIND_GLYPH,
  KIND_ICON,
  PILL,
  badgeSvg,
  base,
  cardSvg,
  countSvg,
  dotSvg,
  countChanges,
  describe,
  diffRows,
  fmtClock,
  fmtCost,
  fmtDuration,
  fmtElapsed,
  fmtReset,
  fmtSpeed,
  fmtTokens,
  loadingSvg,
  phaseBegin,
  pillSvg,
  sinceBegin,
  statusPill,
  tokensPerSec,
} from './chat'
import { iconGroup, iconSvg } from './icons'
import { VERSION } from './version'
import type { IconName } from './icons'

// Per-call facts the transcript rows read: how long a call took, which Bash
// commands are repeats. Plain module state; a row redraws when its call resolves.
const durations = new Map<string, number>()
const reruns = new Set<string>()
const seenCommands = new Set<string>()
const remember = (m: Map<string, number>, k: string, v: number) => {
  m.set(k, v)
  if (m.size > 400) m.delete(m.keys().next().value as string)
}

const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
const tokens = atom({ plugin: 'hanahira-claude-ui', key: 'tokens' } as const, NO_TOKENS)

const EMPTY: Stats = { tools: 0, byTool: {}, files: [], last: null }
const NO_USAGE: Usage = { usd: null, percent: null, tokens: null, window: null, limits: [] }

type Tile = { key: string; icon: IconName; percent: number | null; big: string; caption: string; sub?: string; color?: string; calm?: boolean }
// Output speed of the latest main-thread response, and the best seen: the ring fills against it.
const speed = atom({ plugin: 'hanahira-claude-ui', key: 'speed' } as const, { tps: null as number | null, peak: 0 })
const usage = atom({ plugin: 'hanahira-claude-ui', key: 'usage' } as const, NO_USAGE)
// The model the main thread last answered with, as the API reported it.
const model = atom({ plugin: 'hanahira-claude-ui', key: 'model' } as const, null as string | null)

const stats = atom({ plugin: 'hanahira-claude-ui', key: 'stats' } as const, EMPTY)
/** A stored value is whatever an earlier version or a reload left behind: never trust its shape. */
export const asList = (v: unknown): Agent[] => (Array.isArray(v) ? (v as Agent[]) : [])
const agents = atom({ plugin: 'hanahira-claude-ui', key: 'agents' } as const, [] as Agent[])
// What the strip last drew, so a card bounces in once and flashes once, not on every redraw.
const firstSeenAt = new Map<string, number>()
const statusAt = new Map<string, { status: string; at: number }>()
const efforts = new Map<string, string>()

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
  accent: '#9b8cf7', // dot, loading bar
  warm: '#e8825f', // frame, working marker
  fallbackTitle: 'Hanahira',
  frame: true,
  barPx: 900, // widest the loading bar grows, in px
  barHeight: 18, // its height in px
  barGap: 6, // room under the bar, in px: keeps it off the rings below
  listAgents: 4, // agent cards on the strip: running first, then the latest finished
  keepFinishedMs: 3000, // a finished agent's card stays this long (to show the check), then goes
  stripGap: 8, // room under the agent strip, in px: keeps it off the band's frame
  // Icons in front of each label: swap for any glyph or emoji.
}

export const DANGEROUS = /docker\s+compose\s+down\s+.*-v|ufw\s+enable/

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

/**
 * A donut gauge as SVG: a dim track and an arc from 12 o'clock, clockwise. Given `from`
 * (the percent it was last drawn at) the arc grows from there; `pulse` breathes it.
 */
export const ringSvg = (
  percent: number,
  color: string,
  size: number,
  opts: { from?: number; pulse?: boolean; icon?: IconName; ago?: number; now?: number } = {},
) => {
  const stroke = 5
  const r = (44 - stroke) / 2
  const c = 2 * Math.PI * r
  const arcAt = (v: number) => (Math.max(0, Math.min(100, v)) / 100) * c
  const arc = arcAt(percent)
  const arcFrom = opts.from === undefined ? arc : arcAt(opts.from)
  const grow =
    Math.abs(arc - arcFrom) > 0.5
      ? `<animate attributeName="stroke-dasharray" from="${arcFrom.toFixed(2)} ${c.toFixed(2)}" to="${arc.toFixed(2)} ${c.toFixed(2)}" dur="0.9s" begin="${sinceBegin(opts.ago)}" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1"/>`
      : ''
  // Near the limit the arc breathes, slow and eased: a warning, not a strobe.
  const pulse = opts.pulse
    ? `<animate attributeName="stroke-opacity" values="1;0.55;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="2s" begin="${phaseBegin(opts.now ?? 0, 2000)}" repeatCount="indefinite"/>`
    : ''
  // A disc tinted the arc's colour fills the middle, and the icon fills the disc: big enough
  // to read at a glance, so the gauge reads as one piece.
  const disc = `<circle cx="22" cy="22" r="15" fill="${color}" fill-opacity="0.13"/>`
  const track = `${disc}<circle cx="22" cy="22" r="${r}" fill="none" stroke="#3b3737" stroke-width="${stroke}"/>`
  const fill =
    arc > 0
      ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${arc.toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 22 22)">${grow}${pulse}</circle>`
      : ''
  const mark = opts.icon ? iconGroup(opts.icon, color, 12, 12, 20, 2.1) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="${size}" height="${size}">${track}${fill}${mark}</svg>`
}

/** One-cell ring for a surface that cannot draw SVG. */
export const glyph = (percent: number) =>
  percent < 12.5 ? '○' : percent < 37.5 ? '◔' : percent < 62.5 ? '◑' : percent < 87.5 ? '◕' : '●'

export const limitLabel = (kind: string) =>
  kind === 'five_hour' ? '5-hour limit' : kind === 'seven_day' ? '7-day limit' : kind === 'spend_limit' ? 'spend limit' : kind

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const short = (tool: string) => tool.replace(/^mcp__.*__/, '')

// What the stat figures were last drawn as: an animation plays only when a value changes.

/** How long a figure counts as "just changed": its roll plays inside this window, and after
 * it the picture is still, so a redraw or a reloaded image never replays an old change. */
export const CHANGE_MS = 1200
const changes = new Map<string, { value: unknown; from?: unknown; at: number }>()
// When the freshest change ends, and whether a redraw is already booked for then.
let freshUntil = 0
let settleBooked = false

/**
 * Notes the figure drawn under `key` and returns the value it changed from, while that change
 * is fresh (within CHANGE_MS); otherwise `from` is undefined and the figure draws still.
 * `counts` says which changes deserve motion (the tool counter: only growth); `first` makes
 * the first sight itself a change from that value (a ring grows in from 0).
 */
export const noteChange = <T,>(
  key: string,
  value: T,
  now: number,
  opts: { counts?: (from: T, to: T) => boolean; first?: T } = {},
): { from?: T; ago?: number } => {
  const seen = changes.get(key)
  if (!seen) changes.set(key, opts.first === undefined ? { value, at: -Infinity } : { value, from: opts.first, at: now })
  else if (seen.value !== value)
    changes.set(key, (opts.counts ?? ((a, b) => a !== b))(seen.value as T, value) ? { value, from: seen.value, at: now } : { value, at: -Infinity })
  const c = changes.get(key)!
  if (now - c.at >= CHANGE_MS) return {}
  freshUntil = Math.max(freshUntil, c.at + CHANGE_MS)
  return { from: c.from as T, ago: now - c.at }
}

/** Drops what noteChange remembers under `prefix` for every id not in `keep` (agents gone). */
export const forgetChanges = (prefix: string, keep: Set<string>) => {
  for (const key of changes.keys()) if (key.startsWith(prefix) && !keep.has(key.slice(prefix.length))) changes.delete(key)
}

type PillSpec = { text: string; fg: string; bg: string; running?: boolean; icon?: 'check' | 'cross' | 'ban' }

const PILL_GLYPH = { check: '✓', cross: '✕', ban: '⊘' }

/** A status pill: a capsule where the surface draws SVG, else a tinted text block. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pillEl = (els: { Text: any; Svg: any }, p: PillSpec, now = 0) => {
  const { Text, Svg } = els
  if (!Svg) {
    const label = p.icon ? `${PILL_GLYPH[p.icon]} ${p.text}` : p.text
    return <Text backgroundColor={p.bg} color={p.fg} bold>{` ${label} `}</Text>
  }
  const b = pillSvg(p.text, p.fg, p.bg, 24, p.running === true, p.icon, now)
  // An image, never a frame: a frame reloads (and blanks) whenever its picture changes.
  return <Svg source={b.svg} alt={p.text} width={b.width} height={b.height} />
}

/** A small icon where the surface draws SVG, else a plain glyph. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconEl = (els: { Text: any; Svg: any }, name: IconName, color: string, size: number, fallback: string) => {
  const { Text, Svg } = els
  return Svg ? <Svg source={iconSvg(name, color, size)} alt="" width={size} height={size} /> : <Text dimColor>{fallback}</Text>
}

export const register: Register = on => {
  let startedAt = 0
  let ticker: { cancel: () => void } | null = null
  // A second beat while an agent runs: it can outlive the turn that started it.
  let agentTicker: { cancel: () => void } | null = null

  on('session.start', async ($, e, next) => {
    const cwd = await $.session.cwd()
    const git = await $.process
      .run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd })
      .catch(() => null)
    const branch = git !== null && git.exitCode === 0 ? git.stdout.trim() : null
    const value: Info = { name: base(cwd), branch }
    await update($, info, () => value)
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

  on('prompt.submit', async ($, e, next) => {
    startedAt = await $.clock.now()
    // A beat every second while the turn runs, so the clock and figures move live.
    ticker?.cancel()
    let beats = 0
    ticker = $.clock.every(1000, () => {
      beats += 1
      if (beats > 7200) ticker?.cancel() // two hours: never leave one running
      void update($, tick, n => (n ?? 0) + 1)
    })
    await update($, stats, () => EMPTY)
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
    if (!agentTicker) agentTicker = $.clock.every(1000, () => void update($, tick, n => (n ?? 0) + 1))
    return r
  })

  // A backstop: the subagent's loop ended without a turn.complete of its own.
  on('classic.SubagentStop', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, agents, list =>
      asList(list).map(a => (a.id === e.agent_id && a.status === 'running' ? { ...a, status: 'done' as const, endedAt: now } : a)),
    )
    $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
    if (!asList(await read($, agents)).some(a => a.status === 'running')) {
      agentTicker?.cancel()
      agentTicker = null
    }
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    if (DANGEROUS.test(e.command)) {
      return { deny: `${$.plugin.name}: blocked (compose down -v / firewall enable)` }
    }
    const key = e.command.trim()
    if (seenCommands.has(key)) reruns.add(e.tool_use_id)
    seenCommands.add(key)
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
      if (effort) efforts.set(e.tool_use_id, effort)
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
        if (!agentTicker && !finished) agentTicker = $.clock.every(1000, () => void update($, tick, n => (n ?? 0) + 1))
        if (finished) $.clock.after(THEME.keepFinishedMs + 300, () => void update($, tick, n => (n ?? 0) + 1))
      }
    }
    return result
  })

  // Every model response, the moment it lands: its tokens, and the spend and context as
  // the status line has them. (turn.complete used to add the turn's tokens at the very end.)
  on('turn.step', async function* ($, e, next) {
    const t0 = await $.clock.now()
    const r = yield* next(e)
    const u = r.usage
    // What this request really used: the effort the engine sent, the model the API reported.
    const sent = (e as unknown as { effort?: string | number }).effort
    const effort = typeof sent === 'number' ? `budget ${fmtTokens(sent)}` : sent
    const aid = (e as unknown as { agentId?: string }).agentId
    if (u) {
      await update($, tokens, t => ({
        input: (t.input ?? 0) + u.input_tokens,
        output: (t.output ?? 0) + u.output_tokens,
        cacheRead: (t.cacheRead ?? 0) + u.cache_read_input_tokens,
        cacheWrite: (t.cacheWrite ?? 0) + u.cache_creation_input_tokens,
      }))
    }
    // Speed of the main thread only: subagents run beside it and would blur the figure.
    const tps = !aid && u ? tokensPerSec(u.output_tokens, (await $.clock.now()) - t0) : null
    if (!aid && u?.model) await update($, model, () => u.model)
    if (tps !== null) await update($, speed, s => ({ tps, peak: Math.max(s.peak ?? 0, tps) }))
    if (aid) {
      await update($, agents, list =>
        asList(list).map(a =>
          a.id !== aid
            ? a
            : {
                ...a,
                model: u?.model || a.model,
                // The engine's word wins over what was asked: no effort sent means none applies.
                effort: effort ?? null,
                input: a.input + (u?.input_tokens ?? 0),
                output: a.output + (u?.output_tokens ?? 0),
                cacheRead: a.cacheRead + (u?.cache_read_input_tokens ?? 0),
                cacheWrite: a.cacheWrite + (u?.cache_creation_input_tokens ?? 0),
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
    const nowMs = await $.clock.now()
    if (startedAt > 0) {
      // No prompt.submit seen (e.g. a reload mid-turn): startedAt is 0 and the span would be epoch seconds.
      const s = Math.round((nowMs - startedAt) / 1000)
      await update($, seconds, () => s)
      await update($, runMs, t => (t ?? 0) + (nowMs - startedAt))
    }
    startedAt = 0
    await update($, tick, n => (n ?? 0) + 1)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const [st, secs, where, use, tk, run, , nowMs, roster, sp, mdl] = await Promise.all([
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
    ])
    const liveMs = e.props.isWorking && startedAt > 0 ? Math.max(0, nowMs - startedAt) : 0
    const shownSecs = liveMs > 0 ? Math.floor(liveMs / 1000) : secs
    const { Box, Text } = $.ui.resolve(e)

    // Long names are cut, so a deep folder or branch never squeezes the bar out of the row.
    const title = clip(base(where?.name || '') || THEME.fallbackTitle, 32)
    const branch = where?.branch ? clip(where.branch, 28) : null

    const table = $.ui.resolve(e)
    const Svg = 'Svg' in table ? table.Svg : null


    // Overall figures, as five cards: spend, tokens, time spent running, model, and UI version.
    const allTokens = (tk.input ?? 0) + (tk.output ?? 0) + (tk.cacheRead ?? 0) + (tk.cacheWrite ?? 0)
    const cards = [
      { label: 'Cost', value: use.usd === null ? '—' : `≈${fmtCost(use.usd)}`, icon: 'coin' as IconName, color: '#f2c94c' },
      { label: 'Tokens', value: fmtTokens(allTokens), icon: 'layers' as IconName, color: '#9b8cf7' },
      // Whole seconds, floored: the same second the odometer shows, so text and digits agree.
      { label: 'Time', value: fmtClock(Math.floor(((run ?? 0) + liveMs) / 1000) * 1000), icon: 'stopwatch' as IconName, color: '#7bd88f' },
      { label: 'Model', value: mdl ? prettyModel(mdl) : '—', icon: 'bot' as IconName, color: '#5eb5f7' },
      { label: 'UI', value: `v${VERSION}`, icon: 'cube' as IconName, color: '#f28b82' },
    ]

    // A card rolls only in the moment its value changes; the clock ticks and never flashes.
    const cardFrom = new Map<string, { from?: string; ago?: number }>()
    for (const c of cards) if (c.label !== 'Time') cardFrom.set(c.label, noteChange(`card:${c.label}`, c.value, nowMs))
    // While a turn runs only the Time card moves: its tile breathes and its digits roll.
    const ticking = e.props.isWorking && startedAt > 0
    const clockMs = (run ?? 0) + liveMs
    const cardArt = cards.map(c => {
      if (c.label === 'Time' && ticking)
        return cardSvg(c.label, c.value, { icon: c.icon, iconColor: c.color, live: { now: clockMs }, clock: { elapsedMs: clockMs } })
      const { from, ago } = cardFrom.get(c.label) ?? {}
      return cardSvg(c.label, c.value, {
        changed: from !== undefined,
        from,
        ago,
        accent: THEME.accent,
        icon: c.icon,
        iconColor: c.color,
      })
    })

    // The tool counter flashes only when it grows (a reset to 0 at a new prompt stays quiet).
    const tools = noteChange('tools', st.tools, nowMs, { counts: (a, b) => b > a })
    const countArt = countSvg(st.tools, { changed: tools.from !== undefined, from: tools.from, ago: tools.ago })

    // Pixel width of the loading bar: what the row leaves after everything else on it, so the
    // pill and the counter are never pushed past the edge. Text is estimated per character;
    // the time gets room for its widest form, so the bar does not twitch as the seconds grow.
    const textPx = (t: string, bold = false) => Math.ceil(t.length * (bold ? 8.2 : 7.6))
    const gapPx = 8
    const rowPx =
      14 + 14 + textPx(title, true) +
      (branch ? 14 + gapPx + textPx(branch) : 0) +
      (14 + gapPx + textPx('59m 59s')) +
      pillSvg('working', PILL.busy.fg, PILL.busy.bg, 24, true).width +
      countArt.width +
      8 * gapPx + // between the row's items
      4 * gapPx + // the frame's padding and border
      24 // slack for font differences
    const barRoom = Math.min(THEME.barPx, e.props.bodyColumns * 8 - rowPx)
    // Never less than a short bar: if even that does not fit, its box gives way (clipped).
    const barPx = Math.max(120, Math.floor(barRoom))

    // The agent strip: who is shown, and who bounces in or flashes. A card keeps its "just
    // appeared" look for a moment, so a redraw in that moment does not cut the motion short.
    const crew = visibleAgents(asList(roster), nowMs, { max: THEME.listAgents, keepMs: THEME.keepFinishedMs })
    // Forget agents that can no longer be shown (finished and past their keep time), so the
    // per-agent memory stays as small as the strip instead of growing for the whole session.
    const live = new Set(
      asList(roster)
        .filter(a => a.status === 'running' || (a.endedAt !== null && nowMs - a.endedAt <= THEME.keepFinishedMs))
        .map(a => a.id),
    )
    forgetChanges('agent:', live)
    for (const m of [firstSeenAt, statusAt]) for (const id of m.keys()) if (!live.has(id)) m.delete(id)
    const crewCards = crew.shown.map(a => {
      if (!firstSeenAt.has(a.id)) firstSeenAt.set(a.id, nowMs)
      const seen = statusAt.get(a.id)
      if (!seen || seen.status !== a.status) statusAt.set(a.id, { status: a.status, at: nowMs })
      const pop = nowMs - (firstSeenAt.get(a.id) ?? nowMs) < 1200
      const changed = statusAt.get(a.id)
      const flash = a.status !== 'running' && seen !== undefined && changed !== undefined && nowMs - changed.at < 1500
      // Every motion on the card is drawn at the point it has reached by now (loops by phase,
      // the bounce, the flash and the stats roll by time since they began), so a redraw
      // carries each one on instead of starting it over.
      const sc = noteChange(`agent:${a.id}`, agentStats(a), nowMs)
      const art = agentCardSvg(a, nowMs, {
        pop,
        flash,
        padBottom: THEME.stripGap,
        fromStats: sc.from,
        statsAgo: sc.ago,
        popAgo: nowMs - (firstSeenAt.get(a.id) ?? nowMs),
        flashAgo: changed ? nowMs - changed.at : 0,
      })
      return { a, pop, flash, art }
    })

    // Stat tiles: a ring when the figure is a percentage, else the icon.
    const tiles: Tile[] = [
      {
        key: 'context',
        icon: 'chip' as IconName,
        percent: use.percent,
        big: use.percent === null ? '—' : `${use.percent}%`,
        caption: use.tokens !== null && use.window !== null ? `context · ${fmtTokens(use.tokens)}/${fmtTokens(use.window)}` : 'context used',
      },
      ...(Array.isArray(use.limits) ? use.limits : []).map(l => ({
        key: l.kind,
        icon: (l.kind === 'five_hour' ? 'clock' : l.kind === 'seven_day' ? 'calendar' : 'gauge') as IconName,
        percent: l.percentUsed,
        big: `${Math.round(l.percentUsed)}%`,
        caption: `of ${limitLabel(l.kind)}`,
        sub: fmtReset(l.resetsAt, nowMs) ?? undefined,
      })),
      // Model speed: the ring fills against the best seen this session, and never turns red.
      {
        key: 'speed',
        icon: 'bolt' as IconName,
        percent: sp.tps === null || !(sp.peak > 0) ? 0 : Math.min(100, (sp.tps / sp.peak) * 100),
        big: sp.tps === null ? '—' : fmtSpeed(sp.tps),
        caption: 'tokens / sec',
        sub: sp.peak > 0 ? `peak ${fmtSpeed(sp.peak)}` : undefined,
        color: THEME.accent,
        calm: true,
      },
    ]
    const ringFrom = new Map<string, number>()
    const ringAgo = new Map<string, number | undefined>()
    for (const t of tiles) {
      if (t.percent === null) continue
      // The arc grows (in from 0 the first time) only in the moment the figure changes.
      const rc = noteChange(`ring:${t.key}`, t.percent, nowMs, { first: 0 })
      ringFrom.set(t.key, rc.from ?? t.percent)
      ringAgo.set(t.key, rc.ago)
    }
    // Once the last change has played, draw once more so every picture settles still, even
    // when nothing else would redraw the band (an idle session).
    if (freshUntil > nowMs && !settleBooked) {
      settleBooked = true
      $.clock.after(freshUntil - nowMs + 50, () => {
        settleBooked = false
        void update($, tick, n => (n ?? 0) + 1)
      })
    }

    return (
      <Box flexDirection="column">
          {crewCards.length > 0 ? (
            <Box columnGap={2} rowGap={1} alignItems="center" flexWrap="wrap">
              {crewCards.map(({ a, pop, flash, art }) =>
                Svg ? (
                  <Svg
                    key={`agent-${a.id}`}
                    source={art.svg}
                    alt={`${a.name}, ${a.status}`}
                    width={art.width}
                    height={art.height}
                  />
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
        <Box gap={1} alignItems="center">
          {Svg ? (
            <Svg source={dotSvg(THEME.accent, e.props.isWorking, 14, nowMs)} alt="" width={14} height={14} />
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
            // If the estimate is still too wide, the bar gives way (clipped), never the pill.
            <Box flexShrink={1} minWidth={0} overflow="hidden">
            <Svg
              source={loadingSvg(barPx, THEME.barHeight, THEME.accent, {
                live: e.props.isWorking,
                padBottom: THEME.barGap,
                now: nowMs,
              })}
              alt={e.props.isWorking ? 'Working' : 'Idle'}
              width={barPx}
              height={THEME.barHeight + THEME.barGap}
            />
            </Box>
          ) : null}
          {shownSecs !== null ? (
            <Box gap={1} alignItems="center">
              {iconEl({ Text, Svg }, 'clock', '#a8a29e', 14, '⏱')}
              <Text dimColor>{fmtElapsed(shownSecs)}</Text>
            </Box>
          ) : null}
          {pillEl(
            { Text, Svg },
            e.props.isWorking ? { text: 'working', running: true, ...PILL.busy } : { text: 'idle', fg: '#8a8480', bg: '#2a2727' },
            nowMs,
          )}
          {Svg ? (
            <Svg source={countArt.svg} alt={`${st.tools} tool calls`} width={countArt.width} height={countArt.height} />
          ) : (
            <Text dimColor>{`⚡ ${st.tools} ${st.tools === 1 ? 'tool' : 'tools'}`}</Text>
          )}
        </Box>

        <Box flexDirection="row" alignItems="flex-start" flexWrap="nowrap" gap={2} width="100%">
          <Box flexDirection="column" flexShrink={1} flexGrow={1} minWidth={0}>
        <Box columnGap={3} rowGap={1} alignItems="center" flexWrap="wrap">
          {tiles.map(t => (
            <Box key={`tile-${t.key}`} gap={1} alignItems="center">
              {t.percent === null ? (
                <Text>{t.icon}</Text>
              ) : Svg ? (
                <Svg
                  source={ringSvg(t.percent, (t.color ?? ringColor(t.percent)), RING, {
                    from: ringFrom.get(t.key) ?? 0,
                    ago: ringAgo.get(t.key),
                    now: nowMs,
                    pulse: !t.calm && t.percent >= 85,
                    icon: t.icon,
                  })}
                  alt={`${t.big} ${t.caption}`}
                  width={RING}
                  height={RING}
                />
              ) : (
                <Text color={(t.color ?? ringColor(t.percent))}>{glyph(t.percent)}</Text>
              )}
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
              new picture, an image swaps in place. Their roll and tick still play where the
              surface animates images; elsewhere each picture already shows the right value. */}
          {cards.map((c, i) =>
            Svg ? (
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
      </Box>
      </Box>
    )
  })

  // ---- Transcript ----------------------------------------------------------

  // The prompt you typed: a rounded card.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.props.origin.kind !== 'composer' || !e.props.isExpanded) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box borderStyle="round" borderColor={THEME.warm} paddingX={1}>
        <Text>{e.props.text}</Text>
      </Box>
    )
  })

  // A tool call: round badge, coloured verb, target, status pill, duration.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props
    const d = describe(p.tool, p.input, reruns.has(p.tool_use_id))
    const pill = statusPill(p.tool, p)
    const ms = durations.get(p.tool_use_id)
    // Only a running row loops (spinner, busy pill); it picks up its phase so a redraw carries it on.
    const now = p.isRunning ? await $.clock.now() : 0
    const color = KIND_COLOR[d.kind]
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null

    return (
      <Box justifyContent="space-between" alignItems="center" gap={1}>
        {/* The verb and target give way (cut in the middle, so the file name stays); the
            pill and the duration on the right never shrink or wrap. */}
        <Box gap={1} alignItems="center" flexShrink={1} minWidth={0}>
          {Svg ? (
            <Svg source={badgeSvg(color, KIND_ICON[d.kind], 30, p.isRunning, now)} alt={d.verb} width={30} height={30} />
          ) : (
            <Text color={color} bold>{` ${KIND_GLYPH[d.kind]} `}</Text>
          )}
          <Text wrap="truncate-middle">
            <Text bold color={color}>{d.verb}</Text>
            <Text> {d.target}</Text>
          </Text>
        </Box>
        <Box gap={1} alignItems="center" flexShrink={0}>
          {pillEl({ Text, Svg }, pill, now)}
          {ms !== undefined && !p.isRunning ? <Text dimColor>{fmtDuration(ms)}</Text> : null}
        </Box>
      </Box>
    )
  })

  // What an Edit or Write changed: a numbered diff card.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const p = e.props
    const isFile = p.tool === 'Edit' || p.tool === 'Write'
    if (!isFile || p.isErrored) return next(e)

    const out = (p.output ?? {}) as { filePath?: string; structuredPatch?: unknown; content?: string; type?: string }
    const { rows, more } = diffRows(out.structuredPatch, out.type === 'create' ? out.content : undefined)
    if (rows.length === 0) return next(e)

    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null
    const { added, removed } = countChanges(rows)
    const took = durations.get(p.tool_use_id)
    const gutter = String(Math.max(...rows.map(r => r.n ?? 0))).length

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="#4a4240" marginLeft={3}>
        <Box paddingX={1} gap={1} alignItems="center">
          {iconEl({ Text, Svg }, 'file', '#8f8985', 14, '')}
          <Text bold dimColor>{base(out.filePath ?? '')}</Text>
          {added > 0 ? pillEl({ Text, Svg }, { text: `${added} added`, ...PILL.ok }) : null}
          {removed > 0 ? pillEl({ Text, Svg }, { text: `${removed} removed`, ...PILL.bad }) : null}
          {took !== undefined ? <Text dimColor>{fmtDuration(took)}</Text> : null}
        </Box>
        {rows.map((r, i) => (
          <Box key={`diff-${i}`} justifyContent="space-between" paddingX={1}>
            <Box gap={1}>
              <Text dimColor>{String(r.n ?? '').padStart(gutter)}</Text>
              <Text
                color={r.sign === '+' ? PILL.ok.fg : r.sign === '-' ? PILL.bad.fg : undefined}
                backgroundColor={r.sign === '+' ? PILL.ok.bg : r.sign === '-' ? PILL.bad.bg : undefined}
                dimColor={r.sign === ' '}
                wrap="truncate"
              >
                {`${r.sign} ${r.text}`}
              </Text>
            </Box>
          </Box>
        ))}
        {more > 0 ? (
          <Box paddingX={1}>
            <Text dimColor>… {more} more lines</Text>
          </Box>
        ) : null}
      </Box>
    )
  })

  // A folded run of reads and searches: one summary row.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.props.isExpanded) return next(e)
    const calls = e.props.calls
    const counts: Record<string, number> = {}
    for (const c of calls) counts[c.tool] = (counts[c.tool] ?? 0) + 1
    const summary = top(counts, 4)
      .map(([name, n]) => `${name} ${n}`)
      .join(' · ')
    const isRunning = calls.some(c => c.isRunning)
    const isErrored = calls.some(c => c.isErrored)
    const now = isRunning ? await $.clock.now() : 0
    const pill = isRunning
      ? { text: 'running', running: true, ...PILL.busy }
      : isErrored
        ? { text: 'error', icon: 'cross' as const, ...PILL.bad }
        : { text: `${calls.length} calls`, icon: 'check' as const, ...PILL.ok }
    const color = KIND_COLOR.search
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null

    return (
      <Box justifyContent="space-between" alignItems="center" gap={1}>
        {/* The verb and target give way (cut in the middle, so the file name stays); the
            pill and the duration on the right never shrink or wrap. */}
        <Box gap={1} alignItems="center" flexShrink={1} minWidth={0}>
          {Svg ? (
            <Svg source={badgeSvg(color, KIND_ICON.search, 30, isRunning, now)} alt="Explore" width={30} height={30} />
          ) : (
            <Text color={color} bold>{` ${KIND_GLYPH.search} `}</Text>
          )}
          <Text wrap="truncate-middle">
            <Text bold color={color}>Explore</Text>
            <Text> {summary}</Text>
          </Text>
        </Box>
        <Box flexShrink={0}>{pillEl({ Text, Svg }, pill, now)}</Box>
      </Box>
    )
  })

  // The end-of-turn line: a pill instead of a dim word.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const Svg = 'Svg' in table ? table.Svg : null
    return (
      <Box gap={1} alignItems="center">
        {pillEl({ Text, Svg }, { text: e.props.word, icon: 'check' as const, ...PILL.ok })}
        <Text dimColor>{fmtDuration(e.props.durationMs)}</Text>
      </Box>
    )
  })
}

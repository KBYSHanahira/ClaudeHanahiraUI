import { describe, expect, test } from 'claude-code/testing'

// The surface modules' JSX compiles against the environment's `h`: a plain stand-in here.
;(globalThis as { h?: unknown }).h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props: { ...(props ?? {}), children },
})

const { default: Spinner, SPINNER_FRAMES, SPINNER_FRAME_MS } = await import('./spinner')
const { default: Shimmer, shimmerRuns, SHIMMER_LIGHT } = await import('./shimmer')

/** A surface that keeps state like the engine's and lets the test fire its timers. */
const fakeSurface = <S>() => {
  const timers: { ms: number; fn: () => void }[] = []
  const s = {
    elements: { Text: 'Text', Box: 'Box' },
    state: undefined as S | undefined,
    setState(next: S) {
      s.state = next
    },
    every(ms: number, fn: () => void) {
      timers.push({ ms, fn })
      return () => {}
    },
  }
  return { s, timers }
}

const text = (tree: unknown): string => {
  const t = tree as { props?: { children?: unknown[] } } | string
  if (typeof t === 'string') return t
  return (t?.props?.children ?? []).map(text).join('')
}

describe('spinner surface module', () => {
  test('starts one timer on its first call and steps a frame on each tick', () => {
    const { s, timers } = fakeSurface<{ frame: number }>()
    const props = { color: '#fff', bg: '', label: 'running' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draw = () => text(Spinner(props, s as any))
    expect(draw()).toBe(` ${SPINNER_FRAMES[0]} running `)
    expect(timers).toHaveLength(1)
    expect(timers[0]!.ms).toBe(SPINNER_FRAME_MS)
    timers[0]!.fn()
    expect(draw()).toBe(` ${SPINNER_FRAMES[1]} running `)
    // A redraw (new props, the plugin redrawing) neither adds a timer nor restarts the frame.
    expect(timers).toHaveLength(1)
    for (let i = 0; i < SPINNER_FRAMES.length; i++) timers[0]!.fn()
    expect(draw()).toBe(` ${SPINNER_FRAMES[1]} running `)
  })

  test('without a label it is the glyph alone, one cell wide', () => {
    const { s } = fakeSurface<{ frame: number }>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(text(Spinner({ color: '#fff', bg: '', label: '' }, s as any))).toBe(SPINNER_FRAMES[0])
  })
})

describe('shimmer surface module', () => {
  test('the runs always add up to the bar, the light clipped at both ends', () => {
    for (const at of [-SHIMMER_LIGHT, -3, 0, 5, 37, 40, 45]) {
      const r = shimmerRuns(40, at)
      expect(r.before + r.lit + r.after).toBe(40)
      expect(r.lit).toBeLessThanOrEqual(SHIMMER_LIGHT)
    }
    expect(shimmerRuns(40, -SHIMMER_LIGHT).lit).toBe(0)
    expect(shimmerRuns(40, 10)).toEqual({ before: 10, lit: SHIMMER_LIGHT, after: 40 - 10 - SHIMMER_LIGHT })
  })

  test('the light glides one cell a tick, comes round, and follows a new length', () => {
    const { s, timers } = fakeSurface<{ at: number; bar: { cells: number } }>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draw = (cells: number) => Shimmer({ cells, color: '#fff', track: '#333' }, s as any)
    draw(20)
    expect(s.state!.at).toBe(-SHIMMER_LIGHT)
    timers[0]!.fn()
    expect(s.state!.at).toBe(-SHIMMER_LIGHT + 1)
    draw(10)
    for (let i = 0; i < 30; i++) timers[0]!.fn()
    // Wrapped round at the new length (10), never run past it.
    expect(s.state!.at).toBeLessThanOrEqual(10)
    expect(timers).toHaveLength(1)
  })
})

// A surface module (a `Client`'s): the band's working bar, a light gliding along a track,
// moved by Desktop on its own frame clock. Why on the surface: see spinner.tsx.
import type { ClientModule } from 'claude-code'

/** The bar's length in cells, and its colours: the light, and the track under it. */
export type ShimmerProps = { cells: number; color: string; track: string }

/** How long the light is, in cells, and how often it moves one cell on. */
export const SHIMMER_LIGHT = 8
export const SHIMMER_STEP_MS = 40

/** The three runs a frame draws: track before the light, the light, track after it. */
export const shimmerRuns = (cells: number, at: number, light = SHIMMER_LIGHT) => {
  const start = Math.max(0, Math.min(cells, at))
  const end = Math.max(0, Math.min(cells, at + light))
  return { before: start, lit: end - start, after: cells - end }
}

// `bar` is the instance's own: the timer reads the length the latest props gave.
type ShimmerState = { at: number; bar: { cells: number } }

const Shimmer: ClientModule<ShimmerProps, ShimmerState> = (props, s) => {
  const { Box, Text } = s.elements
  const cells = Math.max(1, Math.floor(props.cells))
  if (s.state === undefined) {
    // The light enters from the left edge, crosses, leaves, and comes round again.
    const bar = { cells }
    let at = -SHIMMER_LIGHT
    s.setState({ at, bar })
    s.every(SHIMMER_STEP_MS, () => {
      at = at >= bar.cells ? -SHIMMER_LIGHT : at + 1
      s.setState({ at, bar })
    })
  } else {
    s.state.bar.cells = cells
  }
  const run = shimmerRuns(cells, s.state?.at ?? -SHIMMER_LIGHT)
  // One line of the monospaced face, cut rather than wrapped: in a proportional face `━` runs
  // wider than a cell, and the bar would spill onto a second line.
  return (
    <Box flexDirection="row" flexWrap="nowrap" overflow="hidden">
      <Text mono wrap="truncate-end">
        <Text color={props.track}>{'━'.repeat(run.before)}</Text>
        <Text color={props.color}>{'━'.repeat(run.lit)}</Text>
        <Text color={props.track}>{'━'.repeat(run.after)}</Text>
      </Text>
    </Box>
  )
}

export default Shimmer

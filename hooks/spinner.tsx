// A surface module (a `Client`'s): a spinner Desktop turns on its own frame clock.
//
// A picture drawn by the hooks module reaches Desktop over the session's link, and every
// update sends a new one: however its phase is reckoned, a link whose delay wavers makes the
// motion jump. This runs on the surface itself, its instance kept across the plugin's
// redraws, so the motion owes nothing to the link and never restarts while the row lives.
import type { ClientModule } from 'claude-code'

/** The colours and the word beside the spinner (`''` for none). */
export type SpinnerProps = { color: string; bg: string; label: string }

/** Braille frames: a dot running round a cell, one character wide, so nothing shifts. */
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
export const SPINNER_FRAME_MS = 80

const Spinner: ClientModule<SpinnerProps, { frame: number }> = (props, s) => {
  const { Text } = s.elements
  if (s.state === undefined) {
    // One timer for the instance's life, started on its first call only.
    let frame = 0
    s.setState({ frame })
    s.every(SPINNER_FRAME_MS, () => {
      frame = (frame + 1) % SPINNER_FRAMES.length
      s.setState({ frame })
    })
  }
  const glyph = SPINNER_FRAMES[s.state?.frame ?? 0]
  return (
    <Text color={props.color} backgroundColor={props.bg || undefined} bold>
      {props.label ? ` ${glyph} ${props.label} ` : glyph}
    </Text>
  )
}

export default Spinner

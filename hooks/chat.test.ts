import { describe, expect, test } from 'claude-code/testing'

import { base, KIND_ICON, fmtReset, badgeSvg, cardSvg, chipSvg, CHIP_LINE, statSvg, STAT, liveSpeed, speedScale, speedoSvg, countSvg, dotSvg, countChanges, describe as describeCall, diffRows, fmtClock, fmtCost, fmtDuration,
  fmtElapsed, fmtTokens, fmtSpeed, tokensPerSec, parseTests, pillSvg, loadingSvg, statusPill, meterSvg, METER, contextSvg, CONTEXT, barCapSvg, fileChange, taskKind, taskPill, taskSummary, PILL, MOTION, glider, easeOut } from './chat'

/** Rounded to cents: the engine's test kit has no toBeCloseTo. */
const cents = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100)

describe('describe', () => {
  test('Bash runs, then reruns', () => {
    expect(describeCall('Bash', { command: 'bun test' }).verb).toBe('Run')
    expect(describeCall('Bash', { command: 'bun test' }, true).verb).toBe('Rerun')
  })

  test('file tools show the file name', () => {
    expect(describeCall('Edit', { file_path: '/a/b/register.tsx' })).toEqual({ kind: 'edit', verb: 'Edit', target: 'register.tsx' })
    expect(describeCall('Read', { file_path: '/x/y.ts' }).target).toBe('y.ts')
  })

  test('removing files reads as a delete, named by the files', () => {
    expect(describeCall('Bash', { command: 'rm -rf dist/old.js build' })).toEqual({ kind: 'delete', verb: 'Delete', target: 'old.js build' })
    expect(describeCall('Bash', { command: 'git rm hooks/x.ts', description: 'Drop x' }).target).toBe('Drop x')
    expect(describeCall('Bash', { command: 'sudo rm /tmp/a; ls' }).target).toBe('a')
    expect(describeCall('Bash', { command: 'npm run rm-cache' }).kind).toBe('run')
    expect(describeCall('Bash', { command: 'echo rm x' }).kind).toBe('run')
  })

  test('a delete ends at a newline, and a path after -- counts even with a dash', () => {
    expect(describeCall('Bash', { command: 'rm a.txt\necho done' }).target).toBe('a.txt')
    expect(describeCall('Bash', { command: 'rm -f -- -weird b' }).target).toBe('-weird b')
  })

  test('a description that opens with the row\'s verb does not say it twice', () => {
    expect(describeCall('Bash', { command: 'bun test', description: 'Run the test suite' }).target).toBe('the test suite')
    expect(describeCall('Bash', { command: 'bun test', description: 'run tests' }, true)).toEqual({ kind: 'run', verb: 'Rerun', target: 'tests' })
    expect(describeCall('Bash', { command: 'bun test', description: 'Rerun the suite' }, true).target).toBe('the suite')
    expect(describeCall('Bash', { command: 'rm a', description: 'Remove old builds' })).toEqual({ kind: 'delete', verb: 'Delete', target: 'old builds' })
    expect(describeCall('Bash', { command: 'rm a', description: 'Delete a' }).target).toBe('a')
    // Only the verb as a word: a description that is the verb alone, or starts with a longer word, stays.
    expect(describeCall('Bash', { command: 'x', description: 'Run' }).target).toBe('Run')
    expect(describeCall('Bash', { command: 'x', description: 'Runtime check' }).target).toBe('Runtime check')
    expect(describeCall('Bash', { command: 'x', description: 'List files' }).target).toBe('List files')
  })

  test('mcp tools fall back to their short name', () => {
    expect(describeCall('mcp__srv__do_thing', {}).target).toBe('do_thing')
  })
})

describe('statusPill', () => {
  const idle = { isRunning: false, isErrored: false, isInterrupted: false }

  test('running, errored, interrupted', () => {
    expect(statusPill('Bash', { ...idle, isRunning: true })).toMatchObject({ text: 'running', running: true })
    expect(statusPill('Bash', { ...idle, isErrored: true })).toMatchObject({ text: 'error', icon: 'cross' })
    expect(statusPill('Bash', { ...idle, isInterrupted: true })).toMatchObject({ text: 'interrupted', icon: 'ban' })
  })

  test('Bash reads test counts', () => {
    expect(statusPill('Bash', { ...idle, output: { stdout: ' 3 pass\n 0 fail' } })).toMatchObject({ text: '3 passed', icon: 'check' })
    expect(statusPill('Bash', { ...idle, output: { stdout: '2 pass\n1 fail' } })).toMatchObject({ text: '1 failed', icon: 'cross' })
    expect(statusPill('Bash', { ...idle, output: { stdout: 'ok' } })).toMatchObject({ text: 'done', icon: 'check' })
  })

  test('Edit is saved, Read counts lines', () => {
    expect(statusPill('Edit', idle)).toMatchObject({ text: 'saved', icon: 'check' })
    expect(statusPill('Read', { ...idle, output: { file: { numLines: 12 } } })).toMatchObject({ text: '12 lines', icon: 'check' })
    expect(statusPill('Read', { ...idle, output: { file: { numLines: 1 } } })).toMatchObject({ text: '1 line' })
  })
})

describe('parseTests', () => {
  test('finds passed and failed', () => {
    expect(parseTests('Tests: 4 passed, 2 failed')).toEqual({ passed: 4, failed: 2 })
    expect(parseTests('nothing here')).toEqual({ passed: null, failed: null })
  })
})

describe('diffRows', () => {
  const hunks = [{ oldStart: 5, newStart: 5, lines: [' keep', '-old', '+new', '+new2', ' tail'] }]

  test('numbers lines like an editor', () => {
    const { rows } = diffRows(hunks)
    expect(rows.map(r => [r.n, r.sign])).toEqual([
      [5, ' '],
      [6, '-'],
      [6, '+'],
      [7, '+'],
      [8, ' '],
    ])
    expect(countChanges(rows)).toEqual({ added: 2, removed: 1 })
  })

  test('falls back to the content as additions and caps rows', () => {
    const { rows, more } = diffRows([], 'a\nb\nc', 2)
    expect(rows).toEqual([
      { n: 1, sign: '+', text: 'a' },
      { n: 2, sign: '+', text: 'b' },
    ])
    expect(more).toBe(1)
  })

  test('counts every change, not only the rows it shows', () => {
    const { rows, added, removed } = diffRows([], Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n'))
    expect(rows.length).toBe(14)
    expect({ added, removed }).toEqual({ added: 30, removed: 0 })
  })

  test('a gap row sits between hunks, and counts nothing', () => {
    const { rows, added, removed } = diffRows([
      { oldStart: 3, newStart: 3, lines: ['-a', '+b'] },
      { oldStart: 40, newStart: 40, lines: [' c', '+d'] },
    ])
    expect(rows.map(r => r.sign)).toEqual(['-', '+', '@', ' ', '+'])
    expect(rows[2]).toEqual({ n: null, sign: '@', text: '' })
    expect({ added, removed }).toEqual({ added: 2, removed: 1 })
  })

  test('more counts hidden lines, not gap rows, and no gap ends the rows shown', () => {
    const many = { oldStart: 1, newStart: 1, lines: Array.from({ length: 14 }, (_, i) => `+l${i}`) }
    const { rows, more } = diffRows([many, { oldStart: 90, newStart: 90, lines: ['+z'] }])
    expect(rows.length).toBe(14)
    expect(more).toBe(1)
    const cut = diffRows([{ ...many, lines: many.lines.slice(0, 13) }, { oldStart: 90, newStart: 90, lines: ['+z'] }])
    expect(cut.rows.map(r => r.sign).at(-1)).toBe('+')
    expect(cut.more).toBe(1)
  })

  test('skips the no-newline marker: it is no line of the file', () => {
    const { rows } = diffRows([{ oldStart: 1, newStart: 1, lines: ['-a', '\\ No newline at end of file', '+a', ' b'] }])
    expect(rows.map(r => [r.n, r.sign, r.text])).toEqual([
      [1, '-', 'a'],
      [1, '+', 'a'],
      [2, ' ', 'b'],
    ])
  })
})

describe('fileChange', () => {
  test('an Edit gives its patch, a new file its content, anything else nothing', () => {
    expect(fileChange('Edit', { structuredPatch: [{ oldStart: 1, newStart: 1, lines: ['-a', '+b'] }] })).toMatchObject({ added: 1, removed: 1 })
    expect(fileChange('Write', { type: 'create', content: 'x\ny', structuredPatch: [] })).toMatchObject({ added: 2, removed: 0 })
    expect(fileChange('Write', { type: 'update', content: 'x', structuredPatch: [] })?.rows).toEqual([])
    // The last newline ends the last line; it adds no empty line of its own.
    expect(fileChange('Write', { type: 'create', content: 'a\nb\n', structuredPatch: [] })).toMatchObject({ added: 2 })
    expect(fileChange('Write', { type: 'create', content: '\n', structuredPatch: [] })).toMatchObject({ added: 1 })
    expect(fileChange('Edit', 'Error: file not found')?.rows).toEqual([])
    expect(fileChange('Read', { file: {} })).toBeNull()
  })
})

describe('task rows', () => {
  test('a shell task runs; anything else is an agent', () => {
    expect(taskKind('local_bash')).toBe('run')
    expect(taskKind('local_agent')).toBe('agent')
    expect(taskKind(undefined)).toBe('agent')
  })

  test('the summary drops what the row already says: the verb, the ending, the quotes', () => {
    expect(taskSummary('Agent "Agent smoke test" completed', 'Agent')).toBe('Agent smoke test')
    expect(taskSummary('Background command "bun test" failed\nmore', 'Task')).toBe('Background command "bun test"')
    expect(taskSummary('\n  "lint" was stopped.', 'Task')).toBe('lint')
    expect(taskSummary('Done reading', 'Agent')).toBe('Done reading')
  })

  test('the ending reads as done, failed or stopped; anything else as itself', () => {
    expect(taskPill('completed')).toMatchObject({ text: 'done', icon: 'check' })
    expect(taskPill('failed')).toMatchObject({ text: 'failed', icon: 'cross' })
    expect(taskPill('killed')).toMatchObject({ text: 'stopped', icon: 'ban' })
    expect(taskPill('paused').text).toBe('paused')
    expect(taskPill(undefined).text).toBe('update')
  })
})

describe('format', () => {
  test('fmtDuration', () => {
    expect(fmtDuration(1100)).toBe('1.1 s')
    expect(fmtDuration(64000)).toBe('1m 4s')
    expect(fmtDuration(59949)).toBe('59.9 s')
    expect(fmtDuration(59950)).toBe('1m 0s')
    expect(fmtDuration(60000)).toBe('1m 0s')
    expect(fmtDuration(3_700_000)).toBe('1h 1m')
    expect(fmtDuration(NaN)).toBe('0s')
  })

  test('fmtElapsed', () => {
    expect(fmtElapsed(7)).toBe('7s')
    expect(fmtElapsed(64)).toBe('1m 4s')
    expect(fmtElapsed(7500)).toBe('2h 5m')
    expect(fmtElapsed(90000)).toBe('1d 1h')
    expect(fmtElapsed(59)).toBe('59s')
    expect(fmtElapsed(60)).toBe('1m 0s')
    expect(fmtElapsed(3599)).toBe('59m 59s')
    expect(fmtElapsed(3600)).toBe('1h 0m')
    expect(fmtElapsed(86399)).toBe('23h 59m')
    expect(fmtElapsed(86400)).toBe('1d 0h')
    expect(fmtElapsed(-5)).toBe('0s')
    expect(fmtElapsed(NaN)).toBe('0s')
    expect(fmtElapsed(Infinity)).toBe('0s')
  })

  test('badgeSvg escapes the glyph', () => {
    expect(badgeSvg('#fff', '>_', 30)).toContain('&gt;_')
  })
})



describe('stat card formatters', () => {
  test('fmtCost always has two decimals', () => {
    expect(fmtCost(0.34)).toBe('$0.34')
    expect(fmtCost(15.616)).toBe('$15.62')
    expect(fmtCost(0)).toBe('$0.00')
  })

  test('fmtClock reads like a stopwatch', () => {
    expect(fmtClock(18000)).toBe('0:18')
    expect(fmtClock(725000)).toBe('12:05')
    expect(fmtClock(3723000)).toBe('1:02:03')
    expect(fmtClock(-5)).toBe('0:00')
  })
})

describe('fmtTokens', () => {
  test('plain, k, M, B', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(1500)).toBe('1.5k')
    expect(fmtTokens(196000)).toBe('196k')
    expect(fmtTokens(1_000_000)).toBe('1M')
    expect(fmtTokens(1_250_000)).toBe('1.25M')
    expect(fmtTokens(48_700_000)).toBe('48.7M')
    expect(fmtTokens(3_400_000_000)).toBe('3.4B')
  })

  test('rolls over at the unit edge and never prints 1000k', () => {
    expect(fmtTokens(999_999)).toBe('1M')
    expect(fmtTokens(999_999_999)).toBe('1B')
  })

  test('zero and negatives', () => {
    expect(fmtTokens(0)).toBe('0')
    expect(fmtTokens(-4)).toBe('0')
  })
})

describe('a figure that is no reading', () => {
  test('shows a dash, never NaN or Infinity', () => {
    for (const v of [NaN, Infinity]) {
      expect(fmtCost(v)).toBe('—')
      expect(fmtClock(v)).toBe('—')
      expect(fmtTokens(v)).toBe('—')
      expect(fmtSpeed(v)).toBe('—')
      expect(fmtDuration(v)).toBe('0s')
    }
    expect(fmtSpeed(-Infinity)).toBe('—')
    expect(fmtDuration(-500)).toBe('0.0 s')
    expect(contextSvg(NaN, '#fff').svg).toContain('>—<')
  })

  test('a reset time against an unreadable clock is no reading at all', () => {
    expect(fmtReset('2026-10-27T10:00:00Z', NaN)).toBeNull()
    expect(fmtReset('2026-10-27T10:00:00Z', -Infinity)).toBeNull()
  })

  test('pictures built on one carry no NaN', () => {
    expect(speedoSvg(NaN, '#fff', 20)).not.toContain('NaN')
    expect(contextSvg(NaN, '#fff', { left: 'x' }).svg).not.toContain('NaN')
  })
})

describe('tokensPerSec', () => {
  test('output tokens over seconds', () => {
    expect(tokensPerSec(500, 5000)).toBe(100)
    expect(tokensPerSec(90, 1000)).toBe(90)
  })

  test('too short or untimed gives null', () => {
    expect(tokensPerSec(5, 1000)).toBeNull()
    expect(tokensPerSec(500, 0)).toBeNull()
    expect(tokensPerSec(500, -3)).toBeNull()
  })

  test('fmtSpeed keeps one decimal only under 10', () => {
    expect(fmtSpeed(8.46)).toBe('8.5')
    expect(fmtSpeed(42.4)).toBe('42')
    expect(fmtSpeed(100)).toBe('100')
  })
})

describe('pillSvg', () => {
  test('is a full capsule that carries the label and colours', () => {
    const { svg, width, height } = pillSvg('done', '#a9e6b4', '#2d4232', 24, false, 'check')
    expect(svg).toContain('rx="12"')
    expect(svg).toContain('>done</text>')
    expect(svg).toContain('stroke-linecap="round"') // the check mark is drawn, not typed
    expect(svg).toContain('#2d4232')
    expect(svg).toContain(`width="${width}"`)
    expect(height).toBe(24)
  })

  test('longer labels make wider capsules', () => {
    expect(pillSvg('1 removed', '#fff', '#000').width).toBeGreaterThan(pillSvg('1 added', '#fff', '#000').width)
  })

  test('pins the label width so the fit does not depend on the font', () => {
    expect(pillSvg('91 ms', '#fff', '#000').svg).toContain('textLength=')
  })

  test('escapes markup characters in the label', () => {
    expect(pillSvg('a<b&c', '#fff', '#000').svg).toContain('a&lt;b&amp;c')
  })
})

describe('pills and tiles are still', () => {
  test('no pill or tile carries an animation, running or not', () => {
    for (const svg of [
      pillSvg('running', '#c4baff', '#2d3a3f', 24, true).svg,
      pillSvg('done', PILL.ok.fg, PILL.ok.bg, 22, false, 'check').svg,
      pillSvg('error', PILL.bad.fg, PILL.bad.bg, 22, false, 'cross').svg,
      badgeSvg('#7cb7ff', 'file', 32, true),
      badgeSvg('#7cb7ff', 'file', 32, false),
    ]) {
      expect(svg).not.toContain('<animate')
      expect(svg).not.toContain('<set ')
    }
  })

  test('the dots make room: a running capsule is wider', () => {
    expect(pillSvg('running', '#fff', '#000', 24, true).width).toBeGreaterThan(pillSvg('running', '#fff', '#000', 24, false).width)
  })

  test('every picture is well-formed: no tag repeats an attribute', () => {
    const all = [
      pillSvg('error', '#fff', '#000', 22, false, 'cross').svg,
      pillSvg('running', '#fff', '#000', 22, true).svg,
      badgeSvg('#fff', 'file', 32, false),
      badgeSvg('#fff', 'file', 32, true),
    ]
    for (const svg of all)
      for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
        const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map(m => m[1])
        expect(names.length).toBe(new Set(names).size)
      }
  })
})

describe('loadingSvg', () => {
  test('idle is a quiet track: no animation, no mask', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7')
    expect(svg).toContain('width="500" height="18"')
    expect(svg).not.toContain('<animate')
    expect(svg).not.toContain('<mask')
  })

  test('live lights the dots across the track, still', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7', { live: true })
    expect(svg).toContain('fill-opacity="0.95"')
    expect(svg).not.toContain('<animate')
  })

  test('draws no number: no label, no pill', () => {
    expect(loadingSvg(500, 18, '#9b8cf7', { live: true })).not.toContain('<text')
  })

  test('is deterministic', () => {
    expect(loadingSvg(400, 18, '#fff', { live: true })).toBe(loadingSvg(400, 18, '#fff', { live: true }))
  })

  test('padBottom adds transparent room and leaves the bar alone', () => {
    const padded = loadingSvg(600, 18, '#fff', { padBottom: 6 })
    expect(padded).toContain('viewBox="0 0 600 24" width="600" height="24"')
    expect(padded).toContain('<rect width="600" height="18" rx="9"')
  })

  test('a narrowed box cuts the bar at the right instead of shrinking it', () => {
    expect(loadingSvg(900, 18, '#fff')).toContain('preserveAspectRatio="xMinYMid slice"')
  })

  test('open: the left end round, the right end square for the cut, and a cap to round it off', () => {
    const open = loadingSvg(900, 12, '#fff', { open: true, live: true })
    expect(open).toContain('<path d="M6 0H900V12H6A6 6 0 0 1 6 0z" fill="#332f2d"/>')
    expect(open).not.toContain('rx="6"')
    const cap = barCapSvg(12, 6)
    expect(cap.width).toBe(6)
    expect(cap.height).toBe(18)
    expect(cap.svg).toContain('A6 6 0 0 1 0 12z" fill="#332f2d"')
    expect(cap.svg).not.toContain('fill-opacity')
  })

  test('a live cap takes the same tint as the lit track, so the right end rounds like the left', () => {
    const tint = 'fill="#9b8cf7" fill-opacity="0.2"'
    expect(loadingSvg(900, 12, '#9b8cf7', { open: true, live: true })).toContain(`0 1 6 0z" ${tint}`)
    expect(barCapSvg(12, 6, '#9b8cf7').svg).toContain(`A6 6 0 0 1 0 12z" ${tint}`)
  })
})

describe('band pictures', () => {
  test('the status dot wears a halo while live, and nothing moves', () => {
    expect(dotSvg('#9b8cf7', true).match(/<circle/g)?.length).toBe(2)
    expect(dotSvg('#9b8cf7', false).match(/<circle/g)?.length).toBe(1)
    expect(dotSvg('#9b8cf7', true)).not.toContain('<animate')
  })

  test('a card is a still picture', () => {
    expect(cardSvg('Cost', '≈$15.62', { icon: 'coin', iconColor: '#f2c94c' }).svg).not.toContain('<animate')
    expect(cardSvg('Time', '1:06', { icon: 'stopwatch' }).svg).toContain('>1:06</text>')
  })

  test('a card carries its label and value, escaped, and grows with the value', () => {
    expect(cardSvg('A<B', '1&2').svg).toContain('A&lt;B')
    expect(cardSvg('Cost', '≈$1,234,567.89').width).toBeGreaterThan(cardSvg('Cost', '1').width)
  })

  test('a stat is one line: glyph, value, then label and detail; width only widens it', () => {
    const s = statSvg('17%', 'context', { detail: '171k/1M', icon: 'chip' })
    expect(s.height).toBe(STAT.height)
    // The label follows an invisible copy of the value, so the renderer places it.
    expect(s.svg).toMatch(/fill-opacity="0">17%<\/tspan><tspan dx="5">context<\/tspan><tspan[^>]*> · 171k\/1M</)
    expect(statSvg('17%', 'context', { width: 400 }).width).toBe(400)
    expect(statSvg('17%', 'context', { width: 10 }).width).toBe(statSvg('17%', 'context').natural)
  })

  test('live speed is the rate over the recent window, in tokens', () => {
    // 400 chars a second at 4 chars a token is 100 tokens a second.
    const s: Array<[number, number]> = [[0, 0], [500, 200], [1000, 400], [1500, 600], [2000, 800]]
    expect(cents(liveSpeed(s, 2000))).toBe(100)
    // Only the last window counts: a slow start no longer drags it down.
    expect(cents(liveSpeed([[0, 0], [3000, 10], [3500, 410]], 3500, { windowMs: 600, minMs: 400 }))).toBe(200)
    expect(liveSpeed([[0, 0], [100, 400]], 100)).toBeNull()
    expect(liveSpeed([], 0)).toBeNull()
    expect(cents(liveSpeed(s, 2000, { charsPerToken: 2 }))).toBe(200)
  })

  test('the speedometer scale is a round step clear of the peak', () => {
    expect(speedScale(0)).toBe(50)
    expect(speedScale(91)).toBe(150)
    expect(speedScale(122)).toBe(150)
    expect(speedScale(140)).toBe(200)
    expect(speedScale(5000)).toBe(6000)
  })

  test('the speedometer points its needle at the fraction', () => {
    expect(speedoSvg(0.5, '#9b8cf7', 22)).toContain('rotate(0.0 22 22)')
    expect(speedoSvg(0.5, '#9b8cf7', 22)).not.toContain('<animate')
    expect(speedoSvg(3, '#fff', 22)).toContain('rotate(135.0 22 22)')
  })

  test('a stat takes a ring in the glyph slot, and is still', () => {
    const ring = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"></svg>'
    expect(statSvg('9%', '5-hour limit', { ring }).svg).toContain(`<g transform="translate(0 ${(STAT.height - STAT.glyph) / 2})">${ring}</g>`)
    expect(statSvg('$2', 'cost').svg).not.toContain('<animate')
  })
})

describe('countSvg', () => {
  test('says what it counts: the number and its word, singular or plural', () => {
    expect(countSvg(8).svg).toContain('>tools</text>')
    expect(countSvg(1).svg).toContain('>tool</text>')
    expect(countSvg(0).svg).toContain('>0')
  })

  test('has a hover title explaining itself', () => {
    expect(countSvg(3).svg).toContain('<title>Tool calls this turn</title>')
  })

  test('grows wider with more digits and a longer word', () => {
    expect(countSvg(1234).width).toBeGreaterThan(countSvg(1).width)
    expect(countSvg(5, { label: 'calls' }).width).toBeGreaterThan(countSvg(5, { label: 'x' }).width)
  })

  test('carries the bolt icon, drawn', () => {
    expect(countSvg(2).svg).toContain('stroke-linecap="round"')
  })
})

describe('fmtReset', () => {
  const now = Date.parse('2026-10-15T10:00:00Z')
  const at = (ms: number) => new Date(now + ms).toISOString()

  test('minutes, hours, days, in whole units', () => {
    expect(fmtReset(at(45 * 60_000), now)).toBe('resets in 45m')
    expect(fmtReset(at(2 * 3_600_000), now)).toBe('resets in 2h')
    expect(fmtReset(at(3 * 3_600_000 + 20 * 60_000), now)).toBe('resets in 3h 20m')
    expect(fmtReset(at(2 * 86_400_000 + 4 * 3_600_000), now)).toBe('resets in 2d 4h')
    expect(fmtReset(at(3 * 86_400_000), now)).toBe('resets in 3d')
  })

  test('under a minute and already past', () => {
    expect(fmtReset(at(30_000), now)).toBe('resets in <1m')
    expect(fmtReset(at(-5_000), now)).toBe('resetting now')
  })

  test('missing or unreadable time says nothing rather than guess', () => {
    expect(fmtReset(undefined, now)).toBeNull()
    expect(fmtReset('', now)).toBeNull()
    expect(fmtReset('not a date', now)).toBeNull()
  })
})

describe('base', () => {
  test('takes the last part of POSIX and Windows paths alike', () => {
    expect(base('/home/me/work/app')).toBe('app')
    expect(base('C:\\Users\\Kobay\\OneDrive\\Desktop\\KikitanTranslator')).toBe('KikitanTranslator')
    expect(base('C:\\work\\app\\')).toBe('app')
    expect(base('app')).toBe('app')
  })
})

describe('steady widths', () => {
  test('a pill and the tool counter hold a minimum width, so what follows them never shifts', () => {
    const working = pillSvg('working', '#fff', '#000', 24, true).width
    expect(pillSvg('idle', '#fff', '#000', 24, false, undefined, working).width).toBe(working)
    expect(pillSvg('idle', '#fff', '#000').width).toBeLessThan(working)
    const room = countSvg(999).width
    expect(countSvg(3, { minWidth: room }).width).toBe(room)
    expect(countSvg(3).width).toBeLessThan(room)
  })
})

describe('chipSvg', () => {
  test('a chip is the stats tile look: tinted fill, thin edge, glyph, value then label', () => {
    const c = chipSvg({ color: '#f2c94c', icon: 'bolt', value: '10', label: 'tools' })
    expect(c.height).toBe(CHIP_LINE.height)
    expect(c.svg).toContain('fill="#f2c94c" fill-opacity="0.14" stroke="#f2c94c" stroke-opacity="0.32"')
    expect(c.svg).toContain('>10</text>')
    expect(c.svg).toContain('dx="5">tools</tspan>')
  })

  test('minWidth holds a chip as wide as another state, and nothing on it moves', () => {
    const wide = chipSvg({ color: '#9b8cf7', label: 'working', dots: true, strong: true }).natural
    expect(chipSvg({ color: '#a8a29e', label: 'idle', icon: 'pause', strong: true, minWidth: wide }).width).toBe(wide)
    expect(chipSvg({ color: '#9b8cf7', label: 'working', dots: true }).svg).not.toContain('<animate')
    expect(chipSvg({ color: '#fff', value: '3', label: 'tools' }).svg).not.toContain('<animate')
  })
})

describe('meterSvg', () => {
  test('METER.segs crisp blocks, the first share of them lit, any use at all lighting one', () => {
    const m = meterSvg(11, '#e8825f')
    expect(m.width).toBe(METER.segs * (METER.w + METER.gap) - METER.gap)
    expect(m.svg).toContain('shape-rendering="crispEdges"')
    const lit = (svg: string) => (/<path d="([^"]*)" fill="#e8825f"/.exec(svg)?.[1]?.match(/M/g) ?? []).length
    // 11% of 30 blocks is 3.
    expect(lit(m.svg)).toBe(3)
    expect(lit(meterSvg(1, '#e8825f').svg)).toBe(1)
    expect(lit(meterSvg(0, '#e8825f').svg)).toBe(0)
    expect(lit(meterSvg(null, '#e8825f').svg)).toBe(0)
    expect(meterSvg(90, '#e8825f').svg).not.toContain('<animate')
  })
})

describe('contextSvg', () => {
  test('one line: figure, meter, then the name and what is left; the figure in ink', () => {
    const c = contextSvg(11, '#e8825f', { left: '889k left', window: '1M window' })
    expect(c.height).toBe(CONTEXT.height)
    expect(c.svg).toContain(`font-size="${CONTEXT.fs}" font-weight="700" fill="#f1ece8">11%</text>`)
    expect(c.svg).toContain('>context</tspan>')
    expect(c.svg).toContain('> · 889k left</tspan>')
    expect(c.svg).toContain('> · 1M window</tspan>')
    expect(c.svg).toContain('shape-rendering="crispEdges"')
  })

  test('stacked: the meter under the figure, in a taller, narrower picture', () => {
    const line = contextSvg(11, '#e8825f', { left: '889k left', window: '1M window' })
    const stack = contextSvg(11, '#e8825f', { left: '889k left', window: '1M window', stack: true })
    expect(stack.height).toBeGreaterThan(line.height)
    expect(stack.natural).toBeLessThan(line.natural)
  })

  test('unknown usage draws a dash and an empty meter; near the limit the figure takes the colour', () => {
    expect(contextSvg(null, '#e8825f').svg).toContain('>—</text>')
    expect(contextSvg(90, '#f2736b', { warn: true }).svg).toContain('fill="#f2736b">90%</text>')
  })
})

describe('chipSvg quiet', () => {
  test('outlined in the line colour, no tint, muted glyph and words', () => {
    const c = chipSvg({ color: '#f2c94c', icon: 'bolt', value: '10', label: 'tools', quiet: true })
    expect(c.svg).toContain('fill-opacity="0" stroke="#3a3634" stroke-opacity="1"')
    expect(c.svg).toContain('stroke="#8f8782"')
    expect(chipSvg({ color: '#a8a29e', label: 'idle', icon: 'pause', strong: true, quiet: true }).svg).toContain('font-weight="700" fill="#a39b96"')
  })

})

describe('statSvg plain', () => {
  test('the icon alone, centred in the glyph slot, no tile', () => {
    const svg = statSvg('$1', 'cost', { icon: 'coin', plain: true, color: '#8f8782' }).svg
    expect(svg).not.toContain('rx="7"')
    const across = (STAT.glyph - STAT.plainIcon) / 2
    const down = (STAT.height - STAT.glyph) / 2 + across
    expect(svg).toContain(`translate(${across} ${down}) scale(${+(STAT.plainIcon / 24).toFixed(4)})`)
  })
})

describe('statSvg icon', () => {
  test('the icon sits in the middle of its tile, across and down', () => {
    const svg = statSvg('$1', 'cost', { icon: 'coin' }).svg
    const across = (STAT.glyph - STAT.icon) / 2
    const down = (STAT.height - STAT.glyph) / 2 + across
    expect(svg).toContain(`translate(${across} ${down}) scale(${+(STAT.icon / 24).toFixed(4)})`)
  })
})

describe('statSvg stacked', () => {
  test('stacked: value and name on top, the rest in smaller lines under it, narrower than one line', () => {
    const line = statSvg('31%', 'context · 693k left', { detail: '1M window' })
    const stacked = statSvg('31%', 'context', { stack: ['693k left', '1M window'] })
    expect(stacked.natural).toBeLessThan(line.natural)
    expect(stacked.height).toBeGreaterThan(STAT.height)
    expect(stacked.svg).toContain(`font-size="${STAT.subFs}" fill="#8f8782">693k left</text>`)
    expect(stacked.svg).toContain('>1M window</text>')
    expect(stacked.svg).not.toContain(' · 1M window')
  })

  test('cells with as many lines under them are one height, so a line of them keeps one baseline', () => {
    const a = statSvg('31%', 'context', { stack: ['693k left', '1M window'] })
    const b = statSvg('57', 'tok/s', { stack: ['peak 1523', ''] })
    expect(a.height).toBe(b.height)
  })
})

// The band's motion (MOTION): loops that keep their picture, figures that glide.
describe('motion', () => {
  /** A picture with its SMIL taken out: what a surface that plays none shows, and a loop's first frame. */
  const still = (svg: string) =>
    svg
      .replace(/<animate(Transform)? [^>]*\/>/g, '')
      .replace(/<(circle)( [^>]*)><\/circle>/g, '<$1$2/>')

  test('the bar lights glide only while live with motion, from where the still bar has them', () => {
    const moving = loadingSvg(900, 12, '#9b8cf7', { live: true, open: true, motion: true })
    expect(moving).toContain(`<animateTransform attributeName="transform" type="translate" from="0 0" to="${MOTION.barPeriod} 0"`)
    expect(moving).toContain('repeatCount="indefinite"')
    // Over the lit dots and cut to them alone: the track keeps one colour to its end, so the
    // cap after the slot still matches it while a light passes.
    expect(moving.indexOf('url(#bar-glow)')).toBeGreaterThan(moving.indexOf('fill-opacity="0.95"'))
    expect(moving).toMatch(/<clipPath id="bar-cut"><path d="M8 [^"]+z"\/><\/clipPath>/)
    expect(moving).not.toContain('<clipPath id="bar-cut"><path d="M6 0H900')
    expect(loadingSvg(900, 12, '#9b8cf7', { live: false, open: true, motion: true })).not.toContain('<animate')
    expect(loadingSvg(900, 12, '#9b8cf7', { live: true, open: true })).not.toContain('<animate')
  })

  test('a loop holds no time: drawn again, it is the same picture', () => {
    const draw = () =>
      loadingSvg(900, 12, '#9b8cf7', { live: true, open: true, motion: true }) +
      chipSvg({ color: '#9b8cf7', label: 'working', dots: true, motion: true }).svg +
      dotSvg('#9b8cf7', true, 14, true)
    expect(draw()).toBe(draw())
  })

  test('the working dots wave from their still look and come back to it', () => {
    const moving = chipSvg({ color: '#9b8cf7', label: 'working', dots: true, strong: true, motion: true }).svg
    const plain = chipSvg({ color: '#9b8cf7', label: 'working', dots: true, strong: true }).svg
    expect(still(moving)).toBe(plain)
    const waves = [...moving.matchAll(/opacity="([\d.]+)"><animate attributeName="opacity" values="([^"]+)"/g)]
    expect(waves.length).toBe(3)
    for (const [, at, values] of waves) {
      const v = values!.split(';')
      expect(v[0]).toBe(at)
      expect(v[v.length - 1]).toBe(at)
    }
    // The brightest dot steps left to right: last, then first, then middle.
    expect(waves.map(w => w[2]!.split(';')[1])).toEqual(['1.00', '0.30', '0.65'])
  })

  test('the status dot breathes from its still halo, only with motion', () => {
    const moving = dotSvg('#9b8cf7', true, 14, true)
    expect(still(moving)).toBe(dotSvg('#9b8cf7', true, 14))
    expect(moving).toContain('values="0.4;0.1;0.4"')
    expect(moving).toContain('values="5.8;6.25;5.8"')
    expect(dotSvg('#9b8cf7', false, 14, true)).not.toContain('<animate')
  })

  test('easeOut runs 0 to 1, fast first, and holds past the ends', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(0.5)).toBeGreaterThan(0.5)
    expect(easeOut(-1)).toBe(0)
    expect(easeOut(2)).toBe(1)
  })

  test('a figure seen first shows as it is; a new value glides there and lands exactly', () => {
    const g = glider(400)
    expect(g.value('n', 10, 0)).toBe(10)
    expect(g.active(0)).toBe(false)
    expect(g.value('n', 110, 1000)).toBe(10)
    expect(g.active(1000)).toBe(true)
    const mid = g.value('n', 110, 1200)!
    expect(mid).toBeGreaterThan(60) // eased: past halfway at half the time
    expect(mid).toBeLessThan(110)
    expect(Number.isInteger(mid)).toBe(true)
    expect(g.value('n', 110, 1400)).toBe(110)
    expect(g.active(1400)).toBe(false)
    expect(g.value('n', 110, 9999)).toBe(110)
  })

  test('a new target mid-glide carries on from where the figure is, never back', () => {
    const g = glider(400)
    g.value('n', 0, 0)
    g.value('n', 100, 1000)
    const at = g.value('n', 100, 1200)!
    expect(g.value('n', 200, 1200)).toBe(at)
    expect(g.value('n', 200, 1300)!).toBeGreaterThan(at)
    expect(g.value('n', 200, 1600)).toBe(200)
  })

  test('round shapes a moving figure only; none, a value passes as it is', () => {
    const g = glider(400)
    g.value('usd', 1, 0, n => n)
    g.value('usd', 2, 1000, n => n)
    const mid = g.value('usd', 2, 1100, n => n)!
    expect(Number.isInteger(mid)).toBe(false)
    expect(g.value('usd', 2.37, 5000, n => n)).toBe(2) // the change starts where it stood
    expect(g.value('usd', 2.37, 5400, n => n)).toBe(2.37) // and lands on the value itself
    expect(g.value('gone', null, 0)).toBe(null)
    g.value('k', 5, 0)
    expect(g.value('k', null, 10)).toBe(null)
    expect(g.value('k', 9, 20)).toBe(9) // after a gap, seen first again
  })
})

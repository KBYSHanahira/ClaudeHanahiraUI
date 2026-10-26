import { describe, expect, test } from 'claude-code/testing'

import { CARD_BREATHE_MS, base, clockOdometer, KIND_ICON, fmtReset, badgeSvg, cardSvg, chipSvg, CHIP_LINE, statSvg, STAT, liveSpeed, speedScale, speedoSvg, phaseBegin, countSvg, dotSvg, countChanges, describe as describeCall, diffRows, fmtClock, fmtCost, fmtDuration,
  fmtElapsed, fmtTokens, fmtSpeed, tokensPerSec, parseTests, pillSvg, loadingSvg, statusPill, countUp, ENTER_MS, finishClock, BREATH_S, meterSvg, METER, contextSvg, CONTEXT, barCapSvg, fileChange, taskKind, taskPill, taskSummary, PILL, MOTION } from './chat'

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

describe('finish motion', () => {
  test('an entering pill pops and traces its icon; past ENTER_MS, or never entered, it is still', () => {
    const enter = pillSvg('done', '#a9e6b4', '#2d4232', 24, false, 'check', 0, 0, { enter: 100 })
    expect(enter.svg).toContain('type="scale"')
    expect(enter.svg).toContain('attributeName="stroke-dashoffset"')
    expect(enter.svg).toContain('begin="-0.100s"') // carried on from where a redraw finds it
    for (const still of [pillSvg('done', '#fff', '#000', 24, false, 'check', 0, 0, { enter: ENTER_MS }), pillSvg('done', '#fff', '#000', 24, false, 'check')])
      expect(still.svg).not.toContain('<animate')
  })

  test('an alive done/error pill keeps breathing after its finish, and only then', () => {
    for (const icon of ['check', 'cross'] as const) {
      const settled = pillSvg('done', '#fff', '#000', 24, false, icon, 0, 0, { alive: true })
      expect(settled.svg).toContain(`dur="${BREATH_S}s" begin="0.000s" repeatCount="indefinite"`)
      expect(settled.svg).toContain('values="1;0.5;1"') // starts and rests at full: a remount does not jump
      expect(settled.svg).not.toContain('type="scale"')
    }
    // Entering, the breath waits for the pop and the trace to finish.
    const entering = pillSvg('done', '#fff', '#000', 24, false, 'check', 0, 0, { enter: 300, alive: true })
    expect(entering.svg).toContain('type="scale"')
    expect(entering.svg).toContain(`begin="${((ENTER_MS - 300) / 1000).toFixed(3)}s" repeatCount="indefinite"`)
    // A tag that repeats an attribute is not XML: the surface shows a broken image instead.
    for (const svg of [pillSvg('done', '#fff', '#000', 24, false, 'check', 0, 0, { alive: true }).svg, entering.svg]) {
      for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
        const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map(m => m[1])
        expect(names.length).toBe(new Set(names).size)
      }
    }
    // Not alive, interrupted, or no icon: still.
    for (const still of [
      pillSvg('done', '#fff', '#000', 24, false, 'check'),
      pillSvg('interrupted', '#fff', '#000', 24, false, 'ban', 0, 0, { alive: true }),
      pillSvg('3 added', '#fff', '#000', 24, false, undefined, 0, 0, { alive: true }),
    ])
      expect(still.svg).not.toContain('<animate')
  })

  test('entering does not change the pill\'s size', () => {
    const a = pillSvg('12 added', '#fff', '#000', 24, false, undefined, 0, 0, { enter: 0, count: { n: 12, word: 'added' } })
    const b = pillSvg('12 added', '#fff', '#000')
    expect([a.width, a.height]).toEqual([b.width, b.height])
  })

  test('a count rises from 0 to n, eased, and rests on n', () => {
    const out = countUp(12, v => `<t>${v}</t>`, 0.5, '0s')
    const seen = [...out.matchAll(/<t>(\d+)<\/t>/g)].map(m => Number(m[1]))
    expect(seen[0]).toBe(0)
    expect(seen[seen.length - 1]).toBe(12)
    expect(seen).toEqual([...seen].sort((x, y) => x - y))
    // Only the last frame rests visible: a surface without SMIL shows the true count.
    expect(out.match(/<g opacity="0">/g)?.length).toBe(seen.length - 1)
  })

  test('a count of one has nothing to rise through', () => {
    expect(countUp(1, v => `<t>${v}</t>`, 0.5, '0s')).toContain('<t>')
    expect(countUp(0, v => `<t>${v}</t>`, 0.5, '0s')).toBe('<t>0</t>')
  })

  test('a tile that just finished ripples once; a running or settled one does not', () => {
    expect(badgeSvg('#7cb7ff', 'file', 32, false, 0, 50)).toContain('type="scale"')
    expect(badgeSvg('#7cb7ff', 'file', 32, false, 0, ENTER_MS)).not.toContain('type="scale"')
    expect(badgeSvg('#7cb7ff', 'file', 32, true, 0, 50)).not.toContain('type="scale"')
  })

  test('the ripple stays inside the picture: the tile leaves it room to grow', () => {
    const svg = badgeSvg('#7cb7ff', 'file', 32, false, 0, 50)
    const to = Number(/type="scale" from="[\d.]+" to="([\d.]+)"/.exec(svg)?.[1])
    expect((12.5 + 0.8) * to).toBeLessThanOrEqual(16) // half the tile and half its stroke, both scaled
  })

  test('a finishing pill turns from the running colours: no pop, the dots gather, the word fades up', () => {
    const m = pillSvg('done', PILL.ok.fg, PILL.ok.bg, 22, false, 'check', 0, 0, { enter: 0, morph: PILL.busy })
    expect(m.svg).toContain(`attributeName="fill" from="${PILL.busy.bg}" to="${PILL.ok.bg}"`)
    expect(m.svg).toContain('attributeName="cx"')
    expect(m.svg).toContain('values="1;1.06;1"')
    expect(m.svg).not.toContain('values="0.78;1.03;1"')
    expect(m.svg).toContain('attributeName="stroke-dashoffset"') // the check still writes itself
    // Settled, the same pill is still: the morph is a one-shot.
    expect(pillSvg('done', PILL.ok.fg, PILL.ok.bg, 22, false, 'check', 0, 0, { enter: ENTER_MS, morph: PILL.busy }).svg).not.toContain('<animate')
  })

  test('only a failure shakes, once, inside the capsule, after the morph', () => {
    const bad = pillSvg('error', PILL.bad.fg, PILL.bad.bg, 22, false, 'cross', 0, 0, { enter: 0, morph: PILL.busy }).svg
    expect(bad).toContain(`type="translate" values="0 0;-1.6 0`)
    expect(bad).toContain(`begin="${MOTION.morphS.toFixed(3)}s"`)
    expect(pillSvg('done', '#fff', '#000', 22, false, 'check', 0, 0, { enter: 0, morph: PILL.busy }).svg).not.toContain('type="translate" values')
    expect(pillSvg('error', '#fff', '#000', 22, false, 'cross', 0, 0, { enter: 0 }).svg).not.toContain('type="translate" values')
  })

  test('a count with a prefix rises as +n and rests on its text', () => {
    const p = pillSvg('+12', '#fff', '#000', 22, false, undefined, 0, 0, { enter: 0, count: { n: 12, word: '', prefix: '+' } }).svg
    expect(p).toContain('>+0</text>')
    expect(p).toContain('>+12</text>')
    expect(p).not.toContain('+12 <')
  })

  test('every picture is well-formed: no tag repeats an attribute', () => {
    const all = [
      pillSvg('error', '#fff', '#000', 22, false, 'cross', 0, 0, { enter: 100, morph: PILL.busy, alive: true }).svg,
      pillSvg('done', '#fff', '#000', 22, false, 'check', 0, 0, { enter: 100, morph: PILL.busy, alive: true }).svg,
      badgeSvg('#fff', 'file', 32, false, 0, 100),
      badgeSvg('#fff', 'file', 32, true),
    ]
    for (const svg of all)
      for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
        const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map(m => m[1])
        expect(names.length).toBe(new Set(names).size)
      }
  })
})

describe('finishClock', () => {
  const none = () => undefined

  test('a row drawn finished before its end time is noted still plays, from that draw', () => {
    const f = finishClock()
    expect(f.ago(['a'], true, 1000, none)).toBeUndefined()
    expect(f.ago(['a'], false, 2000, none)).toBe(0)
    expect(f.ago(['a'], false, 2300, none)).toBe(300)
    // The end time arrives later: the earlier origin still wins, so the motion does not jump.
    expect(f.ago(['a'], false, 2400, () => 2100)).toBe(400)
  })

  test('history (never drawn running, no end time) stays still', () => {
    expect(finishClock().ago(['h'], false, 5000, none)).toBeUndefined()
  })

  test('an end time alone is enough, and the motion stops after ENTER_MS', () => {
    const f = finishClock()
    expect(f.ago(['b'], false, 1100, () => 1000)).toBe(100)
    expect(f.ago(['b'], false, 1000 + ENTER_MS, () => 1000)).toBeUndefined()
  })

  test('a group plays from its last call to finish', () => {
    const f = finishClock()
    expect(f.ago(['x', 'y'], false, 3000, id => (id === 'x' ? 2000 : 2900))).toBe(100)
  })
})

describe('running pill animation', () => {
  test('a running capsule waves its dots and keeps the capsule still; a settled one stays still', () => {
    const run = pillSvg('running', '#c4baff', '#2d3a3f', 24, true)
    expect(run.svg).toContain('<animate ')
    expect(run.svg).toContain('repeatCount="indefinite"')
    expect(run.svg).not.toContain('attributeName="fill-opacity"')
    expect(pillSvg('done', '#fff', '#000', 24, false).svg).not.toContain('animate')
  })

  test('the spinner makes room: a running capsule is wider', () => {
    expect(pillSvg('running', '#fff', '#000', 24, true).width).toBeGreaterThan(pillSvg('running', '#fff', '#000', 24, false).width)
  })
})



describe('loadingSvg', () => {
  test('idle is a quiet track: no animation, no mask', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7')
    expect(svg).toContain('width="500" height="18"')
    expect(svg).not.toContain('<animate')
    expect(svg).not.toContain('<mask')
  })

  test('live sweeps a soft glow across the track', () => {
    const svg = loadingSvg(500, 18, '#9b8cf7', { live: true })
    expect(svg).toContain('<mask id="l500_18m"')
    expect(svg).toContain('<animate attributeName="x" from="-200" to="500"')
    expect(svg).toContain('repeatCount="indefinite"')
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
  })
})

describe('more motion', () => {
  test('a running tile runs a light round its edge; a settled one is still', () => {
    expect(badgeSvg('#ffd166', '>_', 32, true)).toContain('attributeName="stroke-dashoffset" from="0" to="-100"')
    expect(badgeSvg('#ffd166', '>_', 32, true)).not.toContain('type="scale"')
    expect(badgeSvg('#ffd166', '>_', 32, false)).not.toContain('<animate')
  })

  test('the status dot ripples only while live', () => {
    expect(dotSvg('#9b8cf7', true)).toContain('repeatCount="indefinite"')
    expect(dotSvg('#9b8cf7', false)).not.toContain('<animate')
  })

  test('a changed card rolls the old value out and the new one in, and flashes its own colour', () => {
    const moved = cardSvg('Cost', '≈$15.62', { changed: true, from: '≈$15.40', iconColor: '#f2c94c' }).svg
    expect(moved).toContain('≈$15.40')
    expect(moved).toContain('from="0 0" to="0 -22"') // the old value leaves upward
    expect(moved).toContain('from="0 22" to="0 0"') // the new one arrives from below
    expect(moved).toContain('attributeName="stroke" from="#f2c94c"')
    expect(cardSvg('Cost', '≈$15.62').svg).not.toContain('<animate')
  })

  test('the frame, icon and label never fade when a value changes', () => {
    const moved = cardSvg('Cost', '$2', { changed: true, from: '$1', icon: 'coin' }).svg
    const opacityAnims = moved.match(/attributeName="opacity"/g) ?? []
    expect(opacityAnims.length).toBe(2) // only the two value lines
    expect(moved).toMatch(/<g clip-path="url\(#cvCost\)">/)
  })

  test('the clock is a self-running odometer: same markup every second of a turn', () => {
    const a = cardSvg('Time', '1:06', { icon: 'stopwatch', clock: { elapsedMs: 66_000 } })
    expect(a.svg).toContain('repeatCount="indefinite"')
    expect(a.svg).toContain('dur="10s"') // seconds
    expect(a.svg).toContain('dur="60s"') // tens of seconds
    expect(a.svg).toContain('dur="600s"') // minutes
    // The redraws reuse the art drawn at the start, so nothing in it depends on the moment.
    expect(cardSvg('Time', '1:06', { icon: 'stopwatch', clock: { elapsedMs: 66_000 } }).svg).toBe(a.svg)
  })

  test('the odometer stands at the right numerals without SMIL', () => {
    const { markup } = clockOdometer(66_000, 0, 40, 17, 22)
    // 1:06 → minutes at 1 (strip index 2), tens at 0 (index 1), seconds at 6 (index 7).
    expect(markup).toContain('translate(0 -44)')
    expect(markup).toContain('translate(0 -22)')
    expect(markup).toContain('translate(0 -154)')
    expect(markup).toContain('begin="-6.000s"')
    expect(markup).toContain('begin="-66.000s"')
  })

  test('a live card breathes, with no sweep; an idle one stays still', () => {
    const live = cardSvg('Cost', '$1', { icon: 'coin', live: { now: 1_000 } }).svg
    expect(live).toContain('attributeName="fill-opacity" values="0.14;0.3;0.14"')
    expect(live).toContain(`begin="${phaseBegin(1_000, CARD_BREATHE_MS)}"`)
    expect(live).not.toContain('attributeName="x"')
    expect(cardSvg('Cost', '$1', { icon: 'coin' }).svg).not.toContain('<animate')
  })

  test('phaseBegin wraps and never goes positive', () => {
    expect(phaseBegin(0, 3600)).toBe('0.000s')
    expect(phaseBegin(3700, 3600)).toBe('-0.100s')
    expect(phaseBegin(-100, 3600)).toBe('-3.500s')
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

  test('the speedometer sweeps its needle from where it was drawn', () => {
    expect(speedoSvg(0.5, '#9b8cf7', 22)).toContain('rotate(0.0 22 22)')
    expect(speedoSvg(0.5, '#9b8cf7', 22)).not.toContain('<animate')
    const moving = speedoSvg(1, '#9b8cf7', 22, { from: 0 })
    expect(moving).toContain('from="-135.0 22 22" to="135.0 22 22"')
    expect(moving).toContain('attributeName="stroke-dasharray"')
    expect(speedoSvg(3, '#fff', 22)).toContain('rotate(135.0 22 22)')
  })

  test('a stat takes a ring in the glyph slot, and rolls a changed value', () => {
    const ring = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"></svg>'
    expect(statSvg('9%', '5-hour limit', { ring }).svg).toContain(`<g transform="translate(0 ${(STAT.height - STAT.glyph) / 2})">${ring}</g>`)
    expect(statSvg('$2', 'cost', { changed: true, from: '$1' }).svg).toContain('<animateTransform')
    expect(statSvg('$2', 'cost').svg).not.toContain('<animate')
  })
})

describe('icons', () => {
  test('every tool kind has a drawn icon, and the tile centres it', () => {
    for (const icon of Object.values(KIND_ICON)) {
      const svg = badgeSvg('#ffd166', icon, 32)
      expect(svg).toContain('translate(8 8) scale(0.6667)') // 16px mark, top-left at 8, 8: dead centre in 32
      expect(svg).not.toContain('<text')
    }
  })

  test('an unknown name still falls back to a typed glyph', () => {
    expect(badgeSvg('#fff', '?', 30)).toContain('<text')
  })

  test('a pill icon makes room and sits on the left', () => {
    const plain = pillSvg('done', '#fff', '#000', 24)
    const withIcon = pillSvg('done', '#fff', '#000', 24, false, 'check')
    expect(withIcon.width).toBeGreaterThan(plain.width)
    expect(withIcon.svg).toContain('<g transform="translate(10.08')
  })

  test('a card with an icon puts it in a tile and sets the text beside it', () => {
    const svg = cardSvg('Cost', '$1', { icon: 'coin' }).svg
    expect(svg).toContain('<rect x="8" y="8" width="36" height="36" rx="10"')
    expect(svg).toContain('translate(15 15) scale(0.9167)') // 22px icon, centred in the tile
    expect(svg).toContain('x="54" y="21"')
    expect(cardSvg('Cost', '$1').svg).toContain('x="14" y="21"')
  })

  test('the card carries the halftone texture in its own colour', () => {
    const svg = cardSvg('Cost', '$1', { icon: 'coin', iconColor: '#f2c94c' }).svg
    expect(svg).toMatch(/<path d="M[^"]*h2v2h-2z[^"]*" fill="#f2c94c" fill-opacity="0.22"\/>/)
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

  test('flashes and rolls the old number out only when the count grew', () => {
    const grew = countSvg(5, { changed: true, from: 4 }).svg
    expect(grew).toContain('attributeName="fill"')
    expect(grew).toContain('>4</text>')
    expect(grew).toContain('from="0 0" to="0 -14"')
    expect(grew).toContain('from="0 14" to="0 0"')
    expect(countSvg(5).svg).not.toContain('<animate')
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

describe('redraws carry motion on', () => {
  test('loops start at the phase the clock has reached, so a new picture continues the old', () => {
    expect(loadingSvg(400, 18, '#9b8cf7', { live: true, now: 2_500 })).toContain(`begin="${phaseBegin(2_500, 1900)}"`)
    expect(dotSvg('#9b8cf7', true, 14, 700)).toContain(`begin="${phaseBegin(700, 1400)}"`)
    expect(badgeSvg('#9b8cf7', 'search', 30, true, 300)).toContain(`begin="${phaseBegin(300, 1100)}"`)
    expect(pillSvg('working', '#fff', '#000', 24, true, undefined, 1_000).svg).toContain(`begin="${phaseBegin(1_000 - 180, 1200)}"`)
  })

  test('one-shots resume from the time since they began, never from the start', () => {
    expect(cardSvg('Cost', '$2', { changed: true, from: '$1', ago: 300 }).svg).toContain('begin="-0.300s"')
    expect(countSvg(5, { changed: true, from: 4, ago: 250 }).svg).toContain('begin="-0.250s"')
  })
})

describe('cards hold their width', () => {
  test('a card is as wide while it rolls as once it settles', () => {
    const rolling = cardSvg('Model', 'Opus 5.5', { changed: true, from: 'Sonnet 5.5', icon: 'bot' })
    const still = cardSvg('Model', 'Opus 5.5', { icon: 'bot' })
    expect(rolling.width).toBe(still.width)
  })

  test('the Time card is as wide ticking as it is still', () => {
    const ticking = cardSvg('Time', '12:39', { icon: 'stopwatch', clock: { elapsedMs: 759_000 } })
    const still = cardSvg('Time', '12:39', { icon: 'stopwatch' })
    expect(ticking.width).toBe(still.width)
  })

  test('the odometer lays out the second it shows: no leading 0 just before 10:00', () => {
    const { markup } = clockOdometer(599_600, 0, 40, 17, 22)
    expect(markup.match(/<g transform=/g)?.length).toBe(3) // 9:59 — three digits, not 09:59
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
    expect(pillSvg('idle', '#fff', '#000', 24, false, undefined, 0, working).width).toBe(working)
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

  test('minWidth holds a chip as wide as another state, and a changed value rolls', () => {
    const wide = chipSvg({ color: '#9b8cf7', label: 'working', dots: true, strong: true }).natural
    expect(chipSvg({ color: '#a8a29e', label: 'idle', icon: 'pause', strong: true, minWidth: wide }).width).toBe(wide)
    expect(chipSvg({ color: '#fff', value: '3', label: 'tools', changed: true, from: '2' }).svg).toContain('animateTransform')
    expect(chipSvg({ color: '#fff', value: '3', label: 'tools' }).svg).not.toContain('<animate')
  })
})

describe('meterSvg', () => {
  test('METER.segs crisp blocks, the first share of them lit, any use at all lighting one', () => {
    const m = meterSvg(11, '#e8825f')
    expect(m.width).toBe(METER.segs * (METER.w + METER.gap) - METER.gap)
    expect(m.svg).toContain('shape-rendering="crispEdges"')
    // 11% of 30 blocks is 3: the lit window ends at the third block's right edge.
    expect(m.svg).toContain(`<rect x="0" y="0" width="${3 * (METER.w + METER.gap) - METER.gap}"`)
    expect(meterSvg(1, '#fff').svg).toContain(`width="${METER.w}" height="${METER.h}"></rect>`)
    expect(meterSvg(0, '#fff').svg).not.toContain('clip-path="url(#meterlit)"')
    expect(meterSvg(null, '#fff').svg).not.toContain('clip-path="url(#meterlit)"')
  })

  test('the lit edge moves from where it was; still otherwise; breathes near the limit', () => {
    expect(meterSvg(40, '#fff', { from: 20 }).svg).toContain('<animate attributeName="width" from="46" to="94"')
    expect(meterSvg(40, '#fff').svg).not.toContain('<animate')
    expect(meterSvg(90, '#f2736b', { pulse: true, now: 500 }).svg).toContain('attributeName="fill-opacity" values="1;0.55;1"')
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
    expect(contextSvg(90, '#f2736b', { pulse: true }).svg).toContain('fill="#f2736b">90%</text>')
  })
})

describe('chipSvg quiet', () => {
  test('outlined in the line colour, no tint, muted glyph and words', () => {
    const c = chipSvg({ color: '#f2c94c', icon: 'bolt', value: '10', label: 'tools', quiet: true })
    expect(c.svg).toContain('fill-opacity="0" stroke="#3a3634" stroke-opacity="1"')
    expect(c.svg).toContain('stroke="#8f8782"')
    expect(chipSvg({ color: '#a8a29e', label: 'idle', icon: 'pause', strong: true, quiet: true }).svg).toContain('font-weight="700" fill="#a39b96"')
  })

  test('a growing count still flashes the tint once, back to none', () => {
    expect(chipSvg({ color: '#f2c94c', value: '3', label: 'tools', quiet: true, changed: true, from: '2' }).svg).toContain('from="0.4" to="0"')
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

import { describe, expect, test } from 'claude-code/testing'

import { addUsage, dangerous, asList, asSkill, hanahiraPart, modeFrom, modeSwitch, skillCommand, clip, glyph, limitLabel, shortLimitLabel, contextLeft, limitLeft, meter, ringSvg, tone, top } from './register'


describe('guard pattern', () => {
  test('matches the dangerous commands', () => {
    expect(dangerous('docker compose down -v')).toBe(true)
    expect(dangerous('sudo ufw  enable')).toBe(true)
  })

  test('lets normal commands through', () => {
    expect(dangerous('docker compose up -d --build')).toBe(false)
    expect(dangerous('docker compose ps')).toBe(false)
    expect(dangerous('sudo ufw allow 9020/tcp')).toBe(false)
  })

  test('catches the other spellings of removing volumes', () => {
    expect(dangerous('docker-compose down -v')).toBe(true)
    expect(dangerous('docker compose down --volumes')).toBe(true)
    expect(dangerous('docker compose -f prod.yml down --rmi all -v')).toBe(true)
    expect(dangerous('sudo ufw --force enable')).toBe(true)
  })

  test('a flag that only contains v, or a later command, is not a volume removal', () => {
    expect(dangerous('docker compose down --verbose')).toBe(false)
    expect(dangerous('docker compose down && git log -v')).toBe(false)
    expect(dangerous('docker compose down; ls -v')).toBe(false)
  })

  test('a line continuation, a redirection or quotes around the flag do not hide it', () => {
    expect(dangerous('docker compose down \\\n  -v')).toBe(true)
    expect(dangerous('docker compose \\\n down --volumes')).toBe(true)
    expect(dangerous('docker compose down 2>&1 -v')).toBe(true)
    expect(dangerous('docker compose down "-v"')).toBe(true)
    expect(dangerous("docker compose down '-v'")).toBe(true)
    expect(dangerous('docker compose down \\-v')).toBe(true)
    expect(dangerous('docker compose down --volumes=true')).toBe(true)
    expect(dangerous('ufw \\\n enable')).toBe(true)
    expect(dangerous('ufw "enable"')).toBe(true)
    expect(dangerous('sudo ufw --force=yes enable')).toBe(true)
    expect(dangerous('/usr/sbin/ufw enable')).toBe(true)
  })

  test('a command run by a shell, ssh or a substitution is still caught', () => {
    expect(dangerous("bash -c 'docker compose down -v'")).toBe(true)
    expect(dangerous('ssh prod "sudo ufw enable"')).toBe(true)
    expect(dangerous('echo "$(docker compose down -v)"')).toBe(true)
    expect(dangerous('echo $(ufw enable)')).toBe(true)
  })

  test('the words inside a quoted argument are not a command', () => {
    expect(dangerous('echo "ufw enable"')).toBe(false)
    expect(dangerous('git commit -m "docs: never ufw enable"')).toBe(false)
    expect(dangerous('grep "docker compose down -v" README.md')).toBe(false)
    expect(dangerous('docker compose down --volumes=false')).toBe(false)
    expect(dangerous('docker compose -p a-down down --env-file .env-v')).toBe(false)
  })
})

describe('stats helpers', () => {
  test('top sorts by count then name and limits', () => {
    expect(top({ Read: 2, Bash: 5, Edit: 2, Grep: 1 }, 3)).toEqual([
      ['Bash', 5],
      ['Edit', 2],
      ['Read', 2],
    ])
  })

  test('clip shortens with an ellipsis', () => {
    expect(clip('abcdef', 4)).toBe('abc…')
    expect(clip('abc', 4)).toBe('abc')
  })

  test('clip cuts between whole characters and never runs past n', () => {
    expect(clip('🚀'.repeat(20), 4)).toBe('🚀🚀🚀…')
    expect(clip('👩‍💻'.repeat(5), 3)).toBe('👩‍💻👩‍💻…')
    expect(clip('ที่นี่ที่นี่', 3)).toBe('ที่นี่…')
    expect(clip('🚀🚀', 2)).toBe('🚀🚀')
    expect(clip('abcdef', 0)).toBe('')
  })
})

describe('usage helpers', () => {

  test('meter fills and clamps', () => {
    expect(meter(50, 10)).toEqual({ filled: '▰'.repeat(5), rest: '▱'.repeat(5) })
    expect(meter(150, 4).rest).toBe('')
    expect(meter(-5, 4).filled).toBe('')
  })

  test('tone turns amber then red', () => {
    expect(tone(10)).toBe('#7bd88f')
    expect(tone(60)).toBe('#f2c94c')
    expect(tone(85)).toBe('#f2736b')
  })
})

describe('rings', () => {
  test('ringSvg draws a track and a proportional arc', () => {
    const svg = ringSvg(25, '#e8825f', 40)
    expect(svg).toContain('width="40"')
    expect(svg).toContain('stroke="#e8825f"')
    const c = 2 * Math.PI * 19.5
    expect(svg).toContain(`stroke-dasharray="${(c / 4).toFixed(2)} ${c.toFixed(2)}"`)
  })

  test('ringSvg omits the arc at zero and clamps over 100', () => {
    expect(ringSvg(0, '#fff', 40)).not.toContain('stroke-dasharray')
    const c = 2 * Math.PI * 19.5
    expect(ringSvg(250, '#fff', 40)).toContain(`stroke-dasharray="${c.toFixed(2)} ${c.toFixed(2)}"`)
  })

  test('glyph steps through quarters', () => {
    expect([0, 25, 50, 75, 100].map(glyph)).toEqual(['○', '◔', '◑', '◕', '●'])
    expect(glyph(NaN)).toBe('○')
  })

  test('limitLabel names the windows', () => {
    expect(limitLabel('five_hour')).toBe('5-hour limit')
    expect(limitLabel('seven_day')).toBe('7-day limit')
    expect(limitLabel('other')).toBe('other')
    expect(shortLimitLabel('five_hour')).toBe('5h limit')
    expect(shortLimitLabel('seven_day')).toBe('7d limit')
    expect(shortLimitLabel('spend_limit')).toBe('spend limit')
  })

  test('what is left: tokens of the context window, a share of a limit', () => {
    expect(contextLeft(279_000, 1_000_000, 28)).toBe('721k left')
    expect(contextLeft(null, null, 28)).toBe('72% left')
    expect(contextLeft(null, null, null)).toBeNull()
    expect(contextLeft(1_200_000, 1_000_000, 100)).toBe('0 left')
    expect(limitLeft(12)).toBe('88% left')
    expect(limitLeft(20.6)).toBe('79% left')
    expect(limitLeft(130)).toBe('0% left')
    expect(limitLeft(-20)).toBe('100% left')
    expect(limitLeft(NaN)).toBe('—')
    expect(contextLeft(null, null, NaN)).toBeNull()
    expect(contextLeft(null, null, -5)).toBe('100% left')
  })
})


describe('ring', () => {
  test('is a still picture, near the limit too', () => {
    expect(ringSvg(90, '#f2736b', 38)).not.toContain('@keyframes')
  })
})

describe('asList', () => {
  test('passes a real list through', () => {
    const a = [{ id: 'x' }]
    expect(asList(a)).toBe(a as never)
  })

  test('turns anything else a stored value might be into an empty list', () => {
    for (const bad of [undefined, null, 0, 5, 'x', {}, { length: 2 }, true]) expect(asList(bad)).toEqual([])
  })
})

describe('addUsage', () => {
  test('adds a response to the running counts', () => {
    const u = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40 }
    expect(addUsage({ input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }, u)).toEqual({ input: 11, output: 22, cacheRead: 33, cacheWrite: 44 })
  })

  test('a field the response leaves out adds nothing, so the total never turns NaN', () => {
    const t = addUsage({ input: 5, output: 5, cacheRead: 5, cacheWrite: 5 }, { input_tokens: 1, output_tokens: 2 })
    expect(t).toEqual({ input: 6, output: 7, cacheRead: 5, cacheWrite: 5 })
    expect(addUsage({}, { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: null, cache_creation_input_tokens: NaN })).toEqual({ input: 1, output: 1, cacheRead: 0, cacheWrite: 0 })
    expect(addUsage({ input: 3 }, null)).toEqual({ input: 3, output: 0, cacheRead: 0, cacheWrite: 0 })
  })

  test('keeps the other fields of what it adds to', () => {
    expect(addUsage({ id: 'a1', input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, { input_tokens: 2 })).toEqual({ id: 'a1', input: 2, output: 0, cacheRead: 0, cacheWrite: 0 })
  })
})

describe('Hanahira Claude UI mode', () => {
  test('names the part a skill is, under either plugin name', () => {
    expect(hanahiraPart('hanahira-claude-ui:hanahira-claude-ui')).toBe('core')
    expect(hanahiraPart('hanahira-claude-ui-dev:hanahira-claude-ui-design')).toBe('design')
    expect(hanahiraPart('hanahira-claude-ui:hanahira-claude-ui-debug-test')).toBe('debug-test')
    expect(hanahiraPart('hanahira-claude-ui')).toBe('core')
  })

  test('any other skill is no part of it', () => {
    for (const name of ['commit', 'anthropic-skills:pdf', 'hanahira-claude-ui-dev:other', 'my-hanahira-claude-ui']) {
      expect(hanahiraPart(name), name).toBe(null)
    }
  })

  test('reads the switches, the last one winning', () => {
    expect(modeSwitch('/Hanahira Claude UI on')).toBe('on')
    expect(modeSwitch('/hanahira claude ui OFF')).toBe('off')
    expect(modeSwitch('Hanahira Claude UI V20 on, then check this')).toBe('on')
    expect(modeSwitch('turn on Hanahira Claude UI and review the config')).toBe('on')
    expect(modeSwitch('use Hanahira Claude UI')).toBe('on')
    expect(modeSwitch('/Hanahira Claude UI ultra')).toBe('on')
    expect(modeSwitch('/Hanahira Claude UI on /Hanahira Claude UI off')).toBe('off')
    expect(modeSwitch('turn off Hanahira Claude UI, then turn on Hanahira Claude UI')).toBe('on')
  })

  test('reads the Thai switches, and เปิด is no ปิด', () => {
    expect(modeSwitch('เปิด Hanahira Claude UI ให้หน่อย')).toBe('on')
    expect(modeSwitch('เปิดโหมด Hanahira Claude UI')).toBe('on')
    expect(modeSwitch('ปิด Hanahira Claude UI')).toBe('off')
  })

  test('a question, a status, code or a quote switches nothing', () => {
    expect(modeSwitch('is Hanahira Claude UI on?')).toBe(null)
    expect(modeSwitch('/Hanahira Claude UI status')).toBe(null)
    expect(modeSwitch('what can Hanahira Claude UI do')).toBe(null)
    expect(modeSwitch('run `/Hanahira Claude UI off` later')).toBe(null)
    expect(modeSwitch('```\n/Hanahira Claude UI on\n```')).toBe(null)
    expect(modeSwitch('> /Hanahira Claude UI off\nwhat does this do')).toBe(null)
    expect(modeSwitch('Hanahira Claude UI only')).toBe(null)
  })

  test('a typed skill command is the switch: its part, and off only when its argument says so', () => {
    expect(skillCommand('/hanahira-claude-ui:hanahira-claude-ui')).toEqual({ part: 'core', on: true })
    expect(skillCommand('/hanahira-claude-ui-dev:hanahira-claude-ui-design check the band')).toEqual({ part: 'design', on: true })
    expect(skillCommand('/hanahira-claude-ui:hanahira-claude-ui off')).toEqual({ part: 'core', on: false })
    expect(skillCommand('  /hanahira-claude-ui:hanahira-claude-ui ultra')).toEqual({ part: 'core', on: true })
  })

  test('the command as the engine names it, or wraps it in the text, is read too', () => {
    expect(skillCommand('Base directory for this skill: …', { name: 'hanahira-claude-ui:hanahira-claude-ui', args: '' })).toEqual({ part: 'core', on: true })
    expect(skillCommand('', { name: 'hanahira-claude-ui-dev:hanahira-claude-ui-data', args: 'off' })).toEqual({ part: 'data', on: false })
    const wrapped = '<command-message>hanahira-claude-ui:hanahira-claude-ui</command-message>\n<command-name>/hanahira-claude-ui:hanahira-claude-ui</command-name>\n# Hanahira Claude UI'
    expect(skillCommand(wrapped)).toEqual({ part: 'core', on: true })
    expect(skillCommand('<command-name>/hanahira-claude-ui:hanahira-claude-ui</command-name><command-args>off</command-args>')).toEqual({ part: 'core', on: false })
    expect(skillCommand('/hanahira-claude-ui:hanahira-claude-ui', { name: 'commit', args: '' })).toBe(null)
  })

  test('any other text or command is no skill switch', () => {
    for (const text of ['/commit', '/reload-plugins', 'run /hanahira-claude-ui:hanahira-claude-ui later', 'hanahira-claude-ui', '']) {
      expect(skillCommand(text), text).toBe(null)
    }
  })

  test('a stored value of any shape reads as a mode', () => {
    expect(asSkill({ on: true, loaded: ['core', 3, 'design'] })).toEqual({ on: true, loaded: ['core', 'design'] })
    for (const bad of [undefined, null, 0, 'on', [], { on: 'yes', loaded: 'core' }]) {
      expect(asSkill(bad)).toEqual({ on: false, loaded: [] })
    }
  })

  test('the transcript gives the mode back: the last switch decides, a skill load turns it on', () => {
    const user = (text: string) => ({ role: 'user', text, toolUses: [] })
    const skillCall = (skill: string) => ({ role: 'assistant', text: '', toolUses: [{ tool: 'Skill', input: { skill } }] })
    expect(modeFrom([])).toEqual({ on: false, loaded: [] })
    expect(modeFrom([user('<command-name>/hanahira-claude-ui:hanahira-claude-ui</command-name>'), skillCall('hanahira-claude-ui:hanahira-claude-ui-design')]))
      .toEqual({ on: true, loaded: ['core', 'design'] })
    expect(modeFrom([user('/Hanahira Claude UI on'), user('fix this'), user('/Hanahira Claude UI off')])).toEqual({ on: false, loaded: [] })
  })

  test('the skill loaded to say "off" switches nothing back on, until the person writes again', () => {
    const rows = [
      { role: 'user', text: '/Hanahira Claude UI off', toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool: 'Skill', input: { skill: 'hanahira-claude-ui:hanahira-claude-ui' } }] },
    ]
    expect(modeFrom(rows).on).toBe(false)
    expect(modeFrom([...rows, { role: 'user', text: 'thanks', toolUses: [] }, rows[1]!]).on).toBe(true)
  })

  test('a skill text, a reminder or a tool result in a user message is not the person switching', () => {
    const body = 'Base directory for this skill: /x\n**Switch-on**: "use Hanahira Claude UI" / "turn off Hanahira Claude UI"'
    expect(modeFrom([{ role: 'user', text: body }]).on).toBe(false)
    expect(modeFrom([{ role: 'user', text: '<system-reminder>"turn on Hanahira Claude UI"</system-reminder>hi' }]).on).toBe(false)
    expect(modeFrom([{ role: 'user', text: '/Hanahira Claude UI on' }, { role: 'user', text: 'turn off Hanahira Claude UI', toolResults: [{}] }]).on).toBe(true)
  })
})

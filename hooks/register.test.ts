import { describe, expect, test } from 'claude-code/testing'

import { dangerous, asList, clip, glyph, limitLabel, shortLimitLabel, contextLeft, limitLeft, meter, ringSvg, tone, top } from './register'


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
    expect(ringSvg(90, '#f2736b', 38)).not.toContain('<animate')
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

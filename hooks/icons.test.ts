import { describe, expect, test } from 'claude-code/testing'

import { ICONS, hasIcon, iconGroup, iconSvg } from './icons'

describe('icons', () => {
  test('every icon is plain, balanced markup with no text', () => {
    for (const [name, body] of Object.entries(ICONS)) {
      expect(body.includes('<text'), name).toBe(false)
      const opens = (body.match(/<(?:path|circle|rect)\b/g) ?? []).length
      const closes = (body.match(/\/>/g) ?? []).length
      expect(closes, name).toBe(opens)
    }
  })

  test('hasIcon tells names from anything else', () => {
    expect(hasIcon('terminal')).toBe(true)
    expect(hasIcon('>_')).toBe(false)
    expect(hasIcon('toString')).toBe(false)
  })

  test('iconGroup scales the 24 grid to the size asked and keeps strokes round', () => {
    const g = iconGroup('check', '#fff', 4, 6, 12, 2)
    expect(g).toContain('translate(4 6) scale(0.5)')
    expect(g).toContain('stroke-linecap="round"')
  })

  test('iconSvg is a square standalone svg', () => {
    expect(iconSvg('bolt', '#fff', 16)).toContain('viewBox="0 0 16 16" width="16" height="16"')
  })
})

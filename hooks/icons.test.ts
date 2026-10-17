import { describe, expect, test } from 'claude-code/testing'

import { ICONS, ICON_FILL, hasIcon, iconGroup, iconSvg } from './icons'

describe('icons', () => {
  test('every icon is plain, balanced markup with no text', () => {
    for (const [name, body] of Object.entries(ICONS)) {
      expect(body.includes('<text'), name).toBe(false)
      const opens = (body.match(/<(?:path|circle|rect)\b/g) ?? []).length
      const closes = (body.match(/\/>/g) ?? []).length
      expect(closes, name).toBe(opens)
    }
  })

  test('every fill is plain, balanced markup and belongs to a real icon', () => {
    for (const [name, body] of Object.entries(ICON_FILL)) {
      expect(hasIcon(name), name).toBe(true)
      const opens = (body ?? '').match(/<(?:path|circle|rect)\b/g)?.length ?? 0
      expect((body ?? '').match(/\/>/g)?.length ?? 0, name).toBe(opens)
    }
  })

  test('an icon with a body gets a soft fill under its line; fill 0 is line only', () => {
    expect(iconGroup('coin', '#fff', 0, 0, 24)).toContain('fill-opacity="0.3"')
    expect(iconGroup('coin', '#fff', 0, 0, 24, 2, 0)).not.toContain('fill-opacity')
    expect(iconGroup('check', '#fff', 0, 0, 24)).not.toContain('fill-opacity')
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

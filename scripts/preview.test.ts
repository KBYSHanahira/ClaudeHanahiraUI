// The READMEs show docs/preview.png, a picture drawn from docs/preview.svg by
// scripts/preview.ts. A PNG cannot be read back, so the script records the SVG it was drawn
// from (docs/preview.png.sha256): a band redrawn without a new PNG fails here, not on GitHub.
import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { VERSION } from '../hooks/version'

const doc = (name: string) => readFileSync(new URL(`../docs/${name}`, import.meta.url))

test('the preview shows this version, and the PNG was drawn from that SVG', () => {
  const svg = doc('preview.svg')
  expect(svg.toString()).toContain(`v${VERSION}`)
  expect(doc('preview.png.sha256').toString().trim()).toBe(createHash('sha256').update(svg).digest('hex'))
})

// Checks of the repository's files, for `bun test` only: they read files from disk, which a
// test under `claude plugin test` cannot do (it imports code files and 'claude-code' alone,
// and loads every *.test.ts it finds, so these are named *.spec.ts to stay out of its way).
import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { VERSION } from '../hooks/version'

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url))

test('VERSION matches plugin.json', () => {
  expect(VERSION).toBe(JSON.parse(file('.claude-plugin/plugin.json').toString()).version)
})

// The READMEs show docs/preview.png, a picture drawn from docs/preview.svg by
// scripts/preview.ts. A PNG cannot be read back, so the script records the SVG it was drawn
// from (docs/preview.png.sha256): a band redrawn without a new PNG fails here, not on GitHub.
test('the preview shows this version, and the PNG was drawn from that SVG', () => {
  const svg = file('docs/preview.svg')
  expect(svg.toString()).toContain(`v${VERSION}`)
  expect(file('docs/preview.png.sha256').toString().trim()).toBe(createHash('sha256').update(svg).digest('hex'))
})

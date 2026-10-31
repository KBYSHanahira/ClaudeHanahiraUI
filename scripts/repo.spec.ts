// Checks of the repository's files, for `bun test` only: they read files from disk, which a
// test under `claude plugin test` cannot do (it imports code files and 'claude-code' alone,
// and loads every *.test.ts it finds, so these are named *.spec.ts to stay out of its way).
import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
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

// scripts/install-ssh.sh marks the SSH copy by rewriting these exact texts with sed; if they
// change, the copy loses its marks without a word, so they are pinned here.
test('the texts install-ssh.sh rewrites in the SSH copy are still there', () => {
  const core = file('skills/hanahira-claude-ui/SKILL.md').toString()
  expect(core).toMatch(/^\+ ╭─ \(\( \^w\^ \)\) Hanahira Claude UI V\d+ · ● ACTIVE$/m)
  expect(core.match(/┃ Version \d+ · SKILL  /g)?.length).toBe(2)
  expect(file('hooks/version.ts').toString()).toMatch(/^export const SKILLS_FROM\b.*= 'Account'$/m)
})

// Each skill is found by its folder, and the engine names it by the `name:` in its SKILL.md.
test('every skill folder holds a SKILL.md named after it', () => {
  const dirs = readdirSync(new URL('../skills', import.meta.url), { withFileTypes: true }).filter(d => d.isDirectory())
  expect(dirs.length).toBeGreaterThan(0)
  for (const { name } of dirs) {
    expect(file(`skills/${name}/SKILL.md`).toString()).toMatch(new RegExp(`^---\\nname: "?${name}"?\\n`))
  }
})

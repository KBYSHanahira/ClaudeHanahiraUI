// Checks of the repository's files, for `bun test` only: they read files from disk, which a
// test under `claude plugin test` cannot do (it imports code files and 'claude-code' alone,
// and loads every *.test.ts it finds, so these are named *.spec.ts to stay out of its way).
import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { SKILLS_VERSION, VERSION } from '../hooks/version'

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url))

test('VERSION matches plugin.json', () => {
  expect(VERSION).toBe(JSON.parse(file('.claude-plugin/plugin.json').toString()).version)
})

// The band's Hanahira tile names the skills' version; it must be the one the core skill says.
test('SKILLS_VERSION matches the core skill', () => {
  const core = file('skills/hanahira-claude-ui/SKILL.md').toString()
  expect(core).toContain(`\n# Hanahira Claude UI Version ${SKILLS_VERSION}\n`)
  expect(core).toContain(`Hanahira Claude UI V${SKILLS_VERSION} · `)
})

// The READMEs show docs/preview.png, a picture drawn from docs/preview.svg by
// scripts/preview.ts. A PNG cannot be read back, so the script records the SVG it was drawn
// from (docs/preview.png.sha256): a band redrawn without a new PNG fails here, not on GitHub.
test('the preview shows this version, and the PNG was drawn from that SVG', () => {
  const svg = file('docs/preview.svg')
  expect(svg.toString()).toContain(`V${VERSION}`) // the HUD sets its captions in capitals
  expect(file('docs/preview.png.sha256').toString().trim()).toBe(createHash('sha256').update(svg).digest('hex'))
})

// scripts/install-ssh.sh marks the SSH copy by rewriting these exact texts with sed; if they
// change, the copy loses its marks without a word, so they are pinned here.
test('the texts install-ssh.sh rewrites in the SSH copy are still there', () => {
  const core = file('skills/hanahira-claude-ui/SKILL.md').toString()
  expect(core).toMatch(/^\+ ╭─ -\(O\)- Hanahira Claude UI V\d+ · ● ACTIVE$/m)
  const boxes = file('skills/hanahira-claude-ui/references/banners.md').toString()
  expect(boxes.match(/┃ Version \d+ · SKILL  /g)?.length).toBe(2)
  expect(core).toContain('references/banners.md')
  expect(file('hooks/version.ts').toString()).toMatch(/^export const SKILLS_FROM\b.*= 'Account'$/m)
})

// The full banner boxes are copied verbatim into replies: a row one character off breaks the
// right border, so every box row (2-char prefix, border, 49 inside, border) is 53 wide.
test('every full-box row in the banner boxes is 53 characters wide', () => {
  const rows = file('skills/hanahira-claude-ui/references/banners.md')
    .toString()
    .split('\n')
    .filter(l => /^[ +-] [│├╭╰].*[│┤╮╯]$/.test(l))
  expect(rows.length).toBeGreaterThanOrEqual(20) // the ACTIVE box and the DEACTIVE box
  for (const r of rows) expect([r, [...r].length]).toEqual([r, 53])
})

// Each skill is found by its folder, and the engine names it by the `name:` in its SKILL.md.
test('every skill folder holds a SKILL.md named after it', () => {
  const dirs = readdirSync(new URL('../skills', import.meta.url), { withFileTypes: true }).filter(d => d.isDirectory())
  expect(dirs.length).toBeGreaterThan(0)
  for (const { name } of dirs) {
    expect(file(`skills/${name}/SKILL.md`).toString()).toMatch(new RegExp(`^---\\nname: "?${name}"?\\n`))
  }
})

// The engine lists every skill's description in about 8,000 characters (1% of a 200k context) shared
// with every other plugin; past that it drops descriptions, and a companion shows by name only.
test('skill descriptions stay short enough for the listing budget', () => {
  const dirs = readdirSync(new URL('../skills', import.meta.url), { withFileTypes: true }).filter(d => d.isDirectory())
  let total = 0
  for (const { name } of dirs) {
    const d = file(`skills/${name}/SKILL.md`).toString().match(/^description: (.*)$/m)?.[1] ?? ''
    expect(d.length).toBeGreaterThan(40)
    expect(d).not.toMatch(/: /)
    expect([name, d.length <= (name === 'hanahira-claude-ui' ? 800 : 240)]).toEqual([name, true])
    total += name.length + 4 + d.length
  }
  expect(total).toBeLessThan(5000)
})

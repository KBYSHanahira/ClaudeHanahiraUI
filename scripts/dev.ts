// Hot reload while developing: keeps a copy of this repo's mod, renamed hanahira-claude-ui-dev,
// in sync on every save. Run: bun scripts/dev.ts   (Ctrl+C to stop)
//
// The repo cannot be loaded as it is: Desktop syncs an empty hanahira-claude-ui (no hooks/)
// into every session and that name loads first. A copy under its own name has no rival.
// Sessions load the copy through ~/.claude/settings.json:
//   "env": { "CLAUDE_CODE_PLUGIN_DIRS": "<DEST>", "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1" }
// and the engine reloads it each time this script writes to it. Turn hanahira-claude-ui-ssh
// off meanwhile, or two bands are drawn.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const SRC = resolve(import.meta.dir, '..')
const NAME = 'hanahira-claude-ui'
const DEV_NAME = `${NAME}-dev`
const DEST = process.env.HANAHIRA_DEV_DIR ?? join(homedir(), '.claude', 'hanahira-dev', DEV_NAME)

// Values in $.state belong to the plugin by name, so the name inside the code follows it.
const rename = (text: string) => text.replaceAll(`'${NAME}'`, `'${DEV_NAME}'`)

// Writes only what changed: an unchanged file would reload nothing anyway, and fewer writes
// keep the engine's quiet-folder wait short.
const put = (path: string, text: string) => {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false
  writeFileSync(path, text)
  return true
}

const sync = () => {
  mkdirSync(join(DEST, '.claude-plugin'), { recursive: true })
  mkdirSync(join(DEST, 'hooks'), { recursive: true })
  mkdirSync(join(DEST, 'types'), { recursive: true })
  const changed: string[] = []

  const hooks = readdirSync(join(SRC, 'hooks')).filter(
    f => (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) || f === 'hooks.json',
  )
  for (const f of hooks) {
    if (put(join(DEST, 'hooks', f), rename(readFileSync(join(SRC, 'hooks', f), 'utf8')))) changed.push(`hooks/${f}`)
  }
  // A file deleted or renamed in the repo goes from the copy too.
  for (const f of readdirSync(join(DEST, 'hooks'))) {
    if (!hooks.includes(f)) {
      rmSync(join(DEST, 'hooks', f))
      changed.push(`-hooks/${f}`)
    }
  }
  if (put(join(DEST, 'types', 'index.d.ts'), rename(readFileSync(join(SRC, 'types', 'index.d.ts'), 'utf8')))) {
    changed.push('types/index.d.ts')
  }

  const { version } = JSON.parse(readFileSync(join(SRC, '.claude-plugin', 'plugin.json'), 'utf8'))
  const manifest = {
    name: DEV_NAME,
    version,
    description: 'Hanahira UI, live copy of the working tree for development',
    author: { name: 'Hanahira' },
    types: './types/index.d.ts',
  }
  if (put(join(DEST, '.claude-plugin', 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n')) {
    changed.push('plugin.json')
  }
  return changed
}

const stamp = () => new Date().toTimeString().slice(0, 8)
const run = () => {
  try {
    const changed = sync()
    if (changed.length) console.log(`${stamp()} synced ${changed.join(', ')}`)
  } catch (err) {
    // A file caught mid-save can fail to read; the next save syncs it.
    console.error(`${stamp()} sync failed: ${(err as Error).message}`)
  }
}

run()
console.log(`Watching ${SRC}/{hooks,types,.claude-plugin} -> ${DEST}`)

// Editors save in bursts (write, rename, chmod): one sync per burst.
let timer: ReturnType<typeof setTimeout> | undefined
for (const dir of ['hooks', 'types', '.claude-plugin']) {
  watch(join(SRC, dir), () => {
    clearTimeout(timer)
    timer = setTimeout(run, 100)
  })
}

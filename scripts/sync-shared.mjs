// Copies the files in shared/ into every mod's hooks/ folder, each with a
// header saying where it comes from. Every mod is installed on its own, so it
// carries its own copy; edit the one in shared/ and run this.
//
// shared/notify.ps1 goes to each mod's scripts/ folder: the one script a mod runs.
//
// shared/engine.tsx is different: its helpers use the engine ($), and the
// plugin directory reads a mod's calls on $ only in the file that registers
// its hooks, so it is pasted into each register.tsx between two marker lines.
//
//   node scripts/sync-shared.mjs          copy shared/ into each mod
//   node scripts/sync-shared.mjs --check  exit 1 if any copy differs

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shared = join(root, 'shared')
const mods = readdirSync(join(root, 'plugins'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(root, 'plugins', d.name, '.claude-plugin', 'plugin.json')))
  .map(d => d.name)
const ENGINE = 'engine.tsx'
const files = readdirSync(shared).filter(f => /\.(ts|tsx)$/.test(f) && f !== ENGINE)
const BEGIN = '// ── from shared/engine.tsx (scripts/sync-shared.mjs): edit that file, not this block ──'
const END = '// ── end of shared/engine.tsx ──'
const unix = text => text.replace(/\r\n/g, '\n')
const engine = unix(readFileSync(join(shared, ENGINE), 'utf8')).trimEnd()
const notify = unix(readFileSync(join(shared, 'notify.ps1'), 'utf8'))
const isCheck = process.argv.includes('--check')

let stale = 0
const write = (target, text, label) => {
  stale += 1
  if (isCheck) console.log(`out of date: ${label}`)
  else {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text)
    console.log(`wrote ${label}`)
  }
}
const read = target => (existsSync(target) ? unix(readFileSync(target, 'utf8')) : '')

for (const mod of mods) {
  for (const file of files) {
    const copy = `// Copied from shared/${file} by scripts/sync-shared.mjs: edit that file, not this one.\n${unix(readFileSync(join(shared, file), 'utf8'))}`
    const target = join(root, 'plugins', mod, 'hooks', file)
    if (read(target) !== copy) write(target, copy, `plugins/${mod}/hooks/${file}`)
  }

  const script = join(root, 'plugins', mod, 'scripts', 'notify.ps1')
  if (read(script) !== notify) write(script, notify, `plugins/${mod}/scripts/notify.ps1`)

  const reg = join(root, 'plugins', mod, 'hooks', 'register.tsx')
  const now = read(reg)
  const a = now.indexOf(BEGIN)
  const b = now.indexOf(END)
  if (a < 0 || b < a) {
    console.log(`missing the engine markers: plugins/${mod}/hooks/register.tsx`)
    stale += 1
    continue
  }
  const want = `${now.slice(0, a)}${BEGIN}\n${engine}\n${now.slice(b)}`
  if (want !== now) write(reg, want, `plugins/${mod}/hooks/register.tsx (engine block)`)
}
if (isCheck && stale > 0) process.exit(1)
console.log(isCheck ? 'all copies match shared/' : `${stale} file(s) updated`)

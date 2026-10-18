// Copies the files in shared/ into every mod's hooks/ folder, each with a
// header saying where it comes from. Every mod is installed on its own, so it
// carries its own copy; edit the one in shared/ and run this.
//
// shared/engine.tsx is different: its helpers use the engine ($), and the
// plugin directory reads a mod's calls on $ only in the file that registers
// its hooks, so it is pasted into each register.tsx between two marker lines.
//
//   node scripts/sync-shared.mjs          copy shared/ into each mod
//   node scripts/sync-shared.mjs --check  exit 1 if any copy differs

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
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
const engine = readFileSync(join(shared, ENGINE), 'utf8').replace(/\r\n/g, '\n').trimEnd()
const isCheck = process.argv.includes('--check')

let stale = 0
const write = (target, text, label) => {
  stale += 1
  if (isCheck) console.log(`out of date: ${label}`)
  else {
    writeFileSync(target, text)
    console.log(`wrote ${label}`)
  }
}

for (const mod of mods) {
  for (const file of files) {
    const body = readFileSync(join(shared, file), 'utf8').replace(/\r\n/g, '\n')
    const copy = `// Copied from shared/${file} by scripts/sync-shared.mjs: edit that file, not this one.\n${body}`
    const target = join(root, 'plugins', mod, 'hooks', file)
    const now = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : ''
    if (now !== copy) write(target, copy, `plugins/${mod}/hooks/${file}`)
  }

  const reg = join(root, 'plugins', mod, 'hooks', 'register.tsx')
  const now = readFileSync(reg, 'utf8').replace(/\r\n/g, '\n')
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

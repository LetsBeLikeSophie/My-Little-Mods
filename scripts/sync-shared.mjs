// Copies the files in shared/ into every mod's hooks/ folder, each with a
// header saying where it comes from. Every mod is installed on its own, so it
// carries its own copy; edit the one in shared/ and run this.
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
const files = readdirSync(shared).filter(f => /\.(ts|tsx)$/.test(f))
const isCheck = process.argv.includes('--check')

let stale = 0
for (const mod of mods) {
  for (const file of files) {
    const body = readFileSync(join(shared, file), 'utf8').replace(/\r\n/g, '\n')
    const copy = `// Copied from shared/${file} by scripts/sync-shared.mjs: edit that file, not this one.\n${body}`
    const target = join(root, 'plugins', mod, 'hooks', file)
    const now = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : ''
    if (now === copy) continue
    stale += 1
    if (isCheck) console.log(`out of date: plugins/${mod}/hooks/${file}`)
    else {
      writeFileSync(target, copy)
      console.log(`wrote plugins/${mod}/hooks/${file}`)
    }
  }
}
if (isCheck && stale > 0) process.exit(1)
console.log(isCheck ? 'all copies match shared/' : `${stale} file(s) updated`)

// Resolves a conflicted locale catalog key by key: the fork wins where both sides set a key,
// and every key only one side added is kept. Runs mid-merge, reading git's index stages.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const [file] = process.argv.slice(2)
const stage = (n) =>
  JSON.parse(
    execFileSync('git', ['show', `:${n}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  )

function merge(ours, theirs) {
  const out = { ...theirs }
  for (const [key, value] of Object.entries(ours)) {
    const other = theirs[key]
    const bothObjects =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      other &&
      typeof other === 'object'
    out[key] = bothObjects ? merge(value, other) : value
  }
  return out
}

writeFileSync(file, `${JSON.stringify(merge(stage(2), stage(3)), null, 2)}\n`)

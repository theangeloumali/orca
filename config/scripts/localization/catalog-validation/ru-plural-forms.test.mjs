import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const RU_CATALOG = 'src/renderer/src/i18n/locales/ru.json'
const repoRoot = path.join(import.meta.dirname, '..', '..', '..', '..')

function flattenCatalog(catalog, prefix = '', flat = {}) {
  for (const [key, value] of Object.entries(catalog)) {
    const flatKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      flattenCatalog(value, flatKey, flat)
    } else {
      flat[flatKey] = value
    }
  }
  return flat
}

function readUpstreamCatalog() {
  try {
    const text = execFileSync('git', ['show', `upstream/main:${RU_CATALOG}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    return flattenCatalog(JSON.parse(text))
  } catch {
    return null
  }
}

// Only the fork sync job fetches upstream; elsewhere there is nothing to compare against.
const upstream = readUpstreamCatalog()

describe('ru plural forms', () => {
  it.skipIf(upstream === null)(
    'keeps every _few/_many that upstream tells apart from _other (a sync merge once copied _other over 476)',
    () => {
      const fork = flattenCatalog(JSON.parse(readFileSync(path.join(repoRoot, RU_CATALOG), 'utf8')))
      const collapsed = Object.keys(fork).filter((key) => {
        const plural = /^(.*)_(few|many)$/.exec(key)
        const other = plural ? fork[`${plural[1]}_other`] : undefined
        return (
          other !== undefined &&
          fork[key] === other &&
          upstream[key] !== undefined &&
          upstream[key] !== other
        )
      })
      expect(collapsed).toEqual([])
    }
  )
})

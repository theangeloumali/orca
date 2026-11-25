import { createRequire } from 'node:module'
import { posix } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLI_MAIN_ENTRY_NAMES } from '../../../build-plugins/cli-main-entry-names'

function readAsarUnpackPatterns(): string[] {
  const builderConfig: unknown = createRequire(import.meta.url)(
    '../../../electron-builder.config.cjs'
  )
  if (
    typeof builderConfig !== 'object' ||
    builderConfig === null ||
    !('asarUnpack' in builderConfig) ||
    !Array.isArray(builderConfig.asarUnpack)
  ) {
    throw new Error('electron-builder config has no asarUnpack list')
  }
  return builderConfig.asarUnpack.filter(
    (pattern): pattern is string => typeof pattern === 'string'
  )
}

describe('CLI main entries in the packaged app', () => {
  // The plain-node CLI cannot read app.asar, so a packed entry fails verify-skills-cli-runtime.
  it('unpacks every main entry the CLI loads', () => {
    const patterns = readAsarUnpackPatterns()
    const packedEntries = CLI_MAIN_ENTRY_NAMES.map((name) => `out/main/${name}.js`).filter(
      (entryPath) => !patterns.some((pattern) => posix.matchesGlob(entryPath, pattern))
    )
    expect(packedEntries).toEqual([])
  })
})

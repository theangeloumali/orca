import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildMacSwapScript } from './fork-mac-swap-script'

// Runs the generated script for real against fake app bundles, with `open`/`xattr` stubbed on PATH.
function runSwap(options: { openFails?: boolean } = {}) {
  const root = mkdtempSync(join(tmpdir(), "orca swap '"))
  const appPath = join(root, 'Applications', 'Orca.app')
  const stagedAppPath = join(root, 'staged', 'Orca.app')
  mkdirSync(appPath, { recursive: true })
  mkdirSync(stagedAppPath, { recursive: true })
  writeFileSync(join(appPath, 'version'), 'old')
  writeFileSync(join(stagedAppPath, 'version'), 'new')
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const launches = join(root, 'launches')
  writeFileSync(
    join(bin, 'open'),
    `#!/bin/sh\necho "$1" >> "$ORCA_TEST_LAUNCHES"\nexit ${options.openFails ? 1 : 0}\n`
  )
  writeFileSync(join(bin, 'xattr'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'open'), 0o755)
  chmodSync(join(bin, 'xattr'), 0o755)
  const exited = spawnSync('true')
  const script = buildMacSwapScript({ pid: exited.pid ?? 1, appPath, stagedAppPath })
  const result = spawnSync('/bin/sh', ['-c', script], {
    env: { PATH: `${bin}:/usr/bin:/bin`, ORCA_TEST_LAUNCHES: launches },
    encoding: 'utf8'
  })
  return {
    status: result.status,
    version: readFileSync(join(appPath, 'version'), 'utf8'),
    previousKept: existsSync(`${appPath}.previous`),
    launches: existsSync(launches) ? readFileSync(launches, 'utf8').trim().split('\n') : []
  }
}

describe.skipIf(process.platform === 'win32')('buildMacSwapScript', () => {
  it('swaps in the new app once Orca has quit, relaunches it and removes the old copy', () => {
    const outcome = runSwap()
    expect(outcome).toMatchObject({ status: 0, version: 'new', previousKept: false })
    expect(outcome.launches).toHaveLength(1)
  })

  it('puts the old app back when the new one will not launch', () => {
    const outcome = runSwap({ openFails: true })
    expect(outcome.version).toBe('old')
    expect(outcome.previousKept).toBe(false)
    expect(outcome.status).not.toBe(0)
  })
})

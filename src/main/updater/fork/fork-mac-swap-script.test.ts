import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildMacSwapScript } from './fork-mac-swap-script'

type Launch = 'starts' | 'crashes' | 'open-fails'

// Runs the generated script for real against fake app bundles; a new app that starts writes the marker.
function runSwap(launch: Launch, options: { locked?: boolean } = {}) {
  const root = mkdtempSync(join(tmpdir(), "orca swap '"))
  const appPath = join(root, 'Applications', 'Orca.app')
  const stagedAppPath = join(root, 'staged', 'Orca.app')
  const launchedMarkerPath = join(root, 'launched')
  const lockPath = join(root, 'swap.lock')
  for (const [bundle, version] of [
    [appPath, 'old'],
    [stagedAppPath, 'new']
  ] as const) {
    mkdirSync(bundle, { recursive: true })
    writeFileSync(join(bundle, 'version'), version)
  }
  if (options.locked) {
    mkdirSync(lockPath)
  }
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const open = {
    starts: '#!/bin/sh\n[ "$(cat "$1/version")" = new ] && touch "$ORCA_TEST_MARKER"\nexit 0\n',
    crashes: '#!/bin/sh\nexit 0\n',
    'open-fails': '#!/bin/sh\nexit 1\n'
  }[launch]
  writeFileSync(join(bin, 'open'), open)
  writeFileSync(join(bin, 'xattr'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'open'), 0o755)
  chmodSync(join(bin, 'xattr'), 0o755)
  const exited = spawnSync('true')
  const script = buildMacSwapScript({
    pid: exited.pid ?? 1,
    appPath,
    stagedAppPath,
    launchedMarkerPath,
    lockPath,
    settleSeconds: 1
  })
  const result = spawnSync('/bin/sh', ['-c', script], {
    env: { PATH: `${bin}:/usr/bin:/bin`, ORCA_TEST_MARKER: launchedMarkerPath },
    encoding: 'utf8'
  })
  return {
    status: result.status,
    version: readFileSync(join(appPath, 'version'), 'utf8'),
    previousKept: existsSync(`${appPath}.previous`),
    lockLeft: existsSync(lockPath)
  }
}

describe.skipIf(process.platform === 'win32')('buildMacSwapScript', () => {
  it('keeps the new app once it reports a clean start, and drops the old copy', () => {
    expect(runSwap('starts')).toEqual({
      status: 0,
      version: 'new',
      previousKept: false,
      lockLeft: false
    })
  })

  it('puts the old app back when the new one never reports starting', () => {
    expect(runSwap('crashes')).toMatchObject({ status: 1, version: 'old', previousKept: false })
  })

  it('puts the old app back when the new one cannot be opened', () => {
    expect(runSwap('open-fails')).toMatchObject({ status: 1, version: 'old', previousKept: false })
  })

  it('does nothing while another swap holds the lock', () => {
    expect(runSwap('starts', { locked: true })).toMatchObject({ status: 0, version: 'old' })
  })
})

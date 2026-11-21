import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildMacSwapScript } from './fork-mac-swap-script'

type Launch = 'runs' | 'crashes' | 'open-fails'

// Runs the generated script for real against fake app bundles; `open` starts the bundle's binary.
function runSwap(launch: Launch) {
  const root = mkdtempSync(join(tmpdir(), "orca swap '"))
  const appPath = join(root, 'Applications', 'Orca.app')
  const stagedAppPath = join(root, 'staged', 'Orca.app')
  for (const [bundle, version] of [
    [appPath, 'old'],
    [stagedAppPath, 'new']
  ] as const) {
    mkdirSync(join(bundle, 'Contents', 'MacOS'), { recursive: true })
    writeFileSync(join(bundle, 'version'), version)
    const binary = join(bundle, 'Contents', 'MacOS', 'Orca')
    writeFileSync(
      binary,
      launch === 'crashes' && version === 'new' ? '#!/bin/sh\nexit 1\n' : '#!/bin/sh\nsleep 4\n'
    )
    chmodSync(binary, 0o755)
  }
  const bin = join(root, 'bin')
  mkdirSync(bin)
  writeFileSync(
    join(bin, 'open'),
    launch === 'open-fails'
      ? '#!/bin/sh\nexit 1\n'
      : '#!/bin/sh\n"$1/Contents/MacOS/Orca" >/dev/null 2>&1 &\nexit 0\n'
  )
  writeFileSync(join(bin, 'xattr'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'open'), 0o755)
  chmodSync(join(bin, 'xattr'), 0o755)
  const exited = spawnSync('true')
  const script = buildMacSwapScript({
    pid: exited.pid ?? 1,
    appPath,
    stagedAppPath,
    settleSeconds: 1
  })
  const result = spawnSync('/bin/sh', ['-c', script], {
    env: { PATH: `${bin}:/usr/bin:/bin` },
    encoding: 'utf8'
  })
  return {
    status: result.status,
    version: readFileSync(join(appPath, 'version'), 'utf8'),
    previousKept: existsSync(`${appPath}.previous`)
  }
}

describe.skipIf(process.platform === 'win32')('buildMacSwapScript', () => {
  it('swaps in the new app once Orca has quit and drops the old copy when the new one keeps running', () => {
    expect(runSwap('runs')).toEqual({ status: 0, version: 'new', previousKept: false })
  })

  it('puts the old app back when the new one crashes on launch', () => {
    expect(runSwap('crashes')).toMatchObject({ version: 'old', previousKept: false, status: 1 })
  })

  it('puts the old app back when the new one cannot be opened', () => {
    expect(runSwap('open-fails')).toMatchObject({ version: 'old', previousKept: false, status: 1 })
  })
})

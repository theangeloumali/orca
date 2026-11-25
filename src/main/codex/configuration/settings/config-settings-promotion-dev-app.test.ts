import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'

const homedirMock = vi.hoisted(() => vi.fn<() => string>())
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof Os>()),
  homedir: homedirMock
}))

const SYSTEM_CONFIG = 'approval_policy = "never"\n'
const RUNTIME_CONFIG = '[plugins.demo]\nenabled = true\n'
let root = ''
let systemHomePath = ''
let runtimeHomePath = ''

async function launchMirror(devApp: boolean): Promise<void> {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { syncSystemConfigIntoManagedCodexHome } = await import('./codex-config-mirror')
  syncSystemConfigIntoManagedCodexHome({ runtimeHomePath, systemHomePath })
}

describe('Codex launch config mirror in Orca Dev', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-dev-codex-'))
    homedirMock.mockReturnValue(join(root, 'home'))
    systemHomePath = join(root, 'home', '.codex')
    runtimeHomePath = join(root, 'OrcaDev', 'codex-runtime-home', 'home')
    mkdirSync(systemHomePath, { recursive: true })
    mkdirSync(runtimeHomePath, { recursive: true })
    writeFileSync(join(systemHomePath, 'config.toml'), SYSTEM_CONFIG)
    writeFileSync(join(runtimeHomePath, 'config.toml'), RUNTIME_CONFIG)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    rmSync(root, { recursive: true, force: true })
  })

  it('writes only under OrcaDev and still mirrors the user settings in', async () => {
    await launchMirror(true)
    expect(readFileSync(join(systemHomePath, 'config.toml'), 'utf8')).toBe(SYSTEM_CONFIG)
    expect(readFileSync(join(runtimeHomePath, 'config.toml'), 'utf8')).toContain(
      'approval_policy = "never"'
    )
  })

  it('still promotes runtime additions to ~/.codex in prod', async () => {
    await launchMirror(false)
    expect(readFileSync(join(systemHomePath, 'config.toml'), 'utf8')).toContain('[plugins.demo]')
  })
})

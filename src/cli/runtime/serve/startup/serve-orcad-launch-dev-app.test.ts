import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const roots: string[] = []

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

async function loadOrcadServeEnv(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  return (await import('./serve-orcad-launch.js')).orcadServeEnv
}

describe('the local orcad that orca serve starts', () => {
  it("resolves Orca Dev's identity and userData when Orca Dev starts it", async () => {
    const home = mkdtempSync(join(tmpdir(), 'orca-orcad-env-'))
    roots.push(home)
    const userDataPath = join(home, 'Library', 'Application Support', 'OrcaDev')
    const orcadServeEnv = await loadOrcadServeEnv(true)
    const env = orcadServeEnv({ baseEnv: {}, userDataPath, version: '1.0.0', supervise: false })

    // orcad is built without the define: only the env it was given reaches it.
    vi.unstubAllGlobals()
    vi.stubEnv('ORCA_USER_DATA', env.ORCA_USER_DATA ?? '')
    vi.stubEnv('ORCA_FORK_DEV_APP', env.ORCA_FORK_DEV_APP ?? '')
    vi.resetModules()
    const { IS_ORCA_DEV_APP } = await import('../../../../shared/fork/orca-dev-app-flag.js')
    const { resolveUserDataPath } =
      await import('../../../../main/orcad/host-runtime/orcad-app-paths.js')
    expect(IS_ORCA_DEV_APP).toBe(true)
    expect(resolveUserDataPath()).toBe(userDataPath)
  })

  it('clears an Orca Dev identity inherited from an Orca Dev terminal when prod starts it', async () => {
    const orcadServeEnv = await loadOrcadServeEnv(false)
    const env = orcadServeEnv({
      baseEnv: { ORCA_FORK_DEV_APP: '1' },
      userDataPath: join(tmpdir(), 'orca'),
      version: '1.0.0',
      supervise: false
    })
    expect(env.ORCA_FORK_DEV_APP).toBe('')
  })
})

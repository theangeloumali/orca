import { homedir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadResolveUserDataPath() {
  vi.resetModules()
  return (await import('./orcad-app-paths')).resolveUserDataPath
}

describe('orcad default userData', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("keeps an Orca Dev orcad with no ORCA_USER_DATA out of prod's ~/.orca", async () => {
    vi.stubEnv('ORCA_FORK_DEV_APP', '1')
    vi.stubEnv('ORCA_USER_DATA', '')
    vi.stubEnv('XDG_DATA_HOME', '')
    const resolveUserDataPath = await loadResolveUserDataPath()
    expect(resolveUserDataPath()).toBe(join(homedir(), '.orca-dev-app'))
  })

  it('uses its own XDG data directory in Orca Dev', async () => {
    vi.stubEnv('ORCA_FORK_DEV_APP', '1')
    vi.stubEnv('ORCA_USER_DATA', '')
    vi.stubEnv('XDG_DATA_HOME', join(homedir(), 'xdg-data'))
    const resolveUserDataPath = await loadResolveUserDataPath()
    expect(resolveUserDataPath()).toBe(join(homedir(), 'xdg-data', 'OrcaDev'))
  })

  it('keeps prod on ~/.orca', async () => {
    vi.stubEnv('ORCA_USER_DATA', '')
    vi.stubEnv('XDG_DATA_HOME', '')
    const resolveUserDataPath = await loadResolveUserDataPath()
    expect(resolveUserDataPath()).toBe(join(homedir(), '.orca'))
  })
})

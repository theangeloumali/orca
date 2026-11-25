import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('orca-dev-app', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('is off unless the build defines ORCA_FORK_DEV_APP', async () => {
    const { IS_ORCA_DEV_APP } = await import('./orca-dev-app')
    expect(IS_ORCA_DEV_APP).toBe(false)
  })

  it('is on in the Orca Dev build', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { IS_ORCA_DEV_APP } = await import('./orca-dev-app')
    expect(IS_ORCA_DEV_APP).toBe(true)
  })

  it('keeps Orca Dev data apart from the prod and pnpm dev profiles', async () => {
    const { getOrcaDevAppUserDataPath } = await import('./orca-dev-app')
    const appData = join('/Users', 'me', 'Library', 'Application Support')
    const userData = getOrcaDevAppUserDataPath(appData)
    expect(userData).toBe(join(appData, 'OrcaDev'))
    // CLI and orchestration treat any "orca-dev" path as a `pnpm dev` profile.
    expect(userData).not.toContain('orca-dev')
  })

  it('reads prod from the packaged default userData', async () => {
    const { getOrcaProdUserDataPath } = await import('./orca-dev-app')
    expect(getOrcaProdUserDataPath('/appdata')).toBe(join('/appdata', 'orca'))
  })

  it('gives Orca Dev its own desktop WebSocket port', async () => {
    const { resolveDevDesktopWsPort } = await import('./orca-dev-app')
    expect(resolveDevDesktopWsPort({ isPackaged: false, isDevApp: false })).toBe(6769)
    expect(resolveDevDesktopWsPort({ isPackaged: true, isDevApp: true })).toBe(6770)
    // Prod keeps the runtime default.
    expect(resolveDevDesktopWsPort({ isPackaged: true, isDevApp: false })).toBeUndefined()
  })
})

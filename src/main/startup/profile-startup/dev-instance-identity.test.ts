import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getDevInstanceIdentity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('keeps the packaged prod identity without the Orca Dev flag', async () => {
    const { getDevInstanceIdentity } = await import('./dev-instance-identity')
    const identity = getDevInstanceIdentity(false, {})
    expect(identity.appName).toBe('Orca')
    expect(identity.appUserModelId).toBe('com.stablyai.orca')
    expect(identity.isDev).toBe(false)
  })

  it('names the packaged Orca Dev build and ignores inherited dev env', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { getDevInstanceIdentity, shouldApplyPreReadyAppName } =
      await import('./dev-instance-identity')
    const identity = getDevInstanceIdentity(false, {
      ORCA_DEV_BRANCH: 'feature/x',
      ORCA_DEV_INSTANCE_LABEL: 'leaked label'
    })
    expect(identity).toEqual({
      name: 'Orca Dev',
      appName: 'Orca Dev',
      isDev: true,
      devLabel: 'Orca Dev',
      devBranch: null,
      devWorktreeName: null,
      devRepoRoot: null,
      dockBadgeLabel: null,
      appUserModelId: 'com.theangeloumali.orca.dev'
    })
    // The Keychain name must be fixed before ready, so it never reads prod's key.
    expect(shouldApplyPreReadyAppName(identity)).toBe(true)
  })
})

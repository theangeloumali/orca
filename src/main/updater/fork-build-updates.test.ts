import { afterEach, describe, expect, it, vi } from 'vitest'

describe('OFFICIAL_UPDATES_DISABLED', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('keeps official updates on when the build is not a fork release', async () => {
    const { OFFICIAL_UPDATES_DISABLED } = await import('./fork-build-updates')
    expect(OFFICIAL_UPDATES_DISABLED).toBe(false)
  })

  it('turns official updates off in a fork release build', async () => {
    vi.stubGlobal('ORCA_FORK_BUILD', true)
    const { OFFICIAL_UPDATES_DISABLED } = await import('./fork-build-updates')
    expect(OFFICIAL_UPDATES_DISABLED).toBe(true)
  })

  it('turns official updates off in the Orca Dev build', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { OFFICIAL_UPDATES_DISABLED } = await import('./fork-build-updates')
    expect(OFFICIAL_UPDATES_DISABLED).toBe(true)
  })
})

describe('FORK_RELEASE_TAG', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('keeps the fork release tag in a fork release build', async () => {
    vi.stubGlobal('ORCA_FORK_RELEASE_TAG', 'v1.0.0-angelo.1')
    const { FORK_RELEASE_TAG } = await import('./fork-build-updates')
    expect(FORK_RELEASE_TAG).toBe('v1.0.0-angelo.1')
  })

  it('drops the tag in Orca Dev, so the fork updater never runs', async () => {
    vi.stubGlobal('ORCA_FORK_RELEASE_TAG', 'v1.0.0-angelo.1')
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { FORK_RELEASE_TAG } = await import('./fork-build-updates')
    expect(FORK_RELEASE_TAG).toBeNull()
  })
})

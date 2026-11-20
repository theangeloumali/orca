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
})

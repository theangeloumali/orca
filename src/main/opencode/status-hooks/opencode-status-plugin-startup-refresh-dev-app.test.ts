import { afterEach, describe, expect, it, vi } from 'vitest'

const refreshInstalledPlugins = vi.hoisted(() => vi.fn())

vi.mock('./hook-service', () => ({
  openCodeHookService: { refreshInstalledPlugins },
  openCode2HookService: { refreshInstalledPlugins }
}))

async function loadRefresh(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  return (await import('./opencode-status-plugin-startup-refresh'))
    .refreshInstalledOpenCodeStatusPlugins
}

describe('OpenCode status plugin refresh in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    refreshInstalledPlugins.mockClear()
  })

  it('leaves the user-global OpenCode plugins to prod', async () => {
    const refresh = await loadRefresh(true)
    refresh({})
    expect(refreshInstalledPlugins).not.toHaveBeenCalled()
  })

  it('refreshes them in prod', async () => {
    const refresh = await loadRefresh(false)
    refresh({})
    expect(refreshInstalledPlugins).toHaveBeenCalledTimes(2)
  })
})

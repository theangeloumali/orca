import { afterEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []

vi.mock('electron', () => ({
  app: {
    relaunch: () => calls.push('relaunch'),
    quit: () => calls.push('quit')
  }
}))

vi.mock('../i18n/main-i18n', () => ({
  translateMain: (_key: string, fallback: string) => fallback
}))

const updateItem: Electron.MenuItemConstructorOptions = { label: 'Check for Updates...' }

describe('resolveUpdateMenuItem', () => {
  afterEach(() => {
    calls.length = 0
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('keeps Check for Updates outside Orca Dev', async () => {
    const { resolveUpdateMenuItem } = await import('./app-menu-refresh-from-orca-item')
    expect(resolveUpdateMenuItem(updateItem)).toBe(updateItem)
  })

  it('offers Refresh from Orca in Orca Dev, relaunching so the launch sync runs again', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { resolveUpdateMenuItem } = await import('./app-menu-refresh-from-orca-item')
    const item = resolveUpdateMenuItem(updateItem)
    expect(item.label).toBe('Refresh from Orca')
    item.click?.(Object.create(null), undefined, Object.create(null))
    // relaunch only schedules; quit must follow or nothing restarts.
    expect(calls).toEqual(['relaunch', 'quit'])
  })
})

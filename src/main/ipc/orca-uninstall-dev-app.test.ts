import { afterEach, describe, expect, it, vi } from 'vitest'

const handle = vi.fn()
const store = { updateSettingsAndFlush: vi.fn(), getSettings: vi.fn() }

vi.mock('electron', () => ({
  app: { getPath: vi.fn(), getAppPath: vi.fn(), quit: vi.fn() },
  ipcMain: { handle },
  shell: { showItemInFolder: vi.fn() }
}))

describe('registerOrcaUninstallHandlers in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    handle.mockClear()
  })

  it('registers the uninstall IPC in prod', async () => {
    const { registerOrcaUninstallHandlers } = await import('./orca-uninstall')
    registerOrcaUninstallHandlers(store)
    expect(handle).toHaveBeenCalledWith('orcaUninstall:runStep', expect.any(Function))
  })

  it("registers nothing in Orca Dev, so it can never remove prod's installs", async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    vi.resetModules()
    const { registerOrcaUninstallHandlers } = await import('./orca-uninstall')
    registerOrcaUninstallHandlers(store)
    expect(handle).not.toHaveBeenCalled()
  })
})

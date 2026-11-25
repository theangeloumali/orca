import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronApp = vi.hoisted(() => ({
  setPath: vi.fn(),
  getPath: vi.fn((name: string) => (name === 'appData' ? '/appdata' : '/unused'))
}))
vi.mock('electron', () => ({ app: electronApp }))
vi.mock('../testing/e2e-config', () => ({ getMainE2EConfig: () => ({}) }))

describe('configureDevUserDataPath in Orca Dev', () => {
  beforeEach(() => {
    electronApp.setPath.mockClear()
    vi.stubEnv('ORCA_DEV_USER_DATA_PATH', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('pins the packaged Orca Dev build to its own userData', async () => {
    vi.stubGlobal('ORCA_FORK_DEV_APP', true)
    const { configureDevUserDataPath } = await import('../configure-process')
    configureDevUserDataPath(false)
    expect(electronApp.setPath).toHaveBeenCalledWith('userData', join('/appdata', 'OrcaDev'))
  })

  it('leaves packaged prod on its default userData', async () => {
    const { configureDevUserDataPath } = await import('../configure-process')
    configureDevUserDataPath(false)
    expect(electronApp.setPath).not.toHaveBeenCalled()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../shared/orca-profiles/constants'

const deps = vi.hoisted(() => ({
  reconcileConfig: vi.fn(async () => {}),
  ensurePlugin: vi.fn(async () => '/user-data/plugin'),
  listProfiles: vi.fn(async () => ['/profiles/a']),
  loginEnv: vi.fn(async () => ({})),
  claudeOnPath: vi.fn(async () => true)
}))

async function reconcileEveryPath(devApp: boolean): Promise<void> {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { ClaudeAgentViewService } = await import('./agent-view-service')
  const service = new ClaudeAgentViewService('/user-data', deps)
  const settings = getDefaultSettings('/home')
  await service.reconcile({ ...settings, claudeSubagentNavigationEnabled: true })
  await service.prepareProfile('/profiles/b')
  await service.reconcile({ ...settings, claudeSubagentNavigationEnabled: false })
}

describe('Claude agent view reconcile in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('writes no Claude settings.json in Orca Dev', async () => {
    await reconcileEveryPath(true)
    expect(deps.reconcileConfig).not.toHaveBeenCalled()
    expect(deps.ensurePlugin).not.toHaveBeenCalled()
  })

  it('still adds and removes the binding in prod', async () => {
    await reconcileEveryPath(false)
    expect(deps.reconcileConfig).toHaveBeenCalledWith(
      expect.stringMatching(/settings\.json$/),
      true
    )
    expect(deps.reconcileConfig).toHaveBeenCalledWith(
      expect.stringMatching(/settings\.json$/),
      false
    )
  })
})

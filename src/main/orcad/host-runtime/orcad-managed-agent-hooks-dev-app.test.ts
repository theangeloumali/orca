import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../shared/orca-profiles/constants'

const hookWriters = vi.hoisted(() => ({
  startCodexHooks: vi.fn(),
  reconcileStartupManagedAgentHooks: vi.fn(),
  refreshInstalledOpenCodeStatusPlugins: vi.fn()
}))

vi.mock('../../claude/agent-view/agent-view-service', () => ({
  getClaudeAgentViewService: () => ({ reconcile: async () => {} })
}))
vi.mock('../../codex/hooks/reconciliation/codex-hook-reconcile', () => ({
  startCodexHooks: hookWriters.startCodexHooks
}))
vi.mock('../../agent-hooks/installation/managed-agent-hook-startup', () => ({
  reconcileStartupManagedAgentHooks: hookWriters.reconcileStartupManagedAgentHooks
}))
vi.mock('../../opencode/status-hooks/opencode-status-plugin-startup-refresh', () => ({
  refreshInstalledOpenCodeStatusPlugins: hookWriters.refreshInstalledOpenCodeStatusPlugins
}))
vi.mock('../../agent-hooks/installation/agent-home-login-shell', () => ({
  adoptLoginShellAgentHomes: async () => {}
}))
vi.mock('../../agent-hooks/installation/local-agent-cli-presence', () => ({
  hydrateAgentCliShellPath: async () => {}
}))
vi.mock('../../../shared/app-lifecycle/app-environment', () => ({
  getAppEnvironment: () => ({ isPackaged: () => false })
}))
// Its own dev-app test covers it; here it would read the real host list.
vi.mock('../../mcp-servers/agent-files/mcp-agent-file-sync', () => ({
  startMcpAgentFileSync: () => () => {}
}))

async function startHooks(devApp: boolean): Promise<void> {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  const { startOrcadManagedAgentHooks } = await import('./orcad-managed-agent-hooks')
  const settings = getDefaultSettings('/home')
  startOrcadManagedAgentHooks(
    { getSettings: () => settings, onSettingsChanged: () => () => {} },
    () => {},
    () => {}
  ).readinessPublished()
  // adoptLoginShellAgentHomes resolves before the managed reconcile runs.
  await Promise.resolve()
  await Promise.resolve()
}

describe('orcad agent hooks in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("an orcad Orca Dev started reconciles none of prod's user-global hooks", async () => {
    await startHooks(true)
    expect(hookWriters.startCodexHooks).not.toHaveBeenCalled()
    expect(hookWriters.reconcileStartupManagedAgentHooks).not.toHaveBeenCalled()
    expect(hookWriters.refreshInstalledOpenCodeStatusPlugins).not.toHaveBeenCalled()
  })

  it('a prod orcad still reconciles them', async () => {
    await startHooks(false)
    expect(hookWriters.startCodexHooks).toHaveBeenCalledOnce()
    expect(hookWriters.reconcileStartupManagedAgentHooks).toHaveBeenCalledOnce()
    expect(hookWriters.refreshInstalledOpenCodeStatusPlugins).toHaveBeenCalledOnce()
  })
})

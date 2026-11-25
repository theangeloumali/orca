import { beforeEach, describe, expect, it, vi } from 'vitest'

const startCodexHooks = vi.fn()
const reconcileStartupManagedAgentHooks = vi.fn()
vi.mock('../codex/hooks/reconciliation/codex-hook-reconcile', () => ({ startCodexHooks }))
vi.mock('../agent-hooks/installation/managed-agent-hook-startup', () => ({
  reconcileStartupManagedAgentHooks
}))

const hooks = {
  codex: {
    pathReady: Promise.resolve(),
    isEnabled: () => true,
    resolveLaunchHome: () => null
  },
  managed: { getSettings: vi.fn(), isQuitting: () => false, shouldHydrateShellPath: false }
}

describe('startDesktopAgentHooks', () => {
  beforeEach(() => {
    startCodexHooks.mockClear()
    reconcileStartupManagedAgentHooks.mockClear()
  })

  it('reconciles the Codex and managed agent hooks in prod', async () => {
    const { startDesktopAgentHooks } = await import('./desktop-agent-hooks-startup')
    startDesktopAgentHooks(hooks, false)
    expect(startCodexHooks).toHaveBeenCalledWith(hooks.codex)
    expect(reconcileStartupManagedAgentHooks).toHaveBeenCalledWith(hooks.managed)
  })

  it("never writes prod's ~/.codex hook entries or ~/.orca/agent-hooks from Orca Dev", async () => {
    const { startDesktopAgentHooks } = await import('./desktop-agent-hooks-startup')
    startDesktopAgentHooks(hooks, true)
    expect(startCodexHooks).not.toHaveBeenCalled()
    expect(reconcileStartupManagedAgentHooks).not.toHaveBeenCalled()
  })
})

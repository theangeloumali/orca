import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentHookInstallStatus } from '../../../shared/agent-hook-listener/configuration/agent-hook-types'

const writers = vi.hoisted(() => {
  const status = (managedHooksPresent: boolean): AgentHookInstallStatus => ({
    agent: 'claude',
    state: managedHooksPresent ? 'installed' : 'not_installed',
    configPath: '/home/.claude/settings.json',
    managedHooksPresent,
    detail: null
  })
  return {
    install: vi.fn(async () => status(true)),
    refresh: vi.fn(async () => {}),
    remove: vi.fn(async () => status(false))
  }
})

vi.mock('./managed-agent-hook-registry', () => ({
  MANAGED_AGENT_HOOK_INSTALLERS: [['claude', writers.install]],
  MANAGED_AGENT_HOOK_SCRIPT_REFRESHERS: [['claude', writers.refresh]],
  MANAGED_AGENT_HOOK_REMOVERS: [['claude', writers.remove]],
  MANAGED_AGENT_HOOK_ASYNC_REMOVERS: [['claude', writers.remove]],
  MANAGED_AGENT_HOOK_STATUS_READERS: []
}))
vi.mock('./local-agent-cli-presence', () => ({
  detectLocalManagedAgentCliPresence: async () => ({ claude: { state: 'found' } })
}))
vi.mock('../../claude/cli-capabilities/claude-hook-event-versions', () => ({
  probeClaudeCliVersion: async () => null
}))

async function loadControls(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  return await import('./managed-agent-hook-controls')
}

describe('managed agent hook controls in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('a Settings toggle on or off in Orca Dev writes no agent hooks', async () => {
    const controls = await loadControls(true)

    const statuses = [
      ...(await controls.applyAgentStatusHooksEnabled(true, null, { userInitiated: true })),
      ...(await controls.applyAgentStatusHooksEnabled(false)),
      ...(await controls.removeManagedAgentHooksAsync({ agents: ['claude'] }))
    ]

    expect(writers.install).not.toHaveBeenCalled()
    expect(writers.refresh).not.toHaveBeenCalled()
    expect(writers.remove).not.toHaveBeenCalled()
    expect(statuses).toHaveLength(3)
    for (const status of statuses) {
      expect(status).toMatchObject({
        agent: 'claude',
        state: 'skipped',
        skipReason: 'hooks_disabled'
      })
    }
  })

  it('still installs and removes hooks in prod', async () => {
    const controls = await loadControls(false)

    await controls.applyAgentStatusHooksEnabled(true)
    await controls.applyAgentStatusHooksEnabled(false)

    expect(writers.refresh).toHaveBeenCalledOnce()
    expect(writers.install).toHaveBeenCalledOnce()
    expect(writers.remove).toHaveBeenCalledOnce()
  })
})

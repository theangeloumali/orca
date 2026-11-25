import type { SFTPWrapper } from 'ssh2'
import type * as ClaudeHookServiceModule from '../../claude/hook-service'
import { afterEach, describe, expect, it, vi } from 'vitest'

const installRemote = vi.hoisted(() =>
  vi.fn(async () => ({
    agent: 'claude',
    state: 'installed',
    configPath: '/guest/.claude/settings.json',
    managedHooksPresent: true
  }))
)

vi.mock('../../claude/hook-service', async (importOriginal) => ({
  ...(await importOriginal<typeof ClaudeHookServiceModule>()),
  claudeHookService: { installRemote }
}))

async function loadInstaller(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  return (await import('./remote-managed-hook-installers')).installRemoteManagedAgentHooks
}

describe('guest-home hook installs in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    installRemote.mockClear()
  })

  it("writes nothing into a guest home prod's hooks also live in", async () => {
    const install = await loadInstaller(true)
    const sftp: SFTPWrapper = Object.create(null)

    const statuses = await install(sftp, '/guest', { agents: ['claude'] })

    expect(installRemote).not.toHaveBeenCalled()
    expect(statuses).toEqual([expect.objectContaining({ agent: 'claude', state: 'skipped' })])
  })

  it('still installs them in prod', async () => {
    const install = await loadInstaller(false)
    const sftp: SFTPWrapper = Object.create(null)

    await install(sftp, '/guest', { agents: ['claude'] })

    expect(installRemote).toHaveBeenCalledOnce()
  })
})

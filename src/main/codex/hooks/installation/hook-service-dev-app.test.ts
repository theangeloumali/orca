import type { SFTPWrapper } from 'ssh2'
import { afterEach, describe, expect, it, vi } from 'vitest'

const written = vi.hoisted(() => {
  const calls: string[] = []
  return calls
})

// Every real method would write ~/.codex, the managed homes or their trust config.
vi.mock('./codex-hook-service-implementation', () => {
  const installed = (name: string) => {
    written.push(name)
    return { agent: 'codex', state: 'installed', configPath: '', managedHooksPresent: true }
  }
  class CodexHookService {
    async refreshManagedScripts() {
      written.push('refreshManagedScripts')
    }
    async installForRuntimeHome() {
      return installed('installForRuntimeHome')
    }
    async installForRuntimeHomeSerialized() {
      return installed('installForRuntimeHomeSerialized')
    }
    async prepareRuntimeHomeForLaunch() {
      return installed('prepareRuntimeHomeForLaunch')
    }
    refreshRuntimeUserHooksForRuntimeHome() {
      return installed('refreshRuntimeUserHooksForRuntimeHome')
    }
    async reconcileHooks() {
      return installed('reconcileHooks')
    }
    async install() {
      return installed('install')
    }
    async installForLaunchPrep() {
      return installed('installForLaunchPrep')
    }
    async refreshRuntimeUserHooksForLaunchPrep() {
      return installed('refreshRuntimeUserHooksForLaunchPrep')
    }
    async installRemote() {
      return installed('installRemote')
    }
    async refreshRuntimeUserHooks() {
      return installed('refreshRuntimeUserHooks')
    }
    async remove() {
      return installed('remove')
    }
  }
  return { CodexHookService }
})

async function loadService(devApp: boolean) {
  vi.stubGlobal('ORCA_FORK_DEV_APP', devApp)
  vi.resetModules()
  return (await import('./hook-service')).codexHookService
}

describe('Codex hook service in Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    written.splice(0)
  })

  it('a Codex hook toggle or launch in Orca Dev writes no Codex hooks', async () => {
    const service = await loadService(true)
    const sftp: SFTPWrapper = Object.create(null)
    const home = '/home/.codex-runtime'

    const results = [
      await service.installForRuntimeHome(home),
      await service.installForRuntimeHomeSerialized(home),
      await service.prepareRuntimeHomeForLaunch(home, undefined, () => true, true),
      service.refreshRuntimeUserHooksForRuntimeHome(home),
      await service.reconcileHooks(),
      await service.install(home),
      await service.installForLaunchPrep(home, true, () => true),
      await service.refreshRuntimeUserHooksForLaunchPrep(home),
      await service.installRemote(sftp, '/remote-home'),
      await service.refreshRuntimeUserHooks(home),
      await service.remove()
    ]
    await service.refreshManagedScripts()

    expect(written).toEqual([])
    for (const result of results) {
      if (result !== null) {
        expect(result).toMatchObject({
          agent: 'codex',
          state: 'skipped',
          skipReason: 'hooks_disabled'
        })
      }
    }
  })

  it("still mirrors the launch config into Orca Dev's own Codex home", async () => {
    const service = await loadService(true)
    const configPreparation = {
      run: vi.fn(() => true),
      complete: vi.fn(),
      pendingMirror: () => null,
      settle: () => {}
    }

    await service.installForLaunchPrep('/home/.codex-runtime', true, () => true, configPreparation)

    expect(configPreparation.run).toHaveBeenCalledOnce()
    expect(configPreparation.complete).toHaveBeenCalledOnce()
    expect(written).toEqual([])
  })

  it('still writes Codex hooks in prod', async () => {
    const service = await loadService(false)
    await service.reconcileHooks()
    expect(written).toEqual(['reconcileHooks'])
  })
})

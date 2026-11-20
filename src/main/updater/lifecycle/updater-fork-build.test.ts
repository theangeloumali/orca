import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PrereleaseFeed from '../releases/updater-prerelease-feed'
import { UpdaterSetup } from './updater-setup'

const { autoUpdater, nativeUpdater, prepareRendererForUpdate, hasInProcessTerminalSessions } =
  await vi.hoisted(async () => {
    const { EventEmitter } = await import('node:events')
    return {
      autoUpdater: Object.assign(new EventEmitter(), {
        setFeedURL: vi.fn(),
        checkForUpdates: vi.fn<() => Promise<unknown>>(),
        downloadUpdate: vi.fn(async () => []),
        quitAndInstall: vi.fn()
      }),
      nativeUpdater: new EventEmitter(),
      prepareRendererForUpdate: vi.fn<() => Promise<(() => void) | null>>(),
      hasInProcessTerminalSessions: vi.fn<() => boolean>()
    }
  })

vi.mock('electron', () => ({
  app: Object.assign(new EventEmitter(), { isPackaged: true, getVersion: () => '1.0.0' }),
  autoUpdater: nativeUpdater,
  powerMonitor: new EventEmitter()
}))
vi.mock('../electron-updater-loader', () => ({ loadElectronAutoUpdater: () => autoUpdater }))
vi.mock('../mac-install/macos-shipit-scheduling', () => ({ configureMacShipItScheduling: vi.fn() }))
vi.mock('../mac-install/shipit-leftover-recovery', () => ({
  prepareThisProcessShipItStaging: () => null
}))
vi.mock('../linux-package/linux-update-package-type', () => ({
  getLinuxPackageType: () => 'non-root',
  getLinuxRootPackageType: () => null,
  isExternallyManagedLinuxInstall: () => false
}))
vi.mock('../nudges/nudge-campaign', () => ({ fetchNudge: async () => null }))
vi.mock('../releases/updater-prerelease-feed', async (original) => ({
  ...(await original<typeof PrereleaseFeed>()),
  fetchNewerReleaseTagsWithReadiness: async () => ({ state: 'ready', tags: ['v1.1.0'] })
}))
vi.mock('../mac-install/macos-update-running-instances', () => ({
  getMacUpdateRunningInstances: async () => []
}))
vi.mock('./serve-supervisor-install-park', () => ({
  parkServeSupervisorsForInstall: async () => ({ kind: 'parked' }),
  commitServeSupervisorPark: async () => {},
  releaseServeSupervisorPark: async () => {}
}))
vi.mock('../../ipc/pty/provider/kill-all', () => ({ hasInProcessTerminalSessions }))
vi.mock('../releases/updater-changelog', () => ({ fetchChangelog: async () => null }))
vi.mock('../../window/renderer-relays/native-unload-coordinator', () => ({
  prepareRendererForUpdate
}))
vi.mock('./updater-installer-session-release', () => ({ releaseSessionsForInstaller: () => 0 }))
vi.mock('../updater-lifecycle-diagnostics', () => ({ recordUpdaterLifecycle: vi.fn() }))
vi.mock('../../cli/appimage/appimage-copy-pre-extraction', () => ({
  preExtractDownloadedAppImageUpdate: async () => false
}))

vi.mock('../fork-build-updates', () => ({ OFFICIAL_UPDATES_DISABLED: true }))

// Fork builds are unsigned, so an official update would replace them with stock Orca.
describe('fork release builds', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    autoUpdater.removeAllListeners()
    autoUpdater.checkForUpdates.mockReset().mockResolvedValue(null)
    hasInProcessTerminalSessions.mockReset().mockReturnValue(false)
    prepareRendererForUpdate.mockReset().mockResolvedValue(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('never checks the official feed in the background', async () => {
    const updater = new UpdaterSetup()
    updater.setupAutoUpdater(null, {
      getAutomaticUpdates: () => true,
      getLastUpdateCheckAt: () => 0
    })
    updater.checkForUpdates()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('answers a menu check with "no update" instead of checking the official feed', async () => {
    const updater = new UpdaterSetup()
    updater.setupAutoUpdater(null, {
      getAutomaticUpdates: () => false,
      getLastUpdateCheckAt: Date.now
    })
    updater.checkForUpdatesFromMenu()
    await vi.advanceTimersByTimeAsync(0)
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
    expect(updater.getUpdateStatus()).toEqual({ state: 'not-available', userInitiated: true })
  })
})

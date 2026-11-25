import { EventEmitter } from 'node:events'
import { BrowserWindow } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PrereleaseFeed from '../releases/updater-prerelease-feed'
import type { TeamUpdatePolicy } from '../releases/updater-release-policy'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import * as updaterService from '../updater-service'
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

const { forkUpdater, forkPublish } = vi.hoisted(() => ({
  forkUpdater: {
    check: vi.fn(async () => {}),
    download: vi.fn(async () => {}),
    install: vi.fn(async () => true),
    markLaunched: vi.fn(async () => {})
  },
  forkPublish: { current: (_status: UpdateStatus): void => {} }
}))

const WINDOWS_INSTALL_DIRECTORY = 'C:\\Users\\me\\AppData\\Local\\Programs\\Orca'

vi.mock('electron', () => ({
  app: Object.assign(new EventEmitter(), { isPackaged: true, getVersion: () => '1.0.0' }),
  autoUpdater: nativeUpdater,
  powerMonitor: new EventEmitter(),
  BrowserWindow: class {
    isDestroyed = (): boolean => false
    webContents = { isDestroyed: (): boolean => false, send: vi.fn() }
  }
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
vi.mock('../fork/create-fork-updater', () => ({
  createForkUpdater: (args: { publish: (status: UpdateStatus) => void }) => {
    forkPublish.current = args.publish
    return forkUpdater
  },
  startForkUpdateChecks: vi.fn()
}))
vi.mock('../../orca-profiles/cloud-auth/desktop-client-report', () => ({
  setDesktopReportUpdateStatus: vi.fn()
}))
vi.mock('./windows-update-install-directory', () => ({
  resolveWindowsUpdateInstallDirectory: () => WINDOWS_INSTALL_DIRECTORY
}))

class CheckCountingUpdater extends UpdaterSetup {
  backgroundChecks = 0

  protected override runBackgroundUpdateCheck(nudgeId?: string | null): boolean {
    this.backgroundChecks += 1
    return super.runBackgroundUpdateCheck(nudgeId)
  }
}

// Fork builds are unsigned, so an official update would replace them with stock Orca.
describe('fork release builds', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    autoUpdater.removeAllListeners()
    autoUpdater.checkForUpdates.mockReset().mockResolvedValue(null)
    autoUpdater.setFeedURL.mockReset()
    autoUpdater.downloadUpdate.mockClear()
    autoUpdater.quitAndInstall.mockReset()
    vi.clearAllMocks()
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

  it('stops re-arming checks after a team-policy change', async () => {
    let policy: TeamUpdatePolicy | undefined
    let policyChanged = (): void => {}
    const updater = new CheckCountingUpdater()
    updater.setupAutoUpdater(null, {
      getLastUpdateCheckAt: Date.now,
      getTeamUpdatePolicy: () => policy,
      onTeamUpdatePolicyChanged: (listener) => {
        policyChanged = listener
      }
    })
    policy = { orgIds: ['org-1'], minimumVersion: '0.9.0' }
    policyChanged()
    const checksAfterChange = updater.backgroundChecks
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    // One follow-up retry is fine; the bug retried every 15s forever.
    expect(updater.backgroundChecks - checksAfterChange).toBeLessThanOrEqual(1)
  })

  it('never points the native updater at the official release feed', () => {
    new UpdaterSetup().setupAutoUpdater(null, { getLastUpdateCheckAt: Date.now })
    expect(autoUpdater.setFeedURL).not.toHaveBeenCalled()
  })

  it('remembers the Windows install folder resolved at setup', () => {
    const updater = new UpdaterSetup()
    updater.setupAutoUpdater(null, { getLastUpdateCheckAt: Date.now })
    expect(updater.getWindowsInstallDirectory()).toBe(WINDOWS_INSTALL_DIRECTORY)
  })

  it('tells the window when a fork install did not start', () => {
    const mainWindow = new BrowserWindow()
    const updater = new UpdaterSetup()
    updater.setupAutoUpdater(null, {
      getMainWindow: () => mainWindow,
      getLastUpdateCheckAt: Date.now
    })
    updater.notifyQuitAndInstallAborted()
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('updater:quitAndInstallAborted')
  })
})

// A paired client drives this host's updater; on a fork build that must stay the fork updater.
describe('paired-client updates on a fork build', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    updaterService.setupAutoUpdater(new BrowserWindow(), { getLastUpdateCheckAt: Date.now })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("downloads a paired client's update through the fork updater", async () => {
    forkPublish.current({ state: 'available', version: '1.1.0', changelog: null })
    updaterService.downloadRemoteServerUpdate('runtime-1')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(forkUpdater.download).toHaveBeenCalledOnce()
    expect(autoUpdater.downloadUpdate).not.toHaveBeenCalled()
  })

  it("installs a paired client's update through the fork updater, never the native one", async () => {
    forkPublish.current({ state: 'downloaded', version: '1.1.0' })
    const result = updaterService.installRemoteServerUpdate('runtime-1')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(result).toMatchObject({ accepted: true, targetVersion: '1.1.0' })
    expect(forkUpdater.install).toHaveBeenCalledOnce()
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })
})

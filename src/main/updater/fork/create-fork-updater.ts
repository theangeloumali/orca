import { app, net } from 'electron'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { constants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { runProcess } from '@orca/process-host'
import { spawnDetachedWithoutInheritance } from '@orca/process-host/isolated-detached-spawn'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { FORK_RELEASE_TAG } from '../fork-build-updates'
import { ForkUpdater } from './fork-updater'

// The fork's release job runs every 4 hours, so checking more often finds nothing new.
const FORK_UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const FORK_UPDATE_FIRST_CHECK_DELAY_MS = 60 * 1000

export function createForkUpdater(args: {
  publish: (status: UpdateStatus) => void
  automaticDownloads: () => boolean
  /** The running Windows install folder, resolved once by the updater at setup. */
  windowsInstallDirectory: () => string | undefined
  beforeQuit: () => Promise<void>
}): ForkUpdater {
  const exePath = app.getPath('exe')
  // One folder per profile, so two running profiles never wipe each other's staged update.
  const profileKey = createHash('sha1').update(app.getPath('userData')).digest('hex').slice(0, 8)
  return new ForkUpdater({
    currentTag: FORK_RELEASE_TAG,
    platform: process.platform,
    // .../Orca.app/Contents/MacOS/Orca → .../Orca.app
    appPath: dirname(dirname(dirname(exePath))),
    windowsInstallDirectory: args.windowsInstallDirectory,
    workDir: join(app.getPath('temp'), `orca-fork-update-${profileKey}`),
    pid: process.pid,
    fetch: (url, init) => net.fetch(url, init),
    automaticDownloads: args.automaticDownloads,
    checkAppReplaceable: async (appPath) => {
      if (!app.isPackaged || !appPath.endsWith('.app') || appPath.includes('/AppTranslocation/')) {
        return 'Move Orca to the Applications folder to update it automatically.'
      }
      try {
        await access(dirname(appPath), constants.W_OK)
        return null
      } catch {
        return `Orca cannot write to ${dirname(appPath)} to update itself.`
      }
    },
    extractMacApp: async (zipPath, destination) => {
      await mkdir(destination, { recursive: true })
      const unzip = await runProcess({
        program: '/usr/bin/ditto',
        args: ['-x', '-k', zipPath, destination],
        timeoutMs: 5 * 60 * 1000
      })
      if (unzip.code !== 0) {
        throw new Error(`Could not unpack the update: ${unzip.stderr.trim() || String(unzip.code)}`)
      }
      return join(destination, 'Orca.app')
    },
    spawnDetached: async (command, commandArgs) => {
      const child = spawnDetachedWithoutInheritance({ program: command, args: commandArgs })
      child.unref()
      // Quit only once it has started; a refused launch rejects instead.
      await once(child, 'spawn')
    },
    beforeQuit: args.beforeQuit,
    onAppExit: (listener) => {
      process.once('exit', listener)
      return () => process.removeListener('exit', listener)
    },
    quit: () => app.quit(),
    publish: args.publish
  })
}

let checksStarted = false

/** Background checks, started once per process: shortly after launch, then each release cadence. */
export function startForkUpdateChecks(forkUpdater: ForkUpdater): void {
  if (checksStarted) {
    return
  }
  checksStarted = true
  const checkThenReschedule = (): void => {
    void forkUpdater
      .check(false)
      .finally(() => setTimeout(checkThenReschedule, FORK_UPDATE_CHECK_INTERVAL_MS).unref())
  }
  setTimeout(checkThenReschedule, FORK_UPDATE_FIRST_CHECK_DELAY_MS).unref()
}

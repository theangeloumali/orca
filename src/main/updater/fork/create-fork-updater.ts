import { app, net } from 'electron'
import { runProcess, spawnProcess } from '@orca/process-host'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { FORK_RELEASE_TAG } from '../fork-build-updates'
import { ForkUpdater } from './fork-updater'

// The fork's release job runs every 4 hours, so checking more often finds nothing new.
const FORK_UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const FORK_UPDATE_FIRST_CHECK_DELAY_MS = 60 * 1000

export function createForkUpdater(publish: (status: UpdateStatus) => void): ForkUpdater {
  return new ForkUpdater({
    currentTag: FORK_RELEASE_TAG,
    platform: process.platform,
    // .../Orca.app/Contents/MacOS/Orca → .../Orca.app
    appPath: dirname(dirname(dirname(app.getPath('exe')))),
    workDir: join(app.getPath('temp'), 'orca-fork-update'),
    pid: process.pid,
    fetch: (url, init) => net.fetch(url, init),
    extractMacApp: async (zipPath, destination) => {
      await mkdir(destination, { recursive: true })
      const unzip = await runProcess({
        program: '/usr/bin/ditto',
        args: ['-x', '-k', zipPath, destination],
        timeoutMs: 5 * 60 * 1000
      })
      if (unzip.code !== 0) {
        throw new Error(`Could not unpack the update: ${unzip.stderr.trim() || unzip.code}`)
      }
      return join(destination, 'Orca.app')
    },
    spawnDetached: (command, args) => {
      spawnProcess({ program: command, args, detached: true, stdio: 'ignore' }).unref()
    },
    quit: () => app.quit(),
    publish
  })
}

/** Background checks: one shortly after launch, then one per release cadence after each finishes. */
export function startForkUpdateChecks(forkUpdater: ForkUpdater): void {
  const checkThenReschedule = (): void => {
    void forkUpdater
      .check(false)
      .finally(() => setTimeout(checkThenReschedule, FORK_UPDATE_CHECK_INTERVAL_MS).unref())
  }
  setTimeout(checkThenReschedule, FORK_UPDATE_FIRST_CHECK_DELAY_MS).unref()
}

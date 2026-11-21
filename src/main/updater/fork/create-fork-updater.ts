import { app, net } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { FORK_RELEASE_TAG } from '../fork-build-updates'
import { ForkUpdater } from './fork-updater'

const execFileAsync = promisify(execFile)
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
      await execFileAsync('ditto', ['-x', '-k', zipPath, destination])
      return join(destination, 'Orca.app')
    },
    spawnDetached: (command, args) => {
      spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
    },
    quit: () => app.quit(),
    publish
  })
}

/** Background checks: one shortly after launch, then every release cadence. */
export function startForkUpdateChecks(forkUpdater: ForkUpdater): void {
  setTimeout(() => void forkUpdater.check(false), FORK_UPDATE_FIRST_CHECK_DELAY_MS)
  setInterval(() => void forkUpdater.check(false), FORK_UPDATE_CHECK_INTERVAL_MS)
}

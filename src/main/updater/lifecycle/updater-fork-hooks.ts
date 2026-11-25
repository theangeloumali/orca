import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { UpdaterDownloadInstall } from './updater-download-install'
import { resolveWindowsUpdateInstallDirectory } from './windows-update-install-directory'

type ForkRemoteUpdateRoutes = { download: () => void; install: () => void }

// The seams the fork's own updater (../fork) drives; kept out of updater-setup.ts so upstream syncs merge cleanly.
export abstract class UpdaterForkHooks extends UpdaterDownloadInstall {
  protected windowsInstallDirectory: string | undefined
  private forkRemoteUpdateRoutes: ForkRemoteUpdateRoutes | undefined

  /** Sends paired clients' download and install requests to the fork updater. */
  routeRemoteUpdatesToFork(routes: ForkRemoteUpdateRoutes): void {
    this.forkRemoteUpdateRoutes = routes
  }

  protected override startRemoteDownload(): void {
    if (this.forkRemoteUpdateRoutes) {
      this.forkRemoteUpdateRoutes.download()
      return
    }
    super.startRemoteDownload()
  }

  protected override startRemoteInstall(): void {
    if (this.forkRemoteUpdateRoutes) {
      this.forkRemoteUpdateRoutes.install()
      return
    }
    super.startRemoteInstall()
  }

  /** Resolves the running Windows install folder at setup and keeps it for the fork updater. */
  protected rememberWindowsInstallDirectory(): string | undefined {
    this.windowsInstallDirectory = resolveWindowsUpdateInstallDirectory(
      process.platform,
      process.execPath
    )
    return this.windowsInstallDirectory
  }

  /** Lets the fork updater drive the same status the update UI already renders. */
  publishExternalStatus(status: UpdateStatus): void {
    this.sendStatus(status, { force: true })
  }

  /** The running Windows install folder found at setup, for installers that must update it in place. */
  getWindowsInstallDirectory(): string | undefined {
    return this.windowsInstallDirectory
  }

  /** The same pre-quit cleanup an official update runs, for the fork updater. */
  async runForkPreInstallCleanup(): Promise<void> {
    await this.runBeforeUpdateQuitCleanup()
  }

  /** Tells a window waiting to restart for an update that the install did not start. */
  notifyQuitAndInstallAborted(): void {
    this.sendToMainWindow('updater:quitAndInstallAborted')
  }
}

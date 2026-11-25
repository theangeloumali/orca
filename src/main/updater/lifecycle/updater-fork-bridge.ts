import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import { UpdaterDownloadInstall } from './updater-download-install'

/** Hooks the fork updater uses to reuse the official update UI and install path. */
export class UpdaterForkBridge extends UpdaterDownloadInstall {
  private windowsInstallDirectory: string | undefined

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

  protected rememberWindowsInstallDirectory(directory: string | undefined): string | undefined {
    this.windowsInstallDirectory = directory
    return directory
  }
}

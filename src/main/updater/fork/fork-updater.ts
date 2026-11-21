import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { UpdateStatus } from '../../../shared/updater/update-status-types'
import {
  FORK_RELEASE_CHECKSUMS_ASSET,
  isNewerForkRelease,
  parseSha512Sums,
  pickForkReleaseAsset,
  type ForkReleaseAsset
} from './fork-release'
import { buildMacSwapScript } from './fork-mac-swap-script'

const LATEST_RELEASE_URL = 'https://api.github.com/repos/theangeloumali/orca/releases/latest'
// Only the fork's own release downloads are trusted; anything else is refused before fetching.
const RELEASE_DOWNLOAD_PREFIX = 'https://github.com/theangeloumali/orca/releases/download/'
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_IDLE_TIMEOUT_MS = 60_000
// A quit still not done after this was cancelled; the update stays ready to retry.
const QUIT_CANCELLED_AFTER_MS = 60_000

export type ForkUpdaterDeps = {
  /** This build's fork release tag; null for dev and local builds, which never update. */
  currentTag: string | null
  platform: NodeJS.Platform
  /** The installed .app bundle (macOS). */
  appPath: string
  /** The running install folder to pass the Windows installer as /D=, when it is not the default. */
  windowsInstallDirectory: () => string | undefined
  workDir: string
  pid: number
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  /** Whether a background check may download (the Automatic updates setting). */
  automaticDownloads: () => boolean
  /** Why this app cannot replace itself (not in a writable folder, translocated), or null. */
  checkAppReplaceable: (appPath: string) => Promise<string | null>
  /** Unzips the downloaded app and returns the staged .app path. */
  extractMacApp: (zipPath: string, destination: string) => Promise<string>
  /** Resolves once the detached process has started. */
  spawnDetached: (command: string, args: string[]) => Promise<void>
  /** Runs `listener` once quitting can no longer be cancelled; returns an unsubscribe. */
  onWillQuit: (listener: () => void) => () => void
  quit: () => void
  publish: (status: UpdateStatus) => void
}

type FoundRelease = {
  tag: string
  version: string
  installer: ForkReleaseAsset
  checksums: ForkReleaseAsset
}
type Prepared = FoundRelease & { installerPath: string; sha512: string }

/** Updates a fork build from the fork's own GitHub releases (unsigned builds cannot use Squirrel). */
export class ForkUpdater {
  private busy = false
  private installing = false
  private found: FoundRelease | null = null
  private prepared: Prepared | null = null

  constructor(private readonly deps: ForkUpdaterDeps) {}

  async check(userInitiated: boolean): Promise<void> {
    if (this.busy || this.installing) {
      return
    }
    this.busy = true
    let announced = false
    try {
      if (userInitiated) {
        this.deps.publish({ state: 'checking', userInitiated })
      }
      const release = await this.fetchLatestRelease()
      if (this.prepared?.tag === release.tag) {
        this.deps.publish({ state: 'downloaded', version: this.prepared.version })
        return
      }
      if (!isNewerForkRelease(this.deps.currentTag, release.tag)) {
        this.deps.publish({ state: 'not-available', userInitiated })
        return
      }
      this.found = release
      this.deps.publish({ state: 'available', version: release.version, changelog: null })
      announced = true
      if (userInitiated || this.deps.automaticDownloads()) {
        await this.prepare(release)
      }
    } catch (error) {
      // A background check that found nothing stays silent; one that announced an update reports.
      if (userInitiated || announced) {
        this.publishError(error, userInitiated)
      } else {
        console.warn('[fork-updater] background check failed:', error)
      }
    } finally {
      this.busy = false
    }
  }

  /** Downloads the release a check found (the Download button), or checks again. */
  async download(): Promise<void> {
    const found = this.found
    if (!found || this.busy || this.installing) {
      await this.check(true)
      return
    }
    this.busy = true
    try {
      await this.prepare(found)
    } catch (error) {
      this.publishError(error, true)
    } finally {
      this.busy = false
    }
  }

  /** Quits Orca and hands the verified build to a step that outlives it; false when nothing started. */
  async install(): Promise<boolean> {
    const prepared = this.prepared
    if (!prepared || this.installing || this.busy) {
      return false
    }
    this.installing = true
    try {
      // The download can sit in the temp folder for days; check it again right before using it.
      if ((await sha512OfFile(prepared.installerPath)) !== prepared.sha512) {
        this.prepared = null
        throw new Error('The downloaded update changed on disk; check for updates again')
      }
      if (this.deps.platform === 'win32') {
        const args = ['--updated', '/S', '--force-run']
        const installDirectory = this.deps.windowsInstallDirectory()
        if (installDirectory) {
          args.push(`/D=${installDirectory}`)
        }
        // The installer replaces running files, so start it only once the quit is committed.
        const unsubscribe = this.deps.onWillQuit(() => {
          void this.deps.spawnDetached(prepared.installerPath, args).catch((error: unknown) => {
            console.error('[fork-updater] could not start the installer:', error)
          })
        })
        this.quitOrResume(unsubscribe)
        return true
      }
      const reason = await this.deps.checkAppReplaceable(this.deps.appPath)
      if (reason) {
        throw new Error(reason)
      }
      const stagingDir = join(this.deps.workDir, 'staged')
      await rm(stagingDir, { recursive: true, force: true })
      const stagedAppPath = await this.deps.extractMacApp(prepared.installerPath, stagingDir)
      const scriptPath = join(this.deps.workDir, 'swap.sh')
      await writeFile(
        scriptPath,
        buildMacSwapScript({ pid: this.deps.pid, appPath: this.deps.appPath, stagedAppPath }),
        { mode: 0o700 }
      )
      // The swap waits for Orca's process to exit, so it can start before quitting.
      await this.deps.spawnDetached('/bin/sh', [scriptPath])
      this.quitOrResume(() => {})
      return true
    } catch (error) {
      this.installing = false
      this.publishError(error, true)
      return false
    }
  }

  private quitOrResume(unsubscribe: () => void): void {
    this.deps.quit()
    setTimeout(() => {
      unsubscribe()
      this.installing = false
      if (this.prepared) {
        this.deps.publish({ state: 'downloaded', version: this.prepared.version })
      }
    }, QUIT_CANCELLED_AFTER_MS).unref?.()
  }

  private async prepare(release: FoundRelease): Promise<void> {
    const expected = parseSha512Sums(await (await this.fetchOk(release.checksums.url)).text()).get(
      release.installer.name
    )
    if (!expected) {
      throw new Error(`Fork release ${release.tag} lists no checksum for ${release.installer.name}`)
    }
    await rm(this.deps.workDir, { recursive: true, force: true })
    await mkdir(this.deps.workDir, { recursive: true })
    // A fixed name, never the remote asset name.
    const installerPath = join(
      this.deps.workDir,
      this.deps.platform === 'win32' ? 'orca-windows-setup.exe' : 'update.zip'
    )
    await this.downloadTo(release, installerPath)
    const sha512 = await sha512OfFile(installerPath)
    if (sha512 !== expected) {
      throw new Error(
        `The downloaded ${release.installer.name} does not match its published checksum`
      )
    }
    this.prepared = { ...release, installerPath, sha512 }
    this.deps.publish({ state: 'downloaded', version: release.version })
  }

  private async downloadTo(release: FoundRelease, path: string): Promise<void> {
    const response = await this.deps.fetch(release.installer.url)
    if (!response.ok || !response.body) {
      throw new Error(`Download failed (${response.status})`)
    }
    const total = Number(response.headers.get('content-length')) || release.installer.size
    const reader = response.body.getReader()
    const output = await open(path, 'w')
    let received = 0
    let lastPercent = -1
    try {
      for (let chunk = await readWithin(reader); !chunk.done; chunk = await readWithin(reader)) {
        await output.write(chunk.value)
        received += chunk.value.byteLength
        const percent = total > 0 ? Math.min(100, Math.floor((received / total) * 100)) : 0
        if (percent !== lastPercent) {
          lastPercent = percent
          this.deps.publish({ state: 'downloading', percent, version: release.version })
        }
      }
    } finally {
      await output.close()
    }
  }

  private async fetchLatestRelease(): Promise<FoundRelease> {
    const response = await this.fetchOk(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    const body: unknown = await response.json()
    if (!isGitHubRelease(body)) {
      throw new Error("The fork's latest release could not be read")
    }
    const assets = body.assets.map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size
    }))
    const installer = pickForkReleaseAsset(assets, this.deps.platform)
    const checksums = assets.find((asset) => asset.name === FORK_RELEASE_CHECKSUMS_ASSET)
    if (!installer || !checksums) {
      throw new Error(`Fork release ${body.tag_name} has no installer for this machine`)
    }
    for (const asset of [installer, checksums]) {
      if (!asset.url.startsWith(RELEASE_DOWNLOAD_PREFIX)) {
        throw new Error(`Refusing an update file hosted outside the fork's releases: ${asset.url}`)
      }
    }
    // The full tag is the version: rebuilds of one Orca version stay distinct when dismissed.
    return { tag: body.tag_name, version: body.tag_name.replace(/^v/, ''), installer, checksums }
  }

  private async fetchOk(url: string, init: RequestInit = {}): Promise<Response> {
    const response = await this.deps.fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) {
      throw new Error(`Could not reach the fork's releases (${response.status})`)
    }
    return response
  }

  private publishError(error: unknown, userInitiated: boolean): void {
    this.deps.publish({
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
      userInitiated,
      retryable: true
    })
  }
}

type GitHubAsset = { name: string; browser_download_url: string; size: number }
type GitHubRelease = { tag_name: string; assets: GitHubAsset[] }

function isGitHubAsset(value: unknown): value is GitHubAsset {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'browser_download_url' in value &&
    typeof value.browser_download_url === 'string' &&
    'size' in value &&
    typeof value.size === 'number'
  )
}

function isGitHubRelease(value: unknown): value is GitHubRelease {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag_name' in value &&
    typeof value.tag_name === 'string' &&
    'assets' in value &&
    Array.isArray(value.assets) &&
    value.assets.every(isGitHubAsset)
  )
}

/** One read that fails if the connection goes quiet, so a stalled download cannot hang forever. */
function readWithin(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const stalled = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('The download stalled')), DOWNLOAD_IDLE_TIMEOUT_MS)
  })
  return Promise.race([reader.read(), stalled]).finally(() => clearTimeout(timer))
}

async function sha512OfFile(path: string): Promise<string> {
  const hash = createHash('sha512')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

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

export type ForkUpdaterDeps = {
  /** This build's fork release tag; null for dev and local builds, which never update. */
  currentTag: string | null
  platform: NodeJS.Platform
  /** The installed .app bundle (macOS). */
  appPath: string
  workDir: string
  pid: number
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  /** Unzips the downloaded app and returns the staged .app path. */
  extractMacApp: (zipPath: string, destination: string) => Promise<string>
  spawnDetached: (command: string, args: string[]) => void
  quit: () => void
  publish: (status: UpdateStatus) => void
}

type Prepared = { version: string; installerPath: string; stagedAppPath?: string }

/** Updates a fork build from the fork's own GitHub releases (unsigned builds cannot use Squirrel). */
export class ForkUpdater {
  private busy = false
  private prepared: Prepared | null = null

  constructor(private readonly deps: ForkUpdaterDeps) {}

  async check(userInitiated: boolean): Promise<void> {
    if (this.busy || this.prepared) {
      return
    }
    this.busy = true
    let version: string | undefined
    try {
      this.deps.publish({ state: 'checking', userInitiated })
      const release = await this.fetchLatestRelease()
      if (!isNewerForkRelease(this.deps.currentTag, release.tag_name)) {
        this.deps.publish({ state: 'not-available', userInitiated })
        return
      }
      version = release.tag_name.replace(/^v/, '').replace(/-angelo\.\d+$/, '')
      const assets = release.assets.map((asset) => ({
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size
      }))
      const installer = pickForkReleaseAsset(assets, this.deps.platform)
      const checksums = assets.find((asset) => asset.name === FORK_RELEASE_CHECKSUMS_ASSET)
      if (!installer || !checksums) {
        throw new Error(`Fork release ${release.tag_name} has no installer for this machine`)
      }
      this.deps.publish({ state: 'available', version, changelog: null })
      this.prepared = await this.download(version, installer, checksums)
      this.deps.publish({ state: 'downloaded', version })
    } catch (error) {
      this.deps.publish({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
        userInitiated,
        retryable: true,
        ...(version ? { version } : {})
      })
    } finally {
      this.busy = false
    }
  }

  /** Quits Orca and hands the downloaded build to a step that outlives it. */
  async install(): Promise<void> {
    const prepared = this.prepared
    if (!prepared) {
      return
    }
    if (this.deps.platform === 'win32') {
      // The same silent upgrade electron-updater runs; --force-run reopens Orca afterwards.
      this.deps.spawnDetached(prepared.installerPath, ['--updated', '/S', '--force-run'])
    } else if (prepared.stagedAppPath) {
      const scriptPath = join(this.deps.workDir, 'swap.sh')
      await writeFile(
        scriptPath,
        buildMacSwapScript({
          pid: this.deps.pid,
          appPath: this.deps.appPath,
          stagedAppPath: prepared.stagedAppPath
        }),
        { mode: 0o700 }
      )
      this.deps.spawnDetached('/bin/sh', [scriptPath])
    }
    this.deps.quit()
  }

  private async download(
    version: string,
    installer: ForkReleaseAsset,
    checksums: ForkReleaseAsset
  ): Promise<Prepared> {
    const expected = parseSha512Sums(await (await this.deps.fetch(checksums.url)).text()).get(
      installer.name
    )
    await rm(this.deps.workDir, { recursive: true, force: true })
    await mkdir(this.deps.workDir, { recursive: true })
    const installerPath = join(this.deps.workDir, installer.name)
    const response = await this.deps.fetch(installer.url)
    if (!response.ok || !response.body) {
      throw new Error(`Download failed (${response.status})`)
    }
    const total = Number(response.headers.get('content-length')) || installer.size
    let received = 0
    let lastPercent = -1
    const output = await open(installerPath, 'w')
    try {
      const reader = response.body.getReader()
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        await output.write(chunk.value)
        received += chunk.value.byteLength
        const percent = total > 0 ? Math.min(100, Math.floor((received / total) * 100)) : 0
        if (percent !== lastPercent) {
          lastPercent = percent
          this.deps.publish({ state: 'downloading', percent, version })
        }
      }
    } finally {
      await output.close()
    }
    if (!expected || (await sha512OfFile(installerPath)) !== expected) {
      throw new Error(`The downloaded ${installer.name} does not match its published checksum`)
    }
    if (this.deps.platform !== 'darwin') {
      return { version, installerPath }
    }
    const stagedAppPath = await this.deps.extractMacApp(
      installerPath,
      join(this.deps.workDir, 'staged')
    )
    return { version, installerPath, stagedAppPath }
  }

  private async fetchLatestRelease(): Promise<GitHubRelease> {
    const response = await this.deps.fetch(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!response.ok) {
      throw new Error(`Could not check the fork's releases (${response.status})`)
    }
    const body: unknown = await response.json()
    if (!isGitHubRelease(body)) {
      throw new Error("The fork's latest release could not be read")
    }
    return body
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

async function sha512OfFile(path: string): Promise<string> {
  const hash = createHash('sha512')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

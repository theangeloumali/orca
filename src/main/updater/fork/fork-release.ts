// Fork releases are tagged v<Orca version>-angelo.<workflow run>; the run orders rebuilds of one version.
const FORK_RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)-angelo\.(\d+)$/

export type ForkReleaseAsset = { name: string; url: string; size: number }

/** The checksum list each fork release carries (`shasum -a 512` output). */
export const FORK_RELEASE_CHECKSUMS_ASSET = 'fork-sha512sums.txt'

function parseForkReleaseTag(tag: string | null | undefined): number[] | null {
  const match = tag ? FORK_RELEASE_TAG.exec(tag) : null
  return match ? match.slice(1).map(Number) : null
}

/** Whether `latest` supersedes `current`; a build with no fork tag (dev, local) is never offered one. */
export function isNewerForkRelease(current: string | null | undefined, latest: string): boolean {
  const currentParts = parseForkReleaseTag(current)
  const latestParts = parseForkReleaseTag(latest)
  if (!currentParts || !latestParts) {
    return false
  }
  for (let index = 0; index < latestParts.length; index += 1) {
    if (latestParts[index] !== currentParts[index]) {
      return latestParts[index] > currentParts[index]
    }
  }
  return false
}

/** This machine's installer: the Apple Silicon zip on macOS, the NSIS setup on Windows. */
export function pickForkReleaseAsset(
  assets: readonly ForkReleaseAsset[],
  platform: NodeJS.Platform
): ForkReleaseAsset | null {
  const wanted =
    platform === 'darwin'
      ? (name: string) => /^Orca-.+-arm64-mac\.zip$/.test(name)
      : platform === 'win32'
        ? (name: string) => name === 'orca-windows-setup.exe'
        : null
  return wanted ? (assets.find((asset) => wanted(asset.name)) ?? null) : null
}

/** `shasum -a 512` lines ("<hex>  <name>", binary mode marks the name with *) by file name. */
export function parseSha512Sums(text: string): Map<string, string> {
  const sums = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = /^([0-9a-f]+)\s+\*?(.+)$/i.exec(line.trim())
    if (match) {
      sums.set(match[2], match[1].toLowerCase())
    }
  }
  return sums
}

type GitHubAsset = { name: string; browser_download_url: string; size: number }
export type GitHubRelease = { tag_name: string; assets: GitHubAsset[] }

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

/** A GitHub "latest release" body with the fields the updater reads. */
export function isGitHubRelease(value: unknown): value is GitHubRelease {
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

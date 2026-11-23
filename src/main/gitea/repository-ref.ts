import { createRemoteRefProbeCache } from '../git/remotes/remote-ref-probe-cache'
import { getPublicForgeProviderForHost } from '../../shared/git/remotes/public-forge-host'
import { lookUpSshConfigHostname, type SshHostnameContext } from './ssh-config-hostname'

export type GiteaRepoRef = {
  host: string
  owner: string
  repo: string
  apiBaseUrl: string
  webBaseUrl: string
  // The host an SSH or scp remote connects to; null for http(s). Its port is the SSH port, never the API's.
  sshHostname: string | null
}

type LocalGitExecOptions = {
  wslDistro?: string
}

const repoRefProbeCache = createRemoteRefProbeCache(parseGiteaRepoRef)

/** @internal - exposed for tests only */
export function _resetGiteaRepoRefCache(): void {
  repoRefProbeCache.clear()
}

/** @internal - exposed for tests only */
export function _getGiteaRepoRefCacheSize(): number {
  return repoRefProbeCache.size()
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parsePath(pathname: string): { owner: string; repo: string; basePath: string } | null {
  const withoutSuffix = pathname.replace(/\/+$/, '').replace(/\.git$/i, '')
  const parts = withoutSuffix
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) {
    return null
  }

  const owner = decodeSegment(parts.at(-2) ?? '')
  const repo = decodeSegment(parts.at(-1) ?? '')
  if (!owner || !repo) {
    return null
  }

  return {
    owner,
    repo,
    basePath: parts.slice(0, -2).join('/')
  }
}

function apiBaseUrlFromWebBase(webBaseUrl: string): string {
  return `${webBaseUrl.replace(/\/+$/, '')}/api/v1`
}

function makeRepoRef(
  host: string,
  path: string,
  webOrigin: string,
  isSshRemote: boolean
): GiteaRepoRef | null {
  const normalizedHost = host.toLowerCase()
  const owner = getPublicForgeProviderForHost(normalizedHost)
  if (!normalizedHost || (owner && owner !== 'gitea')) {
    return null
  }

  const parsed = parsePath(path)
  if (!parsed) {
    return null
  }

  // Self-hosted Gitea/Forgejo SSH paths can include the web/API base subpath.
  const webBaseUrl = parsed.basePath
    ? `${webOrigin.replace(/\/+$/, '')}/${parsed.basePath}`
    : webOrigin
  return {
    host: normalizedHost,
    owner: parsed.owner,
    repo: parsed.repo,
    apiBaseUrl: apiBaseUrlFromWebBase(webBaseUrl),
    webBaseUrl,
    sshHostname: isSshRemote ? normalizedHost : null
  }
}

export function parseGiteaRepoRef(remoteUrl: string): GiteaRepoRef | null {
  const trimmed = remoteUrl.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    const scpLike = trimmed.match(/^(?:[^@/:]+@)?([^:\s/]+):([^\s]+?)(?:\.git)?$/)
    if (scpLike) {
      const host = scpLike[1]
      const path = scpLike[2]
      return makeRepoRef(host, path, `https://${host.toLowerCase()}`, true)
    }
  }

  try {
    const url = new URL(trimmed)
    const protocol = url.protocol.toLowerCase()
    if (!['http:', 'https:', 'ssh:', 'git+ssh:'].includes(protocol)) {
      return null
    }

    const parsed = parsePath(url.pathname)
    if (!parsed) {
      return null
    }

    const isSshRemote = protocol !== 'http:' && protocol !== 'https:'
    const webOrigin = isSshRemote
      ? `https://${url.hostname.toLowerCase()}`
      : `${protocol}//${url.host}`
    return makeRepoRef(url.hostname, url.pathname, webOrigin, isSshRemote)
  } catch {
    return null
  }
}

// Git follows ~/.ssh/config Host aliases, so match the server by the HostName ssh -G reports.
export async function resolveGiteaSshHostname(
  repo: GiteaRepoRef,
  context: SshHostnameContext,
  resolveHostname: typeof lookUpSshConfigHostname = lookUpSshConfigHostname
): Promise<GiteaRepoRef> {
  if (repo.sshHostname === null) {
    return repo
  }
  try {
    const { hostname } = await resolveHostname(repo.sshHostname, context)
    return hostname ? { ...repo, sshHostname: hostname.toLowerCase() } : repo
  } catch {
    return repo
  }
}

export async function getGiteaRepoRefForRemote(
  repoPath: string,
  remoteName: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<GiteaRepoRef | null> {
  const repo = await repoRefProbeCache.get(repoPath, remoteName, connectionId, localGitOptions)
  return repo
    ? resolveGiteaSshHostname(repo, { connectionId, wslDistro: localGitOptions.wslDistro })
    : null
}

export async function getGiteaRepoRef(
  repoPath: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<GiteaRepoRef | null> {
  return getGiteaRepoRefForRemote(repoPath, 'origin', connectionId, localGitOptions)
}

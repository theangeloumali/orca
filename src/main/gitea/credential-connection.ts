import { fetchGiteaUserResult } from './user-request'
import { invalidateAllGiteaPullRequestScans } from './pull-request-scan-cache'
import { getEnvGiteaAuthConfig, hasEnvGiteaAuth, normalizeGiteaApiBaseUrl } from './resolve-auth'
import {
  clearStoredGiteaCredential,
  getGiteaCredentialProtection,
  getStoredGiteaCredentialError,
  getStoredGiteaMetadata,
  hasStoredGiteaCredential,
  isStoredGiteaCredentialChecked,
  saveGiteaCredential
} from './credential-store'
import {
  giteaConnectFailure,
  type GiteaConnectArgs,
  type GiteaConnectResult,
  type GiteaConnectionStatus
} from '../../shared/gitea/gitea-credentials'

const VERIFY_TIMEOUT_MS = 6000

// A token over plain http is readable on the network, so http is only for this machine.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function isAllowedTokenTransport(url: URL): boolean {
  return (
    url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTNAMES.has(url.hostname))
  )
}

function parseApiBaseUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  // Credentials, a query or a fragment in the saved URL would ride along on every request.
  if (url.username || url.password || url.search || url.hash || !isAllowedTokenTransport(url)) {
    return null
  }
  return normalizeGiteaApiBaseUrl(`${url.origin}${url.pathname}`)
}

// Saves only after the server accepts the token, so a failed connect leaves no file.
export async function connectGitea(input: GiteaConnectArgs): Promise<GiteaConnectResult> {
  const apiBaseUrl = parseApiBaseUrl(input.baseUrl)
  if (!apiBaseUrl) {
    return giteaConnectFailure('invalidBaseUrl')
  }
  const token = input.token.trim()
  if (!token) {
    return giteaConnectFailure('tokenRequired')
  }
  const result = await fetchGiteaUserResult(apiBaseUrl, token, VERIFY_TIMEOUT_MS)
  if (!result.ok) {
    return giteaConnectFailure(result.reason)
  }
  await saveGiteaCredential({ baseUrl: apiBaseUrl, token, account: result.account })
  // Listings fetched without this token, or with an older one, must not be reused.
  invalidateAllGiteaPullRequestScans()
  return { ok: true, account: result.account }
}

export async function disconnectGitea(): Promise<void> {
  try {
    await clearStoredGiteaCredential()
  } finally {
    // Even a partial clear must not leave private listings visible.
    invalidateAllGiteaPullRequestScans()
  }
}

// Status reads must avoid keychain prompts.
export async function getGiteaConnectionStatus(): Promise<GiteaConnectionStatus> {
  const env = getEnvGiteaAuthConfig()
  if (hasEnvGiteaAuth(env)) {
    return {
      configured: true,
      source: 'environment',
      credentialProtection: null,
      account: null,
      baseUrl: env.apiBaseUrl,
      credentialError: null,
      checkedSinceRestart: false
    }
  }
  const metadata = await getStoredGiteaMetadata()
  if (metadata && (await hasStoredGiteaCredential())) {
    return {
      configured: true,
      source: 'stored',
      credentialProtection: await getGiteaCredentialProtection(),
      account: metadata.account,
      baseUrl: metadata.baseUrl,
      credentialError: getStoredGiteaCredentialError(),
      checkedSinceRestart: isStoredGiteaCredentialChecked()
    }
  }
  return {
    configured: false,
    source: 'none',
    credentialProtection: null,
    account: null,
    baseUrl: null,
    credentialError: null,
    checkedSinceRestart: false
  }
}

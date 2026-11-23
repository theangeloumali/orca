import { fetchGiteaUserResult } from './user-request'
import { getEnvGiteaAuthConfig, hasEnvGiteaAuth, normalizeGiteaApiBaseUrl } from './resolve-auth'
import {
  clearStoredGiteaCredential,
  getGiteaCredentialProtection,
  getStoredGiteaMetadata,
  hasStoredGiteaCredential,
  saveGiteaCredential
} from './credential-store'
import {
  giteaConnectFailure,
  type GiteaConnectArgs,
  type GiteaConnectResult,
  type GiteaConnectionStatus
} from '../../shared/gitea/gitea-credentials'

const VERIFY_TIMEOUT_MS = 6000

function parseApiBaseUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const candidate = normalizeGiteaApiBaseUrl(trimmed)
  try {
    const { protocol } = new URL(candidate)
    return protocol === 'https:' || protocol === 'http:' ? candidate : null
  } catch {
    return null
  }
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
  return { ok: true, account: result.account }
}

export async function disconnectGitea(): Promise<void> {
  await clearStoredGiteaCredential()
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
      baseUrl: env.apiBaseUrl
    }
  }
  const metadata = await getStoredGiteaMetadata()
  if (metadata && (await hasStoredGiteaCredential())) {
    return {
      configured: true,
      source: 'stored',
      credentialProtection: await getGiteaCredentialProtection(),
      account: metadata.account,
      baseUrl: metadata.baseUrl
    }
  }
  return {
    configured: false,
    source: 'none',
    credentialProtection: null,
    account: null,
    baseUrl: null
  }
}

import { requestJsonAtBase } from './client'
import {
  getStoredGiteaMetadata,
  hasStoredGiteaCredential,
  loadStoredGiteaSecret
} from './credential-store'
import { getEnvGiteaAuthConfig, hasEnvGiteaAuth, type GiteaAuthConfig } from './resolve-auth'
import { fetchGiteaUserResult } from './user-request'

const PROBE_TIMEOUT_MS = 4000

export type GiteaAuthStatus = {
  configured: boolean
  authenticated: boolean
  account: string | null
  baseUrl: string | null
  tokenConfigured: boolean
}

async function environmentAuthStatus(config: GiteaAuthConfig): Promise<GiteaAuthStatus> {
  const tokenConfigured = config.token !== null
  if (!config.apiBaseUrl) {
    return { configured: true, authenticated: true, account: null, baseUrl: null, tokenConfigured }
  }
  if (!config.token) {
    const version = await requestJsonAtBase<{ version?: string }>(
      config.apiBaseUrl,
      null,
      '/version',
      { timeoutMs: PROBE_TIMEOUT_MS }
    )
    return {
      configured: version !== null,
      authenticated: false,
      account: null,
      baseUrl: config.apiBaseUrl,
      tokenConfigured
    }
  }
  const user = await fetchGiteaUserResult(config.apiBaseUrl, config.token, PROBE_TIMEOUT_MS)
  return {
    configured: true,
    authenticated: user.ok,
    account: user.ok ? user.account : null,
    baseUrl: config.apiBaseUrl,
    tokenConfigured
  }
}

async function storedAuthStatus(): Promise<GiteaAuthStatus> {
  const metadata = await getStoredGiteaMetadata()
  if (!metadata || !(await hasStoredGiteaCredential())) {
    return {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: null,
      tokenConfigured: false
    }
  }
  // Preflight must not prompt for the keychain: probe only a token already in memory.
  const secret = await loadStoredGiteaSecret()
  const user = secret
    ? await fetchGiteaUserResult(secret.baseUrl, secret.token, PROBE_TIMEOUT_MS)
    : null
  return {
    configured: true,
    authenticated: user?.ok ?? true,
    account: (user?.ok ? user.account : null) ?? metadata.account,
    baseUrl: metadata.baseUrl,
    tokenConfigured: true
  }
}

export function getGiteaAuthStatus(): Promise<GiteaAuthStatus> {
  const env = getEnvGiteaAuthConfig()
  return hasEnvGiteaAuth(env) ? environmentAuthStatus(env) : storedAuthStatus()
}

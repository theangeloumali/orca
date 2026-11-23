import {
  getStoredGiteaMetadata,
  hasStoredGiteaCredential,
  loadStoredGiteaSecret
} from './credential-store'
import type { GiteaRepoRef } from './repository-ref'

export type GiteaAuthConfig = {
  apiBaseUrl: string | null
  token: string | null
}

function envValue(name: string): string | null {
  const value = process.env[name]?.trim() ?? ''
  return value.length > 0 ? value : null
}

export function normalizeGiteaApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  return /\/api\/v1$/i.test(trimmed) ? trimmed : `${trimmed}/api/v1`
}

export function getEnvGiteaAuthConfig(): GiteaAuthConfig {
  const apiBaseUrl = envValue('ORCA_GITEA_API_BASE_URL')
  return {
    apiBaseUrl: apiBaseUrl ? normalizeGiteaApiBaseUrl(apiBaseUrl) : null,
    token: envValue('ORCA_GITEA_TOKEN')
  }
}

export function hasEnvGiteaAuth(config: GiteaAuthConfig): boolean {
  return config.apiBaseUrl !== null || config.token !== null
}

const NO_AUTH: GiteaAuthConfig = { apiBaseUrl: null, token: null }

type GiteaRepoServer = Pick<GiteaRepoRef, 'apiBaseUrl' | 'sshHostname'>

// URL.origin lowercases the host and drops default ports, so it compares scheme + host + port.
function urlPart(url: string, part: 'origin' | 'hostname'): string | null {
  try {
    return new URL(url)[part]
  } catch {
    return null
  }
}

// An SSH remote's port is the SSH port, so only its hostname can identify the API server.
function servesRepo(baseUrl: string, repo: GiteaRepoServer): boolean {
  if (repo.sshHostname !== null) {
    return urlPart(baseUrl, 'hostname') === repo.sshHostname
  }
  const configured = urlPart(baseUrl, 'origin')
  return configured !== null && configured === urlPart(repo.apiBaseUrl, 'origin')
}

/** The env base URL, only when it serves this repo's server. */
export function envGiteaApiBaseUrlFor(repo: GiteaRepoServer): string | null {
  const { apiBaseUrl } = getEnvGiteaAuthConfig()
  return apiBaseUrl && servesRepo(apiBaseUrl, repo) ? apiBaseUrl : null
}

// Env vars win, but a token only goes to the base URL it was configured with, never the remote's.
export async function resolveGiteaAuthForRepo(repo: GiteaRepoServer): Promise<GiteaAuthConfig> {
  const env = getEnvGiteaAuthConfig()
  if (hasEnvGiteaAuth(env)) {
    return envGiteaApiBaseUrlFor(repo) ? env : NO_AUTH
  }
  const metadata = await getStoredGiteaMetadata()
  if (!metadata || !servesRepo(metadata.baseUrl, repo)) {
    return NO_AUTH
  }
  try {
    const secret = await loadStoredGiteaSecret({ force: true })
    return secret && servesRepo(secret.baseUrl, repo)
      ? { apiBaseUrl: secret.baseUrl, token: secret.token }
      : NO_AUTH
  } catch {
    // An undecryptable token still leaves public repositories readable.
    return NO_AUTH
  }
}

// Same rule as resolveGiteaAuthForRepo, but reads metadata only so it never prompts the keychain.
export async function hasGiteaCredentialForRepo(repo: GiteaRepoServer): Promise<boolean> {
  const env = getEnvGiteaAuthConfig()
  if (hasEnvGiteaAuth(env)) {
    // An env token without its base URL is never sent, so it cannot authenticate.
    return env.token !== null && envGiteaApiBaseUrlFor(repo) !== null
  }
  const metadata = await getStoredGiteaMetadata()
  return metadata !== null && servesRepo(metadata.baseUrl, repo) && hasStoredGiteaCredential()
}

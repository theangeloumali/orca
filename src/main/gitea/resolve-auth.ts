import { getStoredGiteaMetadata, loadStoredGiteaSecret } from './credential-store'

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

// URL.origin lowercases the host and drops default ports, so it compares scheme + host + port.
function originOf(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function isSameGiteaOrigin(left: string, right: string): boolean {
  const leftOrigin = originOf(left)
  return leftOrigin !== null && leftOrigin === originOf(right)
}

/** The env base URL, only when it serves this repo's origin. */
export function envGiteaApiBaseUrlFor(repoApiBaseUrl: string): string | null {
  const { apiBaseUrl } = getEnvGiteaAuthConfig()
  return apiBaseUrl && isSameGiteaOrigin(apiBaseUrl, repoApiBaseUrl) ? apiBaseUrl : null
}

// Env vars win, but either token only goes to the server origin it was configured for.
export async function resolveGiteaAuthForRepo(repoApiBaseUrl: string): Promise<GiteaAuthConfig> {
  const env = getEnvGiteaAuthConfig()
  if (hasEnvGiteaAuth(env)) {
    return envGiteaApiBaseUrlFor(repoApiBaseUrl) ? env : NO_AUTH
  }
  const metadata = await getStoredGiteaMetadata()
  if (!metadata || !isSameGiteaOrigin(metadata.baseUrl, repoApiBaseUrl)) {
    return NO_AUTH
  }
  try {
    const secret = await loadStoredGiteaSecret({ force: true })
    return secret && isSameGiteaOrigin(secret.baseUrl, repoApiBaseUrl)
      ? { apiBaseUrl: secret.baseUrl, token: secret.token }
      : NO_AUTH
  } catch {
    // An undecryptable token still leaves public repositories readable.
    return NO_AUTH
  }
}

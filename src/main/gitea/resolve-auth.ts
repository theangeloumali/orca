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

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

// Env vars win; a stored token only goes to the host it was saved for.
export async function resolveGiteaAuthForHost(host: string): Promise<GiteaAuthConfig> {
  const env = getEnvGiteaAuthConfig()
  if (hasEnvGiteaAuth(env)) {
    return env
  }
  const repoHost = host.toLowerCase()
  const metadata = await getStoredGiteaMetadata()
  if (!metadata || hostOf(metadata.baseUrl) !== repoHost) {
    return { apiBaseUrl: null, token: null }
  }
  try {
    const secret = await loadStoredGiteaSecret({ force: true })
    return secret && hostOf(secret.baseUrl) === repoHost
      ? { apiBaseUrl: secret.baseUrl, token: secret.token }
      : { apiBaseUrl: null, token: null }
  } catch {
    // An undecryptable token still leaves public repositories readable.
    return { apiBaseUrl: null, token: null }
  }
}

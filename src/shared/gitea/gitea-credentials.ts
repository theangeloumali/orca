import type { SecretAtRestProtection } from '../secure-storage/secret-at-rest-protection'

// Offer Disconnect only for in-app stored credentials.
export type GiteaCredentialSource = 'environment' | 'stored' | 'none'

export type GiteaConnectArgs = {
  baseUrl: string
  token: string
}

// Never return the token over IPC to the renderer.
export type GiteaConnectionStatus = {
  configured: boolean
  /** Stored-at-rest status only; environment/none write nothing and use null. */
  credentialProtection: SecretAtRestProtection | null
  source: GiteaCredentialSource
  account: string | null
  baseUrl: string | null
}

// One English table: main builds the wire `error`, the renderer translates by code.
export const GITEA_CONNECT_FAILURE_COPY = {
  invalidInput: 'Invalid Gitea credentials',
  invalidBaseUrl: 'Enter a server URL that starts with https:// or http://.',
  tokenRequired: 'Enter an access token.',
  rejected: 'The server rejected this token. Check it can read repositories, then try again.',
  unreachable: 'Could not reach the server. Check the URL and your connection, then try again.'
} as const

export type GiteaConnectFailureCode = keyof typeof GITEA_CONNECT_FAILURE_COPY

export type GiteaConnectResult =
  | { ok: true; account: string | null }
  | { ok: false; error: string; errorCode: GiteaConnectFailureCode }

export function giteaConnectFailure(
  errorCode: GiteaConnectFailureCode
): Extract<GiteaConnectResult, { ok: false }> {
  return { ok: false, error: GITEA_CONNECT_FAILURE_COPY[errorCode], errorCode }
}

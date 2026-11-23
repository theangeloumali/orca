import { z } from 'zod'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

type GiteaUserFailure = { ok: false; reason: 'rejected' | 'unreachable' | 'notGiteaServer' }

export type GiteaUserResult = { ok: true; account: string | null } | GiteaUserFailure

const accountField = z.string().min(1).optional().catch(undefined)
const giteaUserSchema = z.object({
  id: z.number().optional().catch(undefined),
  login: accountField,
  username: accountField,
  full_name: accountField
})
const giteaVersionSchema = z.object({ version: z.string() })

const NOT_GITEA_SERVER: GiteaUserFailure = { ok: false, reason: 'notGiteaServer' }

function failureForStatus(status: number): GiteaUserFailure {
  if (status === 401 || status === 403) {
    return { ok: false, reason: 'rejected' }
  }
  return status === 404 ? NOT_GITEA_SERVER : { ok: false, reason: 'unreachable' }
}

function readJsonBody(response: Response): Promise<unknown> {
  return response.json().catch(() => undefined)
}

function getWithToken(url: string, token: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    headers: { Accept: 'application/json', Authorization: `token ${token}` },
    signal
  })
}

// Proves the token without /user: Forgejo instances that require sign-in refuse /version anonymously.
async function verifyTokenByVersion(
  apiBaseUrl: string,
  token: string,
  signal: AbortSignal
): Promise<GiteaUserResult> {
  const response = await getWithToken(`${apiBaseUrl}/version`, token, signal)
  if (!response.ok) {
    await cancelUnreadResponseBody(response)
    return failureForStatus(response.status)
  }
  const version = giteaVersionSchema.safeParse(await readJsonBody(response))
  return version.success ? { ok: true, account: null } : NOT_GITEA_SERVER
}

function userResult(body: unknown): GiteaUserResult {
  if (body === undefined) {
    return NOT_GITEA_SERVER
  }
  const user = giteaUserSchema.safeParse(body)
  if (!user.success || (user.data.login === undefined && user.data.id === undefined)) {
    return { ok: false, reason: 'rejected' }
  }
  return { ok: true, account: user.data.login ?? user.data.username ?? user.data.full_name ?? null }
}

export async function fetchGiteaUserResult(
  apiBaseUrl: string,
  token: string,
  timeoutMs: number
): Promise<GiteaUserResult> {
  try {
    const signal = AbortSignal.timeout(timeoutMs)
    const response = await getWithToken(`${apiBaseUrl}/user`, token, signal)
    if (response.status === 403) {
      // Repo-scoped tokens lack read:user; Gitea names the missing scope in the 403 body.
      const refusedForScope = /scope/i.test(await response.text())
      return refusedForScope
        ? await verifyTokenByVersion(apiBaseUrl, token, signal)
        : failureForStatus(403)
    }
    if (!response.ok) {
      await cancelUnreadResponseBody(response)
      return failureForStatus(response.status)
    }
    return userResult(await readJsonBody(response))
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

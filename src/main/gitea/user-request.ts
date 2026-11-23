import { z } from 'zod'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

export type GiteaUserResult =
  | { ok: true; account: string | null }
  | { ok: false; reason: 'rejected' | 'unreachable' }

const accountField = z.string().min(1).optional().catch(undefined)
const giteaUserSchema = z.object({
  login: accountField,
  username: accountField,
  full_name: accountField
})

function accountName(user: unknown): string | null {
  const parsed = giteaUserSchema.safeParse(user)
  if (!parsed.success) {
    return null
  }
  return parsed.data.login ?? parsed.data.username ?? parsed.data.full_name ?? null
}

export async function fetchGiteaUserResult(
  apiBaseUrl: string,
  token: string,
  timeoutMs: number
): Promise<GiteaUserResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/user`, {
      headers: { Accept: 'application/json', Authorization: `token ${token}` },
      signal: AbortSignal.timeout(timeoutMs)
    })
    if (!response.ok) {
      await cancelUnreadResponseBody(response)
      const rejected = response.status === 401 || response.status === 403
      return { ok: false, reason: rejected ? 'rejected' : 'unreachable' }
    }
    return { ok: true, account: accountName(await response.json()) }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

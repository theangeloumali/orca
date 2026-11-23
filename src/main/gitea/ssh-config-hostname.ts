import { runSshG } from '../ssh/config/ssh-g-config-resolution'

export type SshHostnameContext = { connectionId?: string | null; wslDistro?: string }

const SSH_G_TIMEOUT_MS = 2000
const hostnamesByAlias = new Map<string, string>()

// Plain ssh -G reads the config git's ssh reads; WSL and SSH-target repos use another machine's config.
export async function lookUpSshConfigHostname(
  alias: string,
  context: SshHostnameContext
): Promise<{ hostname: string | null }> {
  if (context.connectionId || context.wslDistro) {
    return { hostname: null }
  }
  const cached = hostnamesByAlias.get(alias)
  if (cached) {
    return { hostname: cached }
  }
  const hostname = (await runSshG(['-G', '--', alias], SSH_G_TIMEOUT_MS))?.hostname?.trim() || null
  // Failures stay uncached so a transient timeout does not pin the literal host for the session.
  if (hostname) {
    hostnamesByAlias.set(alias, hostname)
  }
  return { hostname }
}

export function _resetSshConfigHostnameCache(): void {
  hostnamesByAlias.clear()
}

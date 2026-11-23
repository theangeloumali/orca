import { ipcMain } from 'electron'
import { z } from 'zod'
import {
  connectGitea,
  disconnectGitea,
  getGiteaConnectionStatus
} from '../../gitea/credential-connection'
import { _resetPreflightCache } from '../../preflight/agent-detection'
import {
  type GiteaConnectArgs,
  type GiteaConnectResult,
  type GiteaConnectionStatus,
  giteaConnectFailure
} from '../../../shared/gitea/gitea-credentials'

// Caps keep an oversized renderer payload out of URL parsing and the keychain.
const connectArgsSchema = z.object({
  baseUrl: z.string().max(2048),
  token: z.string().max(4096)
}) satisfies z.ZodType<GiteaConnectArgs>

export function registerGiteaHandlers(): void {
  ipcMain.handle('gitea:connect', async (_event, args: unknown): Promise<GiteaConnectResult> => {
    const input = connectArgsSchema.safeParse(args)
    if (!input.success) {
      return giteaConnectFailure('invalidInput')
    }
    const result = await connectGitea(input.data)
    if (result.ok) {
      // Refresh cached source-control preflight so reconnection needs no relaunch.
      _resetPreflightCache()
    }
    return result
  })

  ipcMain.handle('gitea:disconnect', async (): Promise<void> => {
    await disconnectGitea()
    _resetPreflightCache()
  })

  ipcMain.handle('gitea:status', (): Promise<GiteaConnectionStatus> => getGiteaConnectionStatus())
}

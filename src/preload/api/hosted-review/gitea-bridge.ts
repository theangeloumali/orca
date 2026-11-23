import { ipcRenderer } from 'electron'
import type { PreloadApi } from '../../api-types'
import type {
  GiteaConnectArgs,
  GiteaConnectResult,
  GiteaConnectionStatus
} from '../../../shared/gitea/gitea-credentials'

export const giteaApi = {
  connect: (args: GiteaConnectArgs): Promise<GiteaConnectResult> =>
    ipcRenderer.invoke('gitea:connect', args),

  disconnect: (): Promise<void> => ipcRenderer.invoke('gitea:disconnect'),

  status: (): Promise<GiteaConnectionStatus> => ipcRenderer.invoke('gitea:status')
} satisfies PreloadApi['gitea']

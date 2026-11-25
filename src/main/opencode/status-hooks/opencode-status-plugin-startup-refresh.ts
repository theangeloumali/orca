import { isAgentStatusHooksEnabledForAgent } from '../../../shared/agent-hook-listener/configuration/agent-status-hooks-setting'
import type { ManagedHookDetectionSettings } from '../../agent-hooks/installation/managed-hook-detection-commands'
import { openCode2HookService, openCodeHookService } from './hook-service'
import { IS_ORCA_DEV_APP } from '../../../shared/fork/orca-dev-app-flag'

// Refresh running OpenCode 2 services on upgrade without waiting for a pane to rewrite the plugin.
export function refreshInstalledOpenCodeStatusPlugins(
  settings: ManagedHookDetectionSettings
): void {
  // The installed plugins live in the user-global OpenCode config, which prod owns.
  if (IS_ORCA_DEV_APP) {
    return
  }
  if (isAgentStatusHooksEnabledForAgent(settings, 'opencode')) {
    openCodeHookService.refreshInstalledPlugins()
  }
  if (isAgentStatusHooksEnabledForAgent(settings, 'opencode2')) {
    openCode2HookService.refreshInstalledPlugins()
  }
}

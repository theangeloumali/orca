import { reconcileStartupManagedAgentHooks } from '../agent-hooks/installation/managed-agent-hook-startup'
import { startCodexHooks } from '../codex/hooks/reconciliation/codex-hook-reconcile'
import { IS_ORCA_DEV_APP } from '../../shared/fork/orca-dev-app-flag'

/** Orca Dev leaves ~/.codex hook entries and ~/.orca/agent-hooks to prod; its panes still post to its own hook server. */
export function startDesktopAgentHooks(
  hooks: {
    codex: Parameters<typeof startCodexHooks>[0]
    managed: Parameters<typeof reconcileStartupManagedAgentHooks>[0]
  },
  isDevApp = IS_ORCA_DEV_APP
): void {
  if (isDevApp) {
    return
  }
  startCodexHooks(hooks.codex)
  reconcileStartupManagedAgentHooks(hooks.managed)
}

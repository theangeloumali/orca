import type {
  AgentHookInstallStatus,
  AgentHookTarget
} from '../../../shared/agent-hook-listener/configuration/agent-hook-types'

// Agent hook configs are user-global and shared with prod, so Orca Dev leaves them to Orca.
export function orcaDevSkippedHookStatus(agent: AgentHookTarget): AgentHookInstallStatus {
  return {
    agent,
    state: 'skipped',
    configPath: '',
    managedHooksPresent: false,
    detail: "Orca Dev doesn't manage agent hooks; use Orca.",
    skipReason: 'hooks_disabled'
  }
}

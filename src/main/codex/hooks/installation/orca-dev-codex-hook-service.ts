import type { AgentHookInstallStatus } from '../../../../shared/agent-hook-listener/configuration/agent-hook-types'
import { orcaDevSkippedHookStatus } from '../../../agent-hooks/installation/orca-dev-hook-skip'
import type { CodexLaunchConfigPreparation } from './codex-hook-launch-preparation'
import { CodexHookService } from './codex-hook-service-implementation'

function skipped(): Promise<AgentHookInstallStatus> {
  return Promise.resolve(orcaDevSkippedHookStatus('codex'))
}

// Hook and trust writes touch ~/.codex, shared with prod; the launch-time config mirror still runs.
function skippedAfterConfigMirror(
  configPreparation: CodexLaunchConfigPreparation | undefined
): Promise<AgentHookInstallStatus> {
  configPreparation?.run()
  configPreparation?.complete()
  return skipped()
}

/** Orca Dev's Codex hook service: it reads status but never installs, refreshes or removes hooks. */
export class OrcaDevCodexHookService extends CodexHookService {
  override refreshManagedScripts(): Promise<void> {
    return Promise.resolve()
  }
  override installForRuntimeHome(): Promise<AgentHookInstallStatus | null> {
    return Promise.resolve(null)
  }
  override installForRuntimeHomeSerialized(): Promise<AgentHookInstallStatus | null> {
    return Promise.resolve(null)
  }
  override prepareRuntimeHomeForLaunch(
    _runtimeHomePath: string | null | undefined,
    _target: unknown,
    _isHooksEnabled: () => boolean,
    _launchesCodex: boolean,
    configPreparation?: CodexLaunchConfigPreparation
  ): Promise<AgentHookInstallStatus> {
    return skippedAfterConfigMirror(configPreparation)
  }
  override refreshRuntimeUserHooksForRuntimeHome(): AgentHookInstallStatus | null {
    return null
  }
  override reconcileHooks(): Promise<AgentHookInstallStatus> {
    return skipped()
  }
  override install(): Promise<AgentHookInstallStatus> {
    return skipped()
  }
  override installForLaunchPrep(
    _runtimeHomePath: string | undefined,
    _launchesCodex: boolean,
    _isHooksEnabled: () => boolean,
    configPreparation?: CodexLaunchConfigPreparation
  ): Promise<AgentHookInstallStatus> {
    return skippedAfterConfigMirror(configPreparation)
  }
  override refreshRuntimeUserHooksForLaunchPrep(
    _runtimeHomePath?: string,
    configPreparation?: CodexLaunchConfigPreparation
  ): Promise<AgentHookInstallStatus> {
    return skippedAfterConfigMirror(configPreparation)
  }
  override installRemote(): Promise<AgentHookInstallStatus> {
    return skipped()
  }
  override refreshRuntimeUserHooks(): Promise<AgentHookInstallStatus> {
    return skipped()
  }
  override remove(): Promise<AgentHookInstallStatus> {
    return skipped()
  }
}

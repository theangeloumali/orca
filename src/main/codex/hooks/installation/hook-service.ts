import { CodexHookService } from './codex-hook-service-implementation'
import { OrcaDevCodexHookService } from './orca-dev-codex-hook-service'
import { IS_ORCA_DEV_APP } from '../../../../shared/fork/orca-dev-app-flag'
import { cleanupLegacySystemManagedHooks } from '../reconciliation/codex-hook-legacy-cleanup'
import { getManagedScript } from '../definitions/codex-hook-script'
import { removeStaleWslRuntimeManagedHookTrustEntries } from '../../trust/hooks/codex-hook-trust-cleanup'
import {
  getWslHookReconciliationAction,
  installManagedHooksIntoWslRuntime,
  refreshWslRuntimeUserHooks
} from './codex-hook-wsl-runtime'

export const codexHookService: CodexHookService = IS_ORCA_DEV_APP
  ? new OrcaDevCodexHookService()
  : new CodexHookService()

export const _internals = {
  cleanupLegacySystemManagedHooks,
  getManagedScript,
  installManagedHooksIntoWslRuntime,
  refreshWslRuntimeUserHooks,
  removeStaleWslRuntimeManagedHookTrustEntries,
  getWslHookReconciliationAction
}

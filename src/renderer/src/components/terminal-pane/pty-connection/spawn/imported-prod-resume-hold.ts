import type { SpawnDeferralReason } from '../../../../../../shared/terminal/pty/admission/spawn-admission-contract'
import type {
  ColdRestoreAgentResumeStartup,
  FreshSpawnOptions,
  PendingStartupCommand
} from '../startup/fresh-spawn-types'

/** A deferral only the user's click resumes: no background retry and no resume on reveal. */
export function resumesOnlyOnClick(reason: SpawnDeferralReason): boolean {
  return reason === 'imported'
}

type EnterSpawnDeferredSleep = (
  reason: SpawnDeferralReason,
  startup: PendingStartupCommand,
  options: FreshSpawnOptions,
  visibleAtSpawn: boolean
) => void

/** Orca Dev keeps a pane copied from prod asleep, visible or not; its resume forks prod's conversation. */
export function holdImportedProdResume(
  startup:
    | (PendingStartupCommand & Pick<ColdRestoreAgentResumeStartup, 'sleepingRecordEntry'>)
    | null,
  options: FreshSpawnOptions,
  enterSpawnDeferredSleep: EnterSpawnDeferredSleep
): boolean {
  if (
    startup?.sleepingRecordEntry?.record.importedFromProd !== true ||
    startup.resumeSource?.cancelled
  ) {
    return false
  }
  // Why visible: a hidden pane must not resume on reveal either.
  enterSpawnDeferredSleep('imported', startup, options, true)
  return true
}

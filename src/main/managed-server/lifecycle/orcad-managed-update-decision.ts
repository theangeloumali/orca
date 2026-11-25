import {
  compareAppVersions,
  isValidAppVersion
} from '../../../shared/app-lifecycle/identity/app-version'
import type { OrcadManagedPastLiveTerminals } from '../../../shared/remote-runtime/orcad-lifecycle/orcad-managed-runtime'
import type { OrcadActivationRecord } from '../activation/orcad-activation-record'
import type { OrcadUpdateForce } from '../activation/orcad-update-plan'
import {
  refuseOrcadHostDowngrade,
  type OrcadHostVersionRefusal
} from '../activation/orcad-host-version-admission'
import { IS_ORCA_DEV_APP } from '../../../shared/fork/orca-dev-app-flag'

export type ManagedOrcadAutoUpdateSkip =
  | 'current'
  | 'no-template'
  | 'rolled-back'
  | 'failed-before'
  | 'migrating'
  /** Orca Dev never puts its orcad on a host; prod Orca owns every host's server. */
  | 'dev-app'
  | OrcadHostVersionRefusal

/** Connect honors all skips; Update retries local failures/rollbacks; Force also lifts version skips. */
export type OrcadUpdateIntent = 'connect' | 'update' | 'force'

export type ManagedOrcadAutoUpdatePlan =
  | { action: 'update' }
  | { action: 'skip'; reason: ManagedOrcadAutoUpdateSkip }

const ORCA_DEV_ORCAD_REFUSAL = "Orca Dev doesn't update remote servers; use Orca."

/** Orca Dev's orcad carries the dev flag onto the host, so every deploy refuses before its upload. */
export function refuseOrcadDeployFromOrcaDev(isDevApp = IS_ORCA_DEV_APP): void {
  if (isDevApp) {
    throw new Error(ORCA_DEV_ORCAD_REFUSAL)
  }
}

export function planManagedOrcadAutoUpdate(input: {
  record: OrcadActivationRecord
  candidateVersion: string | null
  appVersion: string
  failedBefore: boolean
  /** Defaults to the build flag. */
  isDevApp?: boolean
}): ManagedOrcadAutoUpdatePlan {
  const { record, candidateVersion } = input
  if (!candidateVersion) {
    return { action: 'skip', reason: 'no-template' }
  }
  if (record.active === candidateVersion) {
    return { action: 'skip', reason: 'current' }
  }
  if (input.isDevApp ?? IS_ORCA_DEV_APP) {
    return { action: 'skip', reason: 'dev-app' }
  }
  if (record.rolledBackFrom === candidateVersion) {
    return { action: 'skip', reason: 'rolled-back' }
  }
  const refusal = refuseOrcadHostDowngrade(record, candidateVersion, input.appVersion)
  if (refusal) {
    return { action: 'skip', reason: refusal }
  }
  // A stopped host has no serving fallback; retry even after a prior failed attempt.
  if (record.active === null && record.previous !== null) {
    return { action: 'update' }
  }
  return input.failedBefore ? { action: 'skip', reason: 'failed-before' } : { action: 'update' }
}

export function planOrcadUpdateForIntent(
  intent: OrcadUpdateIntent,
  input: Parameters<typeof planManagedOrcadAutoUpdate>[0]
): ManagedOrcadAutoUpdatePlan {
  if (intent === 'force') {
    return (input.isDevApp ?? IS_ORCA_DEV_APP)
      ? { action: 'skip', reason: 'dev-app' }
      : { action: 'update' }
  }
  if (intent === 'connect') {
    return planManagedOrcadAutoUpdate(input)
  }
  const { rolledBackFrom: _retried, ...record } = input.record
  return planManagedOrcadAutoUpdate({ ...input, record, failedBefore: false })
}

/** Full force over an uncounted census ends terminals orcad runs itself, so it needs a confirmation, never a bare force. */
export function managedOrcadUpdateForce(input: {
  force?: boolean
  pastLiveTerminals?: OrcadManagedPastLiveTerminals
  /** The caller confirmed terminals orcad runs itself end, as CLI `--force --yes` does. */
  endInProcessTerminals?: boolean
}): OrcadUpdateForce | undefined {
  if (input.pastLiveTerminals) {
    return input.pastLiveTerminals.uncounted ? true : 'live-terminals'
  }
  if (!input.force) {
    return input.force
  }
  return input.endInProcessTerminals === true ? true : 'live-terminals'
}

export function admitOrcadRecordForIntent(
  intent: OrcadUpdateIntent,
  appVersion: string
): (record: OrcadActivationRecord, candidateVersion: string) => string | null {
  return (record, candidateVersion) =>
    orcadUpdateSkipRefusal(
      planOrcadUpdateForIntent(intent, {
        record,
        candidateVersion,
        appVersion,
        failedBefore: false
      }),
      record,
      candidateVersion,
      appVersion
    )
}

export function orcadUpdateSkipRefusal(
  plan: ManagedOrcadAutoUpdatePlan,
  record: OrcadActivationRecord,
  candidateVersion: string,
  appVersion: string
): string | null {
  if (plan.action !== 'skip' || plan.reason === 'current') {
    return null
  }
  if (plan.reason === 'dev-app') {
    return ORCA_DEV_ORCAD_REFUSAL
  }
  return plan.reason === 'rolled-back'
    ? `This host's server rolled back from ${candidateVersion}, so a connect does not activate ` +
        'it again; choose Update or Force to retry it.'
    : `Orca ${record.activeAppVersion} last ran this host's server, newer than this ` +
        `Orca (${appVersion}). Update Orca to start it.`
}

/** Content hashes cannot order updates: compare Orca versions, or for legacy hosts offer only this desktop's previously deferred build. */
export function availableManagedOrcadUpdate(input: {
  record: OrcadActivationRecord
  candidateVersion: string | null
  appVersion: string
  /** The build this desktop's last Update or connect deferred on this host. */
  deferredCandidateVersion: string | null
}): string | null {
  const { record, candidateVersion, appVersion } = input
  const hostAppVersion = record.activeAppVersion
  if (!candidateVersion || record.active === null || !isValidAppVersion(appVersion)) {
    return null
  }
  const ordered = hostAppVersion
    ? isValidAppVersion(hostAppVersion) && compareAppVersions(appVersion, hostAppVersion) >= 0
    : input.deferredCandidateVersion === candidateVersion
  if (!ordered) {
    return null
  }
  // Connect rules: a build the user rolled back from is not advertised again.
  const plan = planManagedOrcadAutoUpdate({
    record,
    candidateVersion,
    appVersion,
    failedBefore: false
  })
  return plan.action === 'update' ? candidateVersion : null
}

/** Update anyway was confirmed over one incumbent build; a build activated since then voids it. */
export function admitConfirmedIncumbent(
  admit: (record: OrcadActivationRecord, candidateVersion: string) => string | null,
  incumbentVersion: string | null
): (record: OrcadActivationRecord, candidateVersion: string) => string | null {
  return (record, candidateVersion) =>
    record.active !== incumbentVersion
      ? "This host's server changed since the update was confirmed. Review it and update again."
      : admit(record, candidateVersion)
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  emptyOrcadActivationRecord,
  type OrcadActivationRecord
} from '../activation/orcad-activation-record'

const serving: OrcadActivationRecord = {
  ...emptyOrcadActivationRecord(),
  active: 'prod-build',
  activeAppVersion: '1.0.0'
}
const input = {
  record: serving,
  candidateVersion: 'dev-build',
  appVersion: '1.0.0',
  failedBefore: false
}
const empty = { ...input, record: emptyOrcadActivationRecord() }
const stopped = { ...input, record: { ...emptyOrcadActivationRecord(), previous: 'prod-build' } }
const devAppSkip = { action: 'skip', reason: 'dev-app' } as const
const REFUSAL = "Orca Dev doesn't update remote servers; use Orca."

async function loadDecisionInOrcaDev() {
  vi.stubGlobal('ORCA_FORK_DEV_APP', true)
  vi.resetModules()
  return import('./orcad-managed-update-decision')
}

describe('managed orcad updates from Orca Dev', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('never puts its build on a host on connect, serving, stopped or empty', async () => {
    const { planManagedOrcadAutoUpdate, planOrcadUpdateForIntent } = await loadDecisionInOrcaDev()
    for (const host of [input, stopped, empty]) {
      expect(planManagedOrcadAutoUpdate(host)).toEqual(devAppSkip)
      expect(planOrcadUpdateForIntent('connect', host)).toEqual(devAppSkip)
    }
  })

  it('refuses an explicit Update or Force and sends the user to Orca', async () => {
    const { planOrcadUpdateForIntent, admitOrcadRecordForIntent, availableManagedOrcadUpdate } =
      await loadDecisionInOrcaDev()
    for (const host of [input, stopped, empty]) {
      expect(planOrcadUpdateForIntent('update', host)).toEqual(devAppSkip)
      expect(planOrcadUpdateForIntent('force', host)).toEqual(devAppSkip)
    }
    expect(admitOrcadRecordForIntent('update', '1.0.0')(serving, 'dev-build')).toBe(REFUSAL)
    expect(admitOrcadRecordForIntent('force', '1.0.0')(empty.record, 'dev-build')).toBe(REFUSAL)
    expect(availableManagedOrcadUpdate({ ...input, deferredCandidateVersion: null })).toBeNull()
  })

  it('refuses any deploy before an upload', async () => {
    const { refuseOrcadDeployFromOrcaDev } = await loadDecisionInOrcaDev()
    expect(() => refuseOrcadDeployFromOrcaDev()).toThrow(REFUSAL)
    expect(() => refuseOrcadDeployFromOrcaDev(false)).not.toThrow()
  })

  it('leaves prod connect, Update and Force unchanged', async () => {
    const {
      planManagedOrcadAutoUpdate,
      planOrcadUpdateForIntent,
      admitOrcadRecordForIntent,
      availableManagedOrcadUpdate,
      refuseOrcadDeployFromOrcaDev
    } = await import('./orcad-managed-update-decision')
    const update = { action: 'update' }
    for (const host of [input, stopped, empty]) {
      expect(planManagedOrcadAutoUpdate(host)).toEqual(update)
      expect(planOrcadUpdateForIntent('update', host)).toEqual(update)
      expect(planOrcadUpdateForIntent('force', host)).toEqual(update)
    }
    expect(admitOrcadRecordForIntent('update', '1.0.0')(serving, 'dev-build')).toBeNull()
    expect(availableManagedOrcadUpdate({ ...input, deferredCandidateVersion: null })).toBe(
      'dev-build'
    )
    expect(() => refuseOrcadDeployFromOrcaDev()).not.toThrow()
  })
})

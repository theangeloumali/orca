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

  it("skips the connect update so Orca Dev never flips the host's server build", async () => {
    const { planManagedOrcadAutoUpdate, planOrcadUpdateForIntent, orcadUpdateSkipRefusal } =
      await loadDecisionInOrcaDev()
    const skip = { action: 'skip', reason: 'dev-app' } as const
    expect(planManagedOrcadAutoUpdate(input)).toEqual(skip)
    expect(planOrcadUpdateForIntent('connect', input)).toEqual(skip)
    expect(orcadUpdateSkipRefusal(skip, serving, 'dev-build', '1.0.0')).toMatch(/Update/)
  })

  it('still runs an explicit Update or Force and still advertises the update', async () => {
    const { planOrcadUpdateForIntent, availableManagedOrcadUpdate } = await loadDecisionInOrcaDev()
    expect(planOrcadUpdateForIntent('update', input)).toEqual({ action: 'update' })
    expect(planOrcadUpdateForIntent('force', input)).toEqual({ action: 'update' })
    expect(availableManagedOrcadUpdate({ ...input, deferredCandidateVersion: null })).toBe(
      'dev-build'
    )
  })

  it('still starts a host that serves no build yet', async () => {
    const { planManagedOrcadAutoUpdate } = await loadDecisionInOrcaDev()
    expect(planManagedOrcadAutoUpdate({ ...input, record: emptyOrcadActivationRecord() })).toEqual({
      action: 'update'
    })
  })

  it("leaves a stopped host to restart prod's previous build, never Orca Dev's", async () => {
    const { planManagedOrcadAutoUpdate, planOrcadUpdateForIntent } = await loadDecisionInOrcaDev()
    const stopped = {
      ...input,
      record: { ...emptyOrcadActivationRecord(), previous: 'prod-build' }
    }
    expect(planManagedOrcadAutoUpdate(stopped)).toEqual({ action: 'skip', reason: 'dev-app' })
    expect(planOrcadUpdateForIntent('update', stopped)).toEqual({ action: 'update' })
  })

  it('keeps updating on connect in prod', async () => {
    const { planManagedOrcadAutoUpdate } = await import('./orcad-managed-update-decision')
    expect(planManagedOrcadAutoUpdate(input)).toEqual({ action: 'update' })
  })
})

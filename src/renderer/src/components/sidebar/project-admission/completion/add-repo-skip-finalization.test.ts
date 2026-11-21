import { expect, it, vi } from 'vitest'
import {
  finalizeImportedRepoAfterSkip,
  type AddRepoSkipFinalizationState
} from './add-repo-skip-finalization'

function stateWith(showOnlyRunningTerminals: boolean): AddRepoSkipFinalizationState {
  return {
    activeRepoId: 'repo-new',
    filterRepoIds: [],
    showOnlyRunningTerminals,
    setActiveRepo: vi.fn(),
    setFilterRepoIds: vi.fn(),
    setShowOnlyRunningTerminals: vi.fn()
  }
}

it('turns Active only off so the skipped import, which runs nothing, stays visible', () => {
  const state = stateWith(true)
  finalizeImportedRepoAfterSkip(state, 'repo-new')
  expect(state.setShowOnlyRunningTerminals).toHaveBeenCalledWith(false)
})

it('leaves Active only alone while it is already off', () => {
  const state = stateWith(false)
  finalizeImportedRepoAfterSkip(state, 'repo-new')
  expect(state.setShowOnlyRunningTerminals).not.toHaveBeenCalled()
})

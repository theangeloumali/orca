import { describe, expect, it } from 'vitest'
import { createUIStore } from './ui-slice-test-harness'

describe('This machine chip restore list', () => {
  it('is kept while the chip narrows to this machine', () => {
    const store = createUIStore()
    store.getState().setHostIdsBeforeThisMachineChip(['ssh:box'])
    store.getState().setVisibleWorkspaceHostIds(['local'])
    expect(store.getState().hostIdsBeforeThisMachineChip).toEqual(['ssh:box'])
  })

  it('is dropped when the host scope is changed by hand, so the chip turns off', () => {
    const store = createUIStore()
    store.getState().setHostIdsBeforeThisMachineChip(['ssh:box'])
    store.getState().setVisibleWorkspaceHostIds(['local'])
    store.getState().setVisibleWorkspaceHostIds(['ssh:other'])
    expect(store.getState().hostIdsBeforeThisMachineChip).toBeNull()
    store.getState().setHostIdsBeforeThisMachineChip(['ssh:box'])
    store.getState().setWorkspaceHostScope('all')
    expect(store.getState().hostIdsBeforeThisMachineChip).toBeNull()
  })
})

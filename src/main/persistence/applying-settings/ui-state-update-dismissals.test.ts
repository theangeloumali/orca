import { describe, expect, it } from 'vitest'
import { getDefaultPersistedState } from '../../../shared/orca-profiles/constants'
import { updatePersistedUI, type UIUpdateOperations } from './ui-state-update'

function createOperations(): UIUpdateOperations & { saves: number } {
  const operations = {
    state: getDefaultPersistedState('/home/test'),
    saves: 0,
    removeRetainedBlob: () => {},
    setActiveView: () => false,
    getUI: () => operations.state.ui,
    scheduleSave: () => {
      operations.saves += 1
    },
    notifyUIChanged: () => {}
  }
  return operations
}

describe('updatePersistedUI dismissal keys', () => {
  it('keeps both windows dismissals when a stale window writes after a peer', () => {
    const operations = createOperations()
    // Both windows read null, then each writes only its own dismissal.
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: 'local:a\nlocal:b' })
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: 'local:c' })
    expect(operations.state.ui.dismissedClientSuggestionsKey).toBe('local:a\nlocal:b\nlocal:c')
    expect(operations.saves).toBe(2)
  })

  it('unions idle-project dismissals the same way', () => {
    const operations = createOperations()
    updatePersistedUI(operations, { dismissedIdleProjectsKey: 'local:old' })
    updatePersistedUI(operations, { dismissedIdleProjectsKey: 'local:new' })
    expect(operations.state.ui.dismissedIdleProjectsKey).toBe('local:new\nlocal:old')
  })

  it('does not let a null or empty write erase a saved dismissal', () => {
    const operations = createOperations()
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: 'local:a' })
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: null })
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: '' })
    expect(operations.state.ui.dismissedClientSuggestionsKey).toBe('local:a')
    expect(operations.saves).toBe(1)
  })

  it('leaves the saved keys alone when an update does not carry them', () => {
    const operations = createOperations()
    updatePersistedUI(operations, { dismissedClientSuggestionsKey: 'local:a' })
    updatePersistedUI(operations, { sidebarProjectsFirst: true })
    expect(operations.state.ui.dismissedClientSuggestionsKey).toBe('local:a')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PersistedUIState } from '../../../../../shared/orca-profiles/persisted-ui-state-types'
import { createUIStore, makePersistedUI } from './ui-slice-test-harness'

// One persisted file shared by every window, like main's ui store.
function stubPersistedUI(): { current: PersistedUIState } {
  const persisted = { current: makePersistedUI() }
  vi.stubGlobal('window', {
    api: {
      ui: {
        get: vi.fn(async () => persisted.current),
        set: vi.fn(async (update: Partial<PersistedUIState>) => {
          persisted.current = { ...persisted.current, ...update }
        })
      }
    }
  })
  return persisted
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('dismissClientSuggestions persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("keeps both windows' dismissals when each dismisses a different machine", async () => {
    const persisted = stubPersistedUI()
    const firstWindow = createUIStore()
    const secondWindow = createUIStore()

    firstWindow.getState().dismissClientSuggestions('local\u0000repo-a')
    await settle()
    secondWindow.getState().dismissClientSuggestions('ssh:box\u0000repo-b')
    await settle()

    expect(persisted.current.dismissedClientSuggestionsKey).toBe(
      'local\u0000repo-a\nssh:box\u0000repo-b'
    )
    expect(secondWindow.getState().dismissedClientSuggestionsKey).toBe(
      'local\u0000repo-a\nssh:box\u0000repo-b'
    )
  })

  it('shows the dismissal at once, before the persisted read returns', () => {
    stubPersistedUI()
    const store = createUIStore()
    store.getState().dismissClientSuggestions('local\u0000repo-a')
    expect(store.getState().dismissedClientSuggestionsKey).toBe('local\u0000repo-a')
  })
})

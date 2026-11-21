import { describe, expect, it } from 'vitest'
import { createUIStore, makePersistedUI } from './ui-slice-test-harness'

describe('showOnlyRunningTerminals hydration', () => {
  it('restores a saved Active only toggle', () => {
    const store = createUIStore()
    store.getState().hydratePersistedUI(makePersistedUI({ showOnlyRunningTerminals: true }))
    expect(store.getState().showOnlyRunningTerminals).toBe(true)
  })

  it('reads a profile without the field as off', () => {
    const store = createUIStore()
    const { showOnlyRunningTerminals: _omitted, ...legacy } = makePersistedUI()
    store.getState().hydratePersistedUI(legacy)
    expect(store.getState().showOnlyRunningTerminals).toBe(false)
  })
})

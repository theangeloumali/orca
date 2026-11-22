import { describe, expect, it } from 'vitest'
import { createUIStore, makePersistedUI } from './ui-slice-test-harness'

describe('showOnlyNeedsYou hydration', () => {
  it('restores a saved Needs you chip', () => {
    const store = createUIStore()
    store.getState().hydratePersistedUI(makePersistedUI({ showOnlyNeedsYou: true }))
    expect(store.getState().showOnlyNeedsYou).toBe(true)
  })

  it('reads a profile without the field as off', () => {
    const store = createUIStore()
    const { showOnlyNeedsYou: _omitted, ...legacy } = makePersistedUI()
    store.getState().hydratePersistedUI(legacy)
    expect(store.getState().showOnlyNeedsYou).toBe(false)
  })
})

describe('sidebar find query', () => {
  it('starts empty and is never written to the profile', () => {
    const store = createUIStore()
    expect(store.getState().sidebarFindQuery).toBe('')
    store.getState().setSidebarFindQuery('api')
    expect(store.getState().sidebarFindQuery).toBe('api')
    expect('sidebarFindQuery' in makePersistedUI()).toBe(false)
  })
})

// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useStore } from 'zustand'
import { afterEach, expect, it, vi } from 'vitest'
import { createUIStore } from '@/store/slices/ui/ui-slice-test-harness'
import type { AppState } from '@/store/types'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { useSidebarWorktreeFilters, type SidebarWorktreeFilters } from './use-filters'

let store = createUIStore()
vi.mock('@/store', async () => {
  const { useStore: useBoundStore } = await import('zustand')
  return {
    useAppStore: Object.assign(
      (selector: (s: AppState) => unknown) => useBoundStore(store, selector),
      {
        getState: () => store.getState(),
        subscribe: (listener: () => void) => store.subscribe(listener)
      }
    )
  }
})
vi.mock('@/store/slices/runtime-status/views/runtime-status-owner', () => ({
  readRuntimeStatuses: () => new Map()
}))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let container: HTMLDivElement | null = null

afterEach(() => {
  container?.remove()
  container = null
  store = createUIStore()
})

function renderFilters(): SidebarWorktreeFilters {
  let filters: SidebarWorktreeFilters | null = null
  function Probe(): null {
    useStore(store, (s) => s.showOnlyRunningTerminals)
    filters = useSidebarWorktreeFilters()
    return null
  }
  container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<Probe />))
  if (!filters) {
    throw new Error('Probe did not render')
  }
  return filters
}

it('turns Active only off to reveal a workspace with nothing running', () => {
  store.setState({ settings: getDefaultSettings('/home/me'), showOnlyRunningTerminals: true })
  const filters = renderFilters()
  expect(filters.hasFilters).toBe(true)
  act(() => filters.revealWorkspaceFilters(makeWorktree({ id: 'wt-1', repoId: 'repo-1' })))
  expect(store.getState().showOnlyRunningTerminals).toBe(false)
})

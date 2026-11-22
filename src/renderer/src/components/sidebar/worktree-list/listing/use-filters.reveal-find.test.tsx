// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { createUIStore } from '@/store/slices/ui/ui-slice-test-harness'
import type { AppState } from '@/store/types'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { getFolderWorkspaceWorktree } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import {
  folder,
  group,
  lineage,
  repo,
  wt
} from '../parity/sidebar-list-golden-factories.test-fixture'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
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

const app = repo('repo-1', 'App')
const parent = wt(app, 'main', { displayName: 'Main' })
const child = wt(app, 'login', { displayName: 'Login' })
const notes = folder('fw-notes', 'pg-1', { name: 'Notes' })

function reveal(target: Parameters<SidebarWorktreeFilters['revealWorkspaceFilters']>[0]): void {
  const filters = renderFilters()
  act(() => filters.revealWorkspaceFilters(target))
}

function seed(sidebarFindQuery: string): void {
  store.setState({
    settings: getDefaultSettings('/home/me'),
    repos: [app],
    worktreesByRepo: { [app.id]: [parent, child] },
    worktreeLineageById: { [child.id]: lineage(child, parent) },
    projectGroups: [group('pg-1', 'Alpha')],
    folderWorkspaces: [notes],
    sidebarFindQuery
  })
}

it('keeps find when revealing a lineage parent it shows for a matching child', () => {
  seed('log')
  reveal(parent)
  expect(store.getState().sidebarFindQuery).toBe('log')
})

it('keeps find when revealing a parent folder it shows for a matching child', () => {
  seed('log')
  const nested = {
    ...child,
    workspaceLineage: { parentWorkspaceKey: folderWorkspaceKey(notes.id) }
  }
  store.setState({ worktreesByRepo: { [app.id]: [parent, nested] }, worktreeLineageById: {} })
  reveal(getFolderWorkspaceWorktree(notes))
  expect(store.getState().sidebarFindQuery).toBe('log')
})

it('clears find when revealing a worktree find itself hides', () => {
  seed('log')
  store.setState({ worktreeLineageById: {} })
  reveal(parent)
  expect(store.getState().sidebarFindQuery).toBe('')
})

it('matches a folder workspace by its name only, as the list does', () => {
  // The worktree matcher reads a project label, "Unknown" for a folder's synthetic repo.
  seed('unknown')
  reveal(getFolderWorkspaceWorktree(notes))
  expect(store.getState().sidebarFindQuery).toBe('')
  seed('note')
  reveal(getFolderWorkspaceWorktree(notes))
  expect(store.getState().sidebarFindQuery).toBe('note')
})

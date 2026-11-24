// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useStore } from 'zustand'
import { afterEach, expect, it, vi } from 'vitest'
import { createUIStore } from '@/store/slices/ui/ui-slice-test-harness'
import type { AppState } from '@/store/types'
import { getDefaultSettings } from '../../../../../../shared/orca-profiles/constants'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { repo } from '../grouping/worktree-list-groups-test-fixtures'
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
  store.setState({
    settings: getDefaultSettings('/home/me'),
    showOnlyRunningTerminals: true,
    tabsByWorktree: {},
    ptyIdsByTabId: {}
  })
  const filters = renderFilters()
  expect(filters.hasFilters).toBe(true)
  act(() => filters.revealWorkspaceFilters(makeWorktree({ id: 'wt-1', repoId: 'repo-1' })))
  expect(store.getState().showOnlyRunningTerminals).toBe(false)
})

it('clears a find that hides the revealed workspace, and keeps one that matches it', () => {
  // The find reveal reads the listing, so seed the catalog it walks.
  store.setState({
    settings: getDefaultSettings('/home/me'),
    sidebarFindQuery: 'zzz',
    repos: [],
    worktreesByRepo: {},
    worktreeLineageById: {}
  })
  const filters = renderFilters()
  expect(filters.hasFilters).toBe(true)
  const worktree = makeWorktree({ id: 'wt-1', repoId: 'repo-1', displayName: 'Login' })
  act(() => store.getState().setSidebarFindQuery('log'))
  act(() => filters.revealWorkspaceFilters(worktree))
  expect(store.getState().sidebarFindQuery).toBe('log')
  act(() => store.getState().setSidebarFindQuery('zzz'))
  act(() => filters.revealWorkspaceFilters(worktree))
  expect(store.getState().sidebarFindQuery).toBe('')
})

it('keeps Active only on to reveal a workspace that is already running', () => {
  store.setState({
    settings: getDefaultSettings('/home/me'),
    showOnlyRunningTerminals: true,
    tabsByWorktree: { 'wt-1': [makeTab({ id: 'tab-1', worktreeId: 'wt-1' })] },
    ptyIdsByTabId: { 'tab-1': ['pty-1'] }
  })
  const filters = renderFilters()
  act(() => filters.revealWorkspaceFilters(makeWorktree({ id: 'wt-1', repoId: 'repo-1' })))
  expect(store.getState().showOnlyRunningTerminals).toBe(true)
})

it('turns Active only off to reveal a twin whose PTY runs on the other machine', () => {
  const remoteRepo: Repo = {
    ...repo,
    id: 'repo-gpu',
    connectionId: 'gpu-vm',
    executionHostId: 'ssh:gpu-vm'
  }
  const local = makeWorktree({ id: 'wt-shared', repoId: repo.id, hostId: 'local' })
  const remote = makeWorktree({ id: 'wt-shared', repoId: remoteRepo.id, hostId: 'ssh:gpu-vm' })
  store.setState({
    settings: getDefaultSettings('/home/me'),
    showOnlyRunningTerminals: true,
    repos: [repo, remoteRepo],
    worktreesByRepo: { [repo.id]: [local], [remoteRepo.id]: [remote] },
    tabsByWorktree: { 'wt-shared': [makeTab({ id: 'tab-remote', worktreeId: 'wt-shared' })] },
    ptyIdsByTabId: { 'tab-remote': [toAppSshPtyId('gpu-vm', 'pty-1')] }
  })
  const filters = renderFilters()
  act(() => filters.revealWorkspaceFilters(local))
  expect(store.getState().showOnlyRunningTerminals).toBe(false)
})

// @vitest-environment happy-dom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { makeRepo, makeWorktree } from '../../../worktree-jump/worktree-jump-palette-test-fixtures'
import { makeWorktree as makeHostWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { computeVisibleWorktrees } from '../../worktree-list/listing/compute-visible-worktrees'
import { buildVisibleWorktreeOptionsFromState } from '../../worktree-list/listing/visible-worktree-options-from-state'
import { useVisibleWorkspaceKanbanWorktreeIds } from './use-visible-workspace-kanban-worktree-ids'

const repo = makeRepo()
const waiting = makeWorktree('wt-waiting', 'Waiting')
const quiet = makeWorktree('wt-quiet', 'Quiet')

describe('useVisibleWorkspaceKanbanWorktreeIds', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('keeps only the cards the sidebar lists while Needs you is on', () => {
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [waiting, quiet] },
      showSleepingWorkspaces: true,
      showOnlyNeedsYou: true
    })
    vi.spyOn(
      useAppStore.getState().agentStatusByPaneKey.projection,
      'attention'
    ).mockImplementation((worktreeId) => ({
      cls: worktreeId === waiting.id ? 1 : 5,
      attentionTimestamp: 0
    }))
    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({
        allWorktrees: [waiting, quiet],
        repoMap: new Map([[repo.id, repo]])
      })
    )
    expect([...result.current]).toEqual([getWorktreeHostIdentity(waiting)])
  })

  it('agrees with the sidebar under Live: a twin counts only where its PTY runs', () => {
    const remoteRepo: Repo = {
      ...repo,
      id: 'repo-gpu',
      connectionId: 'gpu-vm',
      executionHostId: 'ssh:gpu-vm'
    }
    const local = makeHostWorktree({ id: 'wt-shared', repoId: repo.id, hostId: 'local' })
    const remote = makeHostWorktree({
      id: 'wt-shared',
      repoId: remoteRepo.id,
      hostId: 'ssh:gpu-vm'
    })
    useAppStore.setState({
      repos: [repo, remoteRepo],
      worktreesByRepo: { [repo.id]: [local], [remoteRepo.id]: [remote] },
      showSleepingWorkspaces: true,
      showOnlyRunningTerminals: true,
      tabsByWorktree: { 'wt-shared': [makeTab({ id: 'tab-remote', worktreeId: 'wt-shared' })] },
      ptyIdsByTabId: { 'tab-remote': [toAppSshPtyId('gpu-vm', 'pty-1')] }
    })
    const state = useAppStore.getState()
    const repoMap = getIndexedRepoMap(state.repos)
    const sidebarIds = computeVisibleWorktrees(
      selectWorktreesByRepo(state),
      [],
      buildVisibleWorktreeOptionsFromState(state, new Map(), repoMap)
    ).map(getWorktreeHostIdentity)
    const { result } = renderHook(() =>
      useVisibleWorkspaceKanbanWorktreeIds({ allWorktrees: [local, remote], repoMap })
    )
    expect([...result.current]).toEqual([getWorktreeHostIdentity(remote)])
    expect([...result.current]).toEqual(sidebarIds)
  })
})

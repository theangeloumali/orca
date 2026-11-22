// @vitest-environment happy-dom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { makeRepo, makeWorktree } from '../../../worktree-jump/worktree-jump-palette-test-fixtures'
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
})

import { describe, expect, it } from 'vitest'
import { createTestStore } from '@/store/testing/app-store-test-fixture'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { computeRenderedSidebarWorktreeOrder } from './rendered-sidebar-worktree-order'

function repoOn(id: string, executionHostId?: Repo['executionHostId']): Repo {
  return { id, path: `/${id}`, displayName: id, badgeColor: '#737373', addedAt: 1, executionHostId }
}

function completedWorktree(repo: Repo): Worktree {
  return {
    id: `${repo.id}::${repo.path}`,
    instanceId: `instance-${repo.id}`,
    repoId: repo.id,
    path: repo.path,
    displayName: repo.id,
    branch: 'refs/heads/main',
    head: 'abc123',
    isBare: false,
    isMainWorktree: true,
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    comment: '',
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    workspaceStatus: 'completed'
  }
}

describe('computeRenderedSidebarWorktreeOrder with machine sections', () => {
  it('skips a status lane only on the machine where it is collapsed', () => {
    const onM5 = repoOn('on-m5')
    const onM1 = repoOn('on-m1', 'runtime:m1')
    const store = createTestStore()
    store.setState({
      repos: [onM5, onM1],
      groupBy: 'workspace-status',
      showWorkspaceHostSections: true,
      collapsedGroups: new Set(['workspace-status:completed:host:runtime:m1'])
    })

    const order = computeRenderedSidebarWorktreeOrder(store.getState(), new Map(), [
      completedWorktree(onM5),
      completedWorktree(onM1)
    ])

    expect(order).toEqual(['on-m5::/on-m5'])
  })
})

describe('computeRenderedSidebarWorktreeOrder under filters', () => {
  it('under Live, the next-workspace shortcut reaches a row inside a project whose saved state is collapsed', () => {
    const project = repoOn('on-m5')
    const store = createTestStore()
    store.setState({
      repos: [project],
      groupBy: 'repo',
      collapsedGroups: new Set(['project:repo:on-m5'])
    })
    const order = () =>
      computeRenderedSidebarWorktreeOrder(store.getState(), new Map(), [completedWorktree(project)])
    expect(order()).toEqual([])

    store.setState({ showOnlyRunningTerminals: true })

    expect(order()).toEqual(['on-m5::/on-m5'])
  })
})

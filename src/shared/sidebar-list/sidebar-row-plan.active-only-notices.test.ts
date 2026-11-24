import { describe, expect, it } from 'vitest'
import { LOCAL_EXECUTION_HOST_ID } from '../execution-host/execution-host'
import type { ProjectGroup } from '../project/groups/project-group-types'
import type { Repo } from '../repository/repo-types'
import type { DetectedWorktree, Worktree } from '../worktree/types'
import { planSidebarRows } from './sidebar-row-plan'

const zkidz: ProjectGroup = {
  id: 'zkidz',
  name: 'ZKidz',
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0
}

function repoIn(id: string): Repo {
  return {
    id,
    path: `/${id}`,
    displayName: id,
    badgeColor: '#737373',
    addedAt: 0,
    projectGroupId: 'zkidz'
  }
}

function worktreeOf(repo: Repo, path: string): Worktree {
  return {
    id: `${repo.id}::${path}`,
    repoId: repo.id,
    path,
    displayName: path,
    branch: 'refs/heads/main',
    head: 'abc123',
    isBare: false,
    isMainWorktree: path === repo.path,
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    comment: '',
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0
  }
}

const live = repoIn('zkidz-courses')
const idle = repoIn('claudewatch')
const hiddenExternal: DetectedWorktree = {
  ...worktreeOf(idle, '/claudewatch/.claude/.worktree/office-audit'),
  ownership: 'external',
  selectedCheckout: false,
  visible: false
}

// Active only lists just the live row; ClaudeWatch has nothing running, only a hidden-worktree notice.
function repoHeaders(hideEmptyProjectGroups: boolean) {
  const repoMap = new Map([live, idle].map((repo) => [repo.id, repo]))
  const worktrees = [worktreeOf(live, live.path)]
  const plan = planSidebarRows({
    groupBy: 'repo',
    sortBy: 'smart',
    worktrees,
    repoMap,
    prGroupOf: () => 'in-progress',
    workspaceStatuses: [],
    projectOrderBy: 'manual',
    lineageById: {},
    worktreeMap: new Map(worktrees.map((worktree) => [worktree.id, worktree])),
    nestLineage: false,
    projectGroups: [zkidz],
    placeholderRepoIds: new Set(),
    importedWorktreesByRepo: new Map([
      [idle.id, { repo: idle, hiddenWorktrees: [hiddenExternal] }]
    ]),
    newExternalWorktreesInboxByRepo: new Map(),
    pendingCreations: [],
    folderWorkspaces: [],
    defaultHostId: LOCAL_EXECUTION_HOST_ID,
    pinnedDisplayPolicy: 'single-location',
    filterRepoIds: [],
    hideEmptyProjectGroups
  })
  return plan
    .render(new Set())
    .flatMap((row) =>
      row.type === 'header' && row.repo ? [{ key: row.key, count: row.count }] : []
    )
}

describe('planSidebarRows under Active only', () => {
  it('lists a project header only when one of its workspaces survives the filter', () => {
    expect(repoHeaders(false).map((header) => header.key)).toContain('repo:claudewatch')
    expect(repoHeaders(true)).toEqual([{ key: 'repo:zkidz-courses', count: 1 }])
  })
})

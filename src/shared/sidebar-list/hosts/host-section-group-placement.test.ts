import { describe, expect, it } from 'vitest'
import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../execution-host/execution-host'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import type { Repo } from '../../repository/repo-types'
import type { Worktree } from '../../worktree/types'
import type { Row } from '../row-types'
import {
  addHostSectionRows,
  type HostSectionOption,
  type HostSectionRow
} from './host-section-rows'

const M1_HOST_ID: ExecutionHostId = 'runtime:m1'

const HOST_OPTIONS: HostSectionOption[] = [
  {
    id: LOCAL_EXECUTION_HOST_ID,
    kind: 'local',
    label: 'M5 Max',
    detail: 'This computer',
    health: 'local'
  },
  { id: M1_HOST_ID, kind: 'runtime', label: 'M1 MAX', detail: 'Host', health: 'available' }
]

function repoOn(id: string, executionHostId?: ExecutionHostId): Repo {
  return {
    id,
    path: `/${id}`,
    displayName: 're-client',
    badgeColor: '#737373',
    addedAt: 1,
    executionHostId
  }
}

function groupOn(id: string, name: string, executionHostId?: ExecutionHostId): ProjectGroup {
  return {
    id,
    name,
    parentPath: null,
    parentGroupId: null,
    createdFrom: 'manual',
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1,
    executionHostId
  }
}

function mainWorktree(repo: Repo): Worktree {
  return {
    id: `${repo.id}::${repo.path}`,
    instanceId: `instance-${repo.id}`,
    repoId: repo.id,
    path: repo.path,
    displayName: 'main',
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
    lastActivityAt: 0
  }
}

function item(repo: Repo, rowKey: string): Row {
  return {
    type: 'item',
    rowKey,
    sectionKey: 'project:re-client',
    worktree: mainWorktree(repo),
    repo,
    depth: 0,
    groupDepth: 1,
    isLastLineageChild: true,
    lineageChildCount: 0
  }
}

function sectionKeys(rows: readonly HostSectionRow[], hostId: ExecutionHostId): string[] {
  const start = rows.findIndex((row) => row.type === 'host-header' && row.hostId === hostId)
  const keys: string[] = []
  for (const row of rows.slice(start + 1)) {
    if (row.type === 'host-header') {
      break
    }
    keys.push(row.type === 'header' ? row.key : row.type === 'item' ? row.rowKey : row.type)
  }
  return keys
}

describe('addHostSectionRows group placement across machines', () => {
  // Each machine files the same repo under its own group (#29535, #27987).
  const localRepo = repoOn('re-client-m5')
  const m1Repo = repoOn('re-client-m1', M1_HOST_ID)
  const rows: Row[] = [
    {
      type: 'header',
      key: 'project-group:GL',
      label: 'DPS',
      count: 1,
      icon: { kind: 'project' },
      projectGroup: groupOn('GL', 'DPS'),
      projectGroupDepth: 0
    },
    {
      type: 'header',
      key: 'project:re-client',
      label: 're-client',
      count: 2,
      icon: { kind: 'project' },
      repo: localRepo,
      hostRepos: new Map([
        [LOCAL_EXECUTION_HOST_ID, localRepo],
        [M1_HOST_ID, m1Repo]
      ]),
      projectGroupDepth: 1
    },
    item(localRepo, 're-client-m5-main'),
    item(m1Repo, 're-client-m1-main'),
    {
      type: 'header',
      key: 'project-group:GM',
      label: 'Jobbify',
      count: 0,
      icon: { kind: 'project' },
      projectGroup: groupOn('GM', 'Jobbify', M1_HOST_ID),
      projectGroupDepth: 0
    }
  ]

  const sectioned = addHostSectionRows({
    rows,
    hostOptions: HOST_OPTIONS,
    workspaceHostScope: LOCAL_EXECUTION_HOST_ID,
    visibleWorkspaceHostIds: [LOCAL_EXECUTION_HOST_ID, M1_HOST_ID],
    defaultHostId: LOCAL_EXECUTION_HOST_ID,
    localHostLabel: 'M5 Max',
    preferProjectGrouping: true
  })

  it('draws no group header above the machine sections', () => {
    expect(sectioned[0]).toMatchObject({ type: 'host-header', hostId: LOCAL_EXECUTION_HOST_ID })
  })

  it("keeps the M5's group out of the M1 section and the M1's group inside it", () => {
    const m1Keys = sectionKeys(sectioned, M1_HOST_ID)
    expect(m1Keys).not.toContain('project-group:GL')
    expect(m1Keys).toContain('project-group:GM')
    expect(m1Keys).toContain('re-client-m1-main')
  })
})

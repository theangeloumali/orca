import { describe, expect, it } from 'vitest'
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../execution-host/execution-host'
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
  return { id, path: `/${id}`, displayName: id, badgeColor: '#737373', addedAt: 1, executionHostId }
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

function projectRows(repo: Repo): Row[] {
  return [
    {
      type: 'header',
      key: `project:${repo.id}`,
      label: repo.id,
      count: 1,
      icon: { kind: 'project' },
      repo
    },
    {
      type: 'item',
      rowKey: `${repo.id}-main`,
      sectionKey: `project:${repo.id}`,
      worktree: mainWorktree(repo),
      repo,
      depth: 0,
      groupDepth: 0,
      isLastLineageChild: true,
      lineageChildCount: 0
    }
  ]
}

function rowKeys(rows: readonly HostSectionRow[]): string[] {
  return rows.map((row) => {
    if (row.type === 'host-header') {
      return `host:${row.hostId}`
    }
    if (row.type === 'header') {
      return row.key
    }
    return row.type === 'item' ? row.rowKey : row.type
  })
}

const ALL_HOST_ROWS = [...projectRows(repoOn('alpha')), ...projectRows(repoOn('beta', M1_HOST_ID))]

describe('addHostSectionRows machine sections', () => {
  it('draws a section per machine under All hosts when machine sections are on', () => {
    const rows = addHostSectionRows({
      rows: ALL_HOST_ROWS,
      hostOptions: HOST_OPTIONS,
      workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
      visibleWorkspaceHostIds: null,
      defaultHostId: LOCAL_EXECUTION_HOST_ID,
      localHostLabel: 'M5 Max',
      preferProjectGrouping: true,
      showHostSections: true
    })

    expect(rowKeys(rows)).toEqual([
      'host:local',
      'project:alpha',
      'alpha-main',
      'host:runtime:m1',
      'project:beta',
      'beta-main'
    ])
  })

  it('keeps the project-first list flat under All hosts when machine sections are off', () => {
    const rows = addHostSectionRows({
      rows: ALL_HOST_ROWS,
      hostOptions: HOST_OPTIONS,
      workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
      visibleWorkspaceHostIds: null,
      defaultHostId: LOCAL_EXECUTION_HOST_ID,
      localHostLabel: 'M5 Max',
      preferProjectGrouping: true,
      showHostSections: false
    })

    expect(rowKeys(rows)).toEqual(['project:alpha', 'alpha-main', 'project:beta', 'beta-main'])
  })
})

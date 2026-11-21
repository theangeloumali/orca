import { describe, expect, it } from 'vitest'
import { buildSidebarRowPlan } from '../grouping/build-rows.test-fixture'
import {
  addHostSectionRows,
  type HostSectionOption
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { getSidebarProjectGrouping } from './sidebar-project-grouping'

const remote = {
  canonicalKey: 'github.com/acme/picklebook',
  remoteName: 'origin',
  remoteUrl: 'git@github.com:acme/picklebook.git'
}
const repo = (
  id: string,
  projectGroupId: string,
  executionHostId?: Repo['executionHostId']
): Repo => ({
  id,
  path: '/pb',
  displayName: 'PickleBook',
  badgeColor: '#000',
  addedAt: 1,
  projectGroupId,
  gitRemoteIdentity: remote,
  executionHostId
})
const group = (
  id: string,
  tabOrder: number,
  executionHostId?: ProjectGroup['executionHostId']
): ProjectGroup => ({
  id,
  name: id,
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1,
  executionHostId
})
const hosts: HostSectionOption[] = [
  { id: 'local', kind: 'local', label: 'M5 Max', detail: 'This computer', health: 'local' },
  { id: 'runtime:m1', kind: 'runtime', label: 'M1 Max', detail: 'Host', health: 'available' }
]
const onM5 = repo('pb-m5', 'work-m5')
const onM1 = repo('pb-m1', 'work-m1', 'runtime:m1')
const workspace: Worktree = {
  id: 'pb-m5::/pb',
  instanceId: 'instance-pb-m5',
  repoId: 'pb-m5',
  path: '/pb',
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

function machineSection(showMachineSections: boolean, hostId: string): string[] {
  const projection = getProjectHostSetupProjectionFromState({ repos: [onM5, onM1] })
  const plan = buildSidebarRowPlan(
    'repo',
    [workspace],
    new Map([
      [onM5.id, onM5],
      [onM1.id, onM1]
    ]),
    null,
    new Set(),
    undefined,
    undefined,
    'manual',
    {},
    undefined,
    false,
    undefined,
    [group('work-m5', 0), group('work-m1', 1, 'runtime:m1')],
    new Set(),
    // M1's copy shows only its "Hiding N discovered worktrees" card, as PickleBook did (2026-11-21).
    new Map([[onM1.id, { repo: onM1, hiddenWorktrees: [] }]]),
    new Map(),
    [],
    getSidebarProjectGrouping(projection, showMachineSections)
  )
  const rows = addHostSectionRows({
    rows: plan.render(new Set()),
    hostOptions: hosts,
    workspaceHostScope: 'all',
    visibleWorkspaceHostIds: null,
    defaultHostId: 'local',
    localHostLabel: 'M5 Max',
    preferProjectGrouping: true,
    showHostSections: true
  })
  const start = rows.findIndex((row) => row.type === 'host-header' && row.hostId === hostId)
  const end = rows.findIndex((row, index) => index > start && row.type === 'host-header')
  return rows
    .slice(start + 1, end === -1 ? undefined : end)
    .map((row) => (row.type === 'header' ? row.key : row.type))
}

describe('getSidebarProjectGrouping', () => {
  it("files each machine's copy of a shared project under that machine's own group", () => {
    expect(machineSection(true, 'runtime:m1')).toEqual([
      'project-group:work-m1',
      'repo:pb-m1',
      'imported-worktrees-card'
    ])
    expect(machineSection(true, 'local')).toEqual(['project-group:work-m5', 'repo:pb-m5', 'item'])
  })

  it('keeps one merged project header in the Projects layout', () => {
    const projection = getProjectHostSetupProjectionFromState({ repos: [onM5, onM1] })
    expect(getSidebarProjectGrouping(projection, false).projects).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { createTestStore } from '@/store/testing/app-store-test-fixture'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { ALL_EXECUTION_HOSTS_SCOPE } from '../../../../../../shared/execution-host/execution-host'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { HostSectionRow } from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import type { GroupHeaderRow } from '../../../../../../shared/sidebar-list/row-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { computeVisibleWorktrees } from './compute-visible-worktrees'
import { computeRenderedSidebarRows } from './rendered-sidebar-worktree-order'
import { buildVisibleWorktreeOptionsFromState } from './visible-worktree-options-from-state'

const remote = {
  canonicalKey: 'github.com/acme/picklebook',
  remoteName: 'origin',
  remoteUrl: 'git@github.com:acme/picklebook.git'
}
const repoOn = (id: string, executionHostId?: Repo['executionHostId']): Repo => ({
  id,
  path: '/pb',
  displayName: 'PickleBook',
  badgeColor: '#000',
  addedAt: 1,
  gitRemoteIdentity: remote,
  executionHostId
})
const workspace = (repo: Repo, name: string, isArchived = false): Worktree => ({
  id: `${repo.id}::/pb/${name}`,
  instanceId: `instance-${repo.id}-${name}`,
  repoId: repo.id,
  path: `/pb/${name}`,
  displayName: name,
  branch: `refs/heads/${name}`,
  head: 'abc123',
  isBare: false,
  isMainWorktree: false,
  linkedIssue: null,
  linkedPR: null,
  linkedLinearIssue: null,
  isArchived,
  comment: '',
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 0
})
const onM5 = repoOn('pb-m5')
const onM1 = repoOn('pb-m1', 'runtime:m1')

/** The project headers the sidebar draws for this catalog, through the real visibility filter. */
function projectHeaders(
  worktrees: Worktree[],
  {
    collapsed = [],
    machineSections = false
  }: { collapsed?: string[]; machineSections?: boolean } = {}
) {
  const worktreesByRepo: Record<string, Worktree[]> = {}
  for (const worktree of worktrees) {
    ;(worktreesByRepo[worktree.repoId] ??= []).push(worktree)
  }
  const store = createTestStore()
  store.setState({
    repos: [onM5, onM1],
    groupBy: 'repo',
    worktreesByRepo,
    collapsedGroups: new Set(collapsed),
    showWorkspaceHostSections: machineSections,
    workspaceHostScope: ALL_EXECUTION_HOSTS_SCOPE,
    visibleWorkspaceHostIds: null
  })
  const state = store.getState()
  const visible = computeVisibleWorktrees(
    selectWorktreesByRepo(state),
    worktrees.map((worktree) => worktree.id),
    buildVisibleWorktreeOptionsFromState(state, new Map(), getIndexedRepoMap(state.repos))
  )
  return computeRenderedSidebarRows(state, new Map(), visible).filter(
    (row: HostSectionRow): row is GroupHeaderRow => row.type === 'header' && row.repo !== undefined
  )
}

describe('project header workspace ids', () => {
  const m5Work = workspace(onM5, 'work')
  const m1Work = workspace(onM1, 'work')

  it('lists every repo id the header covers, each under its own machine', () => {
    const [header] = projectHeaders([m5Work, m1Work])
    expect(header?.worktreeIds).toEqual([m5Work.id, m1Work.id])
    expect(header?.hostWorktreeIds).toEqual(
      new Map([
        ['local', [m5Work.id]],
        ['runtime:m1', [m1Work.id]]
      ])
    )
  })

  it('keeps the ids on a collapsed header', () => {
    const [open] = projectHeaders([m5Work, m1Work])
    const [collapsed] = projectHeaders([m5Work, m1Work], { collapsed: [open?.key ?? ''] })
    expect(collapsed?.worktreeIds).toEqual([m5Work.id, m1Work.id])
  })

  it("gives a machine section's header only that machine's workspaces", () => {
    const [local] = projectHeaders([m5Work, m1Work], { machineSections: true })
    expect([local?.hostId, local?.worktreeIds]).toEqual(['local', [m5Work.id]])
  })

  it('leaves out an archived workspace', () => {
    const archived = workspace(onM5, 'old', true)
    const [header] = projectHeaders([m5Work, archived])
    expect(header?.worktreeIds).toEqual([m5Work.id])
    expect(header?.hostWorktreeIds).toEqual(new Map([['local', [m5Work.id]]]))
  })
})

import { describe, expect, it } from 'vitest'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type {
  HostHeaderRow,
  HostSectionRow
} from '../../../../../../shared/sidebar-list/hosts/host-section-rows'
import { suggestClientGroups } from '../../../../../../shared/project/groups/client-suggestions'
import { makeWorktree } from '../../../../store/slices/worktrees/worktree.test-fixture'
import { estimateRenderRowSize, HOST_HEADER_ROW_HEIGHT } from '../viewport/virtual-rows'
import {
  getClientGroupingHintRows,
  insertClientGroupingHintRows
} from './client-grouping-hint-rows'

function project(id: string, client = 'ZKidz', extra: Partial<Repo> = {}): Repo {
  return {
    id,
    path: `/Users/me/Work/${client}/${id}`,
    displayName: id,
    badgeColor: '#000',
    addedAt: 0,
    ...extra
  }
}

function header(key: string): HostSectionRow {
  return { type: 'header', key, count: 1, icon: { kind: key === 'pinned' ? 'pinned' : 'project' } }
}

function item(sectionKey: string): HostSectionRow {
  return {
    type: 'item',
    rowKey: `${sectionKey}:wt`,
    sectionKey,
    worktree: makeWorktree({ id: 'wt', repoId: 'orca' }),
    repo: undefined,
    depth: 0,
    groupDepth: 0,
    isLastLineageChild: false,
    lineageChildCount: 0
  }
}

function hostHeader(hostId: ExecutionHostId, collapsed = false): HostHeaderRow {
  return {
    type: 'host-header',
    key: `host:${hostId}`,
    hostId,
    kind: hostId === 'local' ? 'local' : 'ssh',
    label: hostId,
    detail: '',
    health: hostId === 'local' ? 'local' : 'available',
    collapsed,
    count: 0,
    defaultHostId: 'local'
  }
}

const zkidz = [project('orca'), project('aicc'), project('site')]
const hintsFor = (repos: Repo[], dismissed: string | null = null) =>
  getClientGroupingHintRows(suggestClientGroups({ repos, projectGroups: [] }), dismissed)

describe('getClientGroupingHintRows', () => {
  it('offers nothing until three ungrouped projects share a client', () => {
    expect(hintsFor(zkidz.slice(0, 2)).size).toBe(0)
  })

  it("counts every suggested project on the machine, and only that machine's", () => {
    const hints = hintsFor([...zkidz, project('web', 'Acme'), project('app', 'Acme')])
    expect(hints.get('local')?.projectCount).toBe(5)
    expect(hints.has('ssh:box')).toBe(false)
  })

  it('stays dismissed for the same projects and returns when a new one is suggested', () => {
    const dismissed = hintsFor(zkidz).get('local')?.suggestionsKey ?? null
    expect(hintsFor(zkidz, dismissed).size).toBe(0)
    expect(hintsFor([...zkidz, project('docs')], dismissed).get('local')?.projectCount).toBe(4)
  })
})

describe('insertClientGroupingHintRows', () => {
  it('puts the hint in its own row under an open machine header only', () => {
    const hints = hintsFor(zkidz)
    const open = insertClientGroupingHintRows([hostHeader('local'), hostHeader('ssh:box')], hints)
    expect(open.map((row) => row.type)).toEqual([
      'host-header',
      'client-grouping-hint',
      'host-header'
    ])
    const collapsed = insertClientGroupingHintRows([hostHeader('local', true)], hints)
    expect(collapsed.map((row) => row.type)).toEqual(['host-header'])
  })

  it('puts one hint at the top of a flat list, for this computer only', () => {
    const rows = [header('repo:orca'), item('repo:orca')]
    const flat = insertClientGroupingHintRows(rows, hintsFor(zkidz))
    expect(flat.map((row) => row.type)).toEqual(['client-grouping-hint', 'header', 'item'])
    const remoteOnly = hintsFor(zkidz.map((repo) => ({ ...repo, connectionId: 'box' })))
    expect(insertClientGroupingHintRows(rows, remoteOnly)).toBe(rows)
  })

  it('puts the flat-list hint below the Pinned section', () => {
    const rows = [header('pinned'), item('pinned'), item('pinned'), header('repo:orca')]
    const flat = insertClientGroupingHintRows(rows, hintsFor(zkidz))
    expect(flat.map((row) => row.type)).toEqual([
      'header',
      'item',
      'item',
      'client-grouping-hint',
      'header'
    ])
  })

  it('gives the hint row its own height, so the rows below it start lower', () => {
    const rows: HostSectionRow[] = insertClientGroupingHintRows(
      [hostHeader('local'), hostHeader('ssh:box')],
      hintsFor(zkidz)
    )
    const sizes = rows.map((_, index) => estimateRenderRowSize(rows, index, 0, null))
    const starts = sizes.map((_, index) =>
      sizes.slice(0, index).reduce((sum, size) => sum + size, 0)
    )
    const headerSize = HOST_HEADER_ROW_HEIGHT + 6
    // The next machine header starts below the hint instead of under it.
    expect(starts).toEqual([0, headerSize, headerSize + 28 + 6])
  })
})

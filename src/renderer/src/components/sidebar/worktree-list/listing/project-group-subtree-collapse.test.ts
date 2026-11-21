import { describe, expect, it } from 'vitest'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getProjectHeaderRevealTarget } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import { getSidebarProjectGrouping } from './sidebar-project-grouping'
import {
  getProjectGroupSubtreeCollapseKeys,
  toggleProjectGroupSubtreeCollapsed
} from './project-group-subtree-collapse'

const repo = (
  id: string,
  projectGroupId: string,
  executionHostId?: Repo['executionHostId']
): Repo => ({
  id,
  path: `/${id}`,
  displayName: id,
  badgeColor: '#000',
  addedAt: 1,
  projectGroupId,
  executionHostId
})
const group = (id: string, parentGroupId: string | null): ProjectGroup => ({
  id,
  name: id,
  parentPath: null,
  parentGroupId,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
})

// work > client > archive, plus an unrelated sibling root.
const groups = [
  group('work', null),
  group('client', 'work'),
  group('archive', 'client'),
  group('home', null)
]
const repos = [
  repo('api', 'work'),
  repo('web', 'client'),
  repo('old', 'archive'),
  repo('old-m1', 'archive', 'runtime:m1'),
  repo('blog', 'home')
]

function keysFor(groupId: string, showMachineSections: boolean): string[] {
  const projection = getProjectHostSetupProjectionFromState({ repos })
  const grouping = getSidebarProjectGrouping(projection, showMachineSections)
  return getProjectGroupSubtreeCollapseKeys(groupId, groups, repos, grouping)
}

function headerKey(repoId: string, showMachineSections: boolean): string {
  const projection = getProjectHostSetupProjectionFromState({ repos })
  return getProjectHeaderRevealTarget(
    repoId,
    new Map(repos.map((entry) => [entry.id, entry])),
    getSidebarProjectGrouping(projection, showMachineSections)
  ).key
}

describe('getProjectGroupSubtreeCollapseKeys', () => {
  it('lists nested group keys and every project header beneath, but not the group itself', () => {
    const keys = keysFor('work', false)
    expect(new Set(keys)).toEqual(
      new Set([
        'project-group:client',
        'project-group:archive',
        ...['api', 'web', 'old', 'old-m1'].map((id) => headerKey(id, false))
      ])
    )
    expect(keys).not.toContain('project-group:work')
    expect(keys).not.toContain(headerKey('blog', false))
  })

  it('starts from a middle level', () => {
    expect(new Set(keysFor('client', false))).toEqual(
      new Set([
        'project-group:archive',
        ...['web', 'old', 'old-m1'].map((id) => headerKey(id, false))
      ])
    )
  })

  it("gives another machine's copy its own repo key in machine sections", () => {
    const keys = keysFor('work', true)
    expect(keys).toContain('repo:old-m1')
    expect(keys).toContain(headerKey('old', true))
    expect(headerKey('old', true)).not.toBe('repo:old-m1')
  })

  it('is empty when every project beneath is hidden', () => {
    const hiddenOnly = [{ ...repo('gone', 'archive'), hiddenAt: 5 }]
    const keys = getProjectGroupSubtreeCollapseKeys('client', groups, hiddenOnly, {
      projects: [],
      projectHostSetups: []
    })
    expect(keys).toEqual([])
  })

  it('leaves hidden projects out of a listed subtree', () => {
    const mixed = [repo('web', 'client'), { ...repo('gone', 'client'), hiddenAt: 5 }]
    const grouping = getSidebarProjectGrouping(
      getProjectHostSetupProjectionFromState({ repos: mixed }),
      false
    )
    const keys = getProjectGroupSubtreeCollapseKeys('client', groups, mixed, grouping)
    const repoMap = new Map(mixed.map((entry) => [entry.id, entry]))
    expect(keys).toContain(getProjectHeaderRevealTarget('web', repoMap, grouping).key)
    expect(keys).not.toContain(getProjectHeaderRevealTarget('gone', repoMap, grouping).key)
  })

  it('follows the last host copy of a group, as the drawn tree does', () => {
    // The same group id on two hosts: the last copy moved it from work to home.
    const copies = [
      group('work', null),
      group('moved', 'work'),
      group('home', null),
      group('moved', 'home')
    ]
    const keys = getProjectGroupSubtreeCollapseKeys('work', copies, [repo('m', 'moved')], {
      projects: [],
      projectHostSetups: []
    })
    expect(keys).toEqual([])
  })

  it('stays finite when parent links form a cycle', () => {
    const cyclic = [group('a', 'c'), group('b', 'a'), group('c', 'b')]
    const keys = getProjectGroupSubtreeCollapseKeys('a', cyclic, [repo('leaf', 'c')], {
      projects: [],
      projectHostSetups: []
    })
    expect(new Set(keys)).toEqual(new Set(['project-group:b', 'project-group:c', 'repo:leaf']))
  })
})

describe('toggleProjectGroupSubtreeCollapsed', () => {
  const subtree = ['project-group:client', 'project:web']

  it('collapses everything while anything is still open', () => {
    const next = toggleProjectGroupSubtreeCollapsed(new Set(['project:web', 'other']), subtree)
    expect(next).toEqual(new Set(['project:web', 'other', 'project-group:client']))
  })

  it('expands everything once all of it is collapsed, leaving other keys', () => {
    const next = toggleProjectGroupSubtreeCollapsed(new Set([...subtree, 'other']), subtree)
    expect(next).toEqual(new Set(['other']))
  })
})

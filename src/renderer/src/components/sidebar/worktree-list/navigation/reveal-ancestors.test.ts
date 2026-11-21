import { describe, expect, it } from 'vitest'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getSidebarRowRevealAncestorKeys } from './reveal-ancestors'

const group = (id: string, executionHostId?: ProjectGroup['executionHostId']): ProjectGroup => ({
  id,
  name: id,
  parentPath: null,
  parentGroupId: null,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1,
  executionHostId
})
const onM1: Repo = {
  id: 'pb-m1',
  path: '/pb',
  displayName: 'PickleBook',
  badgeColor: '#000',
  addedAt: 1,
  projectGroupId: 'work-m1',
  executionHostId: 'runtime:m1'
}
const projectGroups = [group('work-m1', 'runtime:m1')]
const repoMap = new Map([[onM1.id, onM1]])

describe('getSidebarRowRevealAncestorKeys', () => {
  it('opens the owning machine section first when machine sections are shown', () => {
    const reveal = (rowKey: string, hostSections: boolean) =>
      getSidebarRowRevealAncestorKeys({ rowKey, repoMap, projectGroups, hostSections })
    expect(reveal('repo:pb-m1', true)).toEqual(['host:runtime:m1', 'project-group:work-m1'])
    expect(reveal('project-group:work-m1', true)).toEqual(['host:runtime:m1'])
    expect(reveal('repo:pb-m1', false)).toEqual(['project-group:work-m1'])
  })
})

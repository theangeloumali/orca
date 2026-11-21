import { describe, expect, it } from 'vitest'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import { getSidebarProjectGrouping } from '../listing/sidebar-project-grouping'
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

  it("unfolds only this computer's section for its copy of a shared project", () => {
    const remote = {
      canonicalKey: 'github.com/acme/picklebook',
      remoteName: 'origin',
      remoteUrl: 'x'
    }
    const onM5: Repo = {
      ...onM1,
      id: 'pb-m5',
      projectGroupId: undefined,
      executionHostId: undefined,
      gitRemoteIdentity: remote
    }
    const m1Copy: Repo = { ...onM1, gitRemoteIdentity: remote }
    const repos = [onM5, m1Copy]
    const projectGrouping = getSidebarProjectGrouping(
      getProjectHostSetupProjectionFromState({ repos }),
      true
    )
    expect(
      getSidebarRowRevealAncestorKeys({
        rowKey: 'project:github:acme/picklebook',
        repoMap: new Map(repos.map((repo) => [repo.id, repo])),
        projectGroups,
        projectGrouping,
        hostSections: true
      })
    ).toEqual(['host:local'])
  })
})

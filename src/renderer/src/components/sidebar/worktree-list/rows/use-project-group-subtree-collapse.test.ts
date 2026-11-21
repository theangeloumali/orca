import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { getVisibleProjectGroupSubtreeKeys } from './use-project-group-subtree-collapse'

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
const group = (
  id: string,
  parentGroupId: string | null,
  executionHostId?: ProjectGroup['executionHostId']
): ProjectGroup => ({
  id,
  name: id,
  parentPath: null,
  parentGroupId,
  executionHostId,
  createdFrom: 'manual',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
})

function keysFor(
  groupId: string,
  catalog: { repos: Repo[]; projectGroups: ProjectGroup[] },
  visibleWorkspaceHostIds: ExecutionHostId[] | null
): string[] {
  return getVisibleProjectGroupSubtreeKeys(
    {
      ...catalog,
      showWorkspaceHostSections: false,
      visibleWorkspaceHostIds,
      workspaceHostScope: 'all'
    },
    groupId
  )
}

describe('getVisibleProjectGroupSubtreeKeys', () => {
  const projectGroups = [group('work', null), group('remote', 'work', 'runtime:m1')]

  it('leaves out a subgroup whose host the filter hides', () => {
    expect(keysFor('work', { repos: [], projectGroups }, ['local'])).toEqual([])
    expect(keysFor('work', { repos: [], projectGroups }, null)).toEqual(['project-group:remote'])
  })

  it('leaves out a project whose host the filter hides', () => {
    const repos = [repo('api', 'work'), repo('api-m1', 'work', 'runtime:m1')]
    const keys = keysFor('work', { repos, projectGroups: [group('work', null)] }, ['local'])
    expect(keys).toHaveLength(1)
    expect(keys.join()).not.toContain('api-m1')
  })

  it('has no subtree when everything beneath sits on a hidden host', () => {
    const repos = [repo('api-m1', 'remote', 'runtime:m1')]
    expect(keysFor('work', { repos, projectGroups }, ['local'])).toEqual([])
  })
})

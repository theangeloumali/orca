import { describe, expect, it } from 'vitest'
import { walkProjectGroupTree } from './project-group-tree'
import type { ProjectGroup } from '../../project/groups/project-group-types'

function group(id: string, tabOrder: number, parentGroupId: string | null = null): ProjectGroup {
  return {
    id,
    name: id,
    parentPath: null,
    parentGroupId,
    createdFrom: 'manual',
    tabOrder,
    isCollapsed: false,
    color: null,
    createdAt: 0,
    updatedAt: 0
  }
}

function listedGroups(hideEmptyGroups: boolean): string[] {
  const listed: string[] = []
  walkProjectGroupTree(
    {
      entries: [],
      projectGroups: [group('busy', 0), group('empty', 1), group('nested', 2, 'busy')],
      folderCountByGroupId: new Map([['nested', 1]]),
      projectOrderBy: 'manual',
      repoOrder: undefined,
      hideEmptyGroups
    },
    {
      group: (projectGroup) => {
        listed.push(projectGroup.id)
        return true
      },
      projects: () => {}
    }
  )
  return listed
}

describe('walkProjectGroupTree hideEmptyGroups', () => {
  it('skips a group with nothing under it and keeps one whose subgroup has rows', () => {
    expect(listedGroups(true)).toEqual(['busy', 'nested'])
  })

  it('lists empty groups when off', () => {
    expect(listedGroups(false)).toEqual(['busy', 'nested', 'empty'])
  })
})

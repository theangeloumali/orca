import { describe, expect, it } from 'vitest'
import {
  filterProjectGroupsForOwnerHost,
  getProjectGroupMoveTargets
} from './project-group-move-targets'

const group = (id: string, name: string, parentGroupId: string | null, tabOrder: number) => ({
  id,
  name,
  parentGroupId,
  tabOrder
})

describe('filterProjectGroupsForOwnerHost', () => {
  it("keeps one machine's groups and counts unstamped ones as this computer's", () => {
    const groups = [
      { id: 'unstamped', executionHostId: undefined, connectionId: null },
      { id: 'on-m1', executionHostId: 'runtime:m1', connectionId: null },
      { id: 'on-msi', executionHostId: 'runtime:msi', connectionId: null }
    ]

    expect(filterProjectGroupsForOwnerHost(groups, 'runtime:m1').map((group) => group.id)).toEqual([
      'on-m1'
    ])
    expect(filterProjectGroupsForOwnerHost(groups, 'local').map((group) => group.id)).toEqual([
      'unstamped'
    ])
  })
})

describe('getProjectGroupMoveTargets', () => {
  it('lists groups as an indented tree and disables the moving group and its subgroups', () => {
    const groups = [
      group('dps', 'DPS', 'work', 2),
      group('work', 'Work M5 Max', null, 0),
      group('zkidz', 'ZKidz', 'work', 1),
      group('one', 'OnePuhunan', null, 3),
      group('films', 'Films', 'zkidz', 0)
    ]

    expect(getProjectGroupMoveTargets(groups, 'zkidz')).toEqual([
      { id: 'work', name: 'Work M5 Max', depth: 0, disabled: false },
      { id: 'zkidz', name: 'ZKidz', depth: 1, disabled: true },
      { id: 'films', name: 'Films', depth: 2, disabled: true },
      { id: 'dps', name: 'DPS', depth: 1, disabled: false },
      { id: 'one', name: 'OnePuhunan', depth: 0, disabled: false }
    ])
  })
})

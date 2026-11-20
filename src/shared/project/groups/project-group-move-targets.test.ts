import { describe, expect, it } from 'vitest'
import { getProjectGroupMoveTargets } from './project-group-move-targets'

const group = (id: string, name: string, parentGroupId: string | null, tabOrder: number) => ({
  id,
  name,
  parentGroupId,
  tabOrder
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

import { describe, expect, it } from 'vitest'
import { findProjectGroupNestTarget } from './project-group-header-nest-drop'

// Headers are 30px tall; the middle band of "work" runs from 109 to 121.
const rects = [
  { groupId: 'work', top: 100, bottom: 130 },
  { groupId: 'zkidz', top: 140, bottom: 170 },
  { groupId: 'films', top: 180, bottom: 210 },
  { groupId: 'm1-group', top: 220, bottom: 250 }
]
const parentById = new Map<string, string | null>([
  ['work', null],
  ['zkidz', 'work'],
  ['films', 'zkidz'],
  ['one', null],
  ['m1-group', null]
])
const hostById = new Map<string, string | null>([
  ['work', 'local'],
  ['zkidz', 'local'],
  ['films', 'local'],
  ['one', 'local'],
  ['m1-group', 'runtime:m1']
])
const find = (pointerContentY: number, draggedGroupId: string) =>
  findProjectGroupNestTarget({
    pointerContentY,
    rects,
    draggedGroupId,
    parentById,
    ownerHostIdById: hostById
  })?.groupId ?? null

describe('findProjectGroupNestTarget', () => {
  it('nests into a group when the pointer is over the middle of its header', () => {
    expect(find(115, 'one')).toBe('work')
  })

  it('leaves the top and bottom edges of a header to reordering', () => {
    expect(find(103, 'one')).toBeNull()
    expect(find(127, 'one')).toBeNull()
  })

  it("refuses the group itself, its own subgroups, its current parent and another machine's group", () => {
    expect(find(115, 'work')).toBeNull()
    expect(find(195, 'zkidz')).toBeNull()
    expect(find(155, 'films')).toBeNull()
    expect(find(235, 'one')).toBeNull()
  })
})

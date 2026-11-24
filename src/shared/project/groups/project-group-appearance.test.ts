import { describe, expect, it } from 'vitest'
import {
  projectGroupColorUpdate,
  projectGroupOwnerColor,
  resolveProjectGroupColor,
  resolveProjectGroupTint,
  setProjectGroupTint
} from './project-group-appearance'

type GroupLink = { id: string; parentGroupId: string | null; color: string | null }

function groupsById(...groups: GroupLink[]): ReadonlyMap<string, GroupLink> {
  return new Map(groups.map((group) => [group.id, group]))
}

const ROOT = { id: 'root', parentGroupId: null, color: '#ef4444' }
const CHILD = { id: 'child', parentGroupId: 'root', color: null }
const COLORED_CHILD = { id: 'colored-child', parentGroupId: 'plain', color: '#22c55e' }
const PLAIN = { id: 'plain', parentGroupId: null, color: null }

describe('project group appearance', () => {
  it('gives an uncolored nested group its nearest colored ancestor', () => {
    expect(resolveProjectGroupColor(groupsById(ROOT, CHILD), 'child')).toEqual({
      groupId: 'root',
      color: '#ef4444'
    })
  })

  it('lets a colored nested group win inside an uncolored parent', () => {
    expect(resolveProjectGroupColor(groupsById(PLAIN, COLORED_CHILD), 'colored-child')).toEqual({
      groupId: 'colored-child',
      color: '#22c55e'
    })
  })

  it('resolves no color so the machine tint applies', () => {
    expect(resolveProjectGroupColor(groupsById(PLAIN), 'plain')).toBeNull()
    expect(resolveProjectGroupColor(groupsById(ROOT), null)).toBeNull()
    expect(resolveProjectGroupColor(groupsById(ROOT), 'missing')).toBeNull()
  })

  it('ignores a stored invalid hex and stops on a parent cycle', () => {
    const broken = { id: 'broken', parentGroupId: null, color: 'not-a-color' }
    const a = { id: 'a', parentGroupId: 'b', color: null }
    const b = { id: 'b', parentGroupId: 'a', color: null }
    expect(resolveProjectGroupColor(groupsById(broken), 'broken')).toBeNull()
    expect(resolveProjectGroupColor(groupsById(a, b), 'a')).toBeNull()
  })

  it('clears the color for None and rejects an invalid hex', () => {
    expect(projectGroupColorUpdate(null)).toEqual({ color: null })
    expect(projectGroupColorUpdate('#ABC')).toEqual({ color: '#aabbcc' })
    expect(projectGroupColorUpdate('nope')).toBeNull()
  })

  it('defaults the background to subtle and accepts only known tints', () => {
    expect(resolveProjectGroupTint(undefined, 'root')).toBe('subtle')
    expect(resolveProjectGroupTint({ root: 'strong' }, 'root')).toBe('strong')
    expect(resolveProjectGroupTint({ root: 'off' }, 'root')).toBe('off')
  })

  it('stores every explicit choice, so a nested group can pick Subtle under a Strong parent', () => {
    expect(setProjectGroupTint({ root: 'strong' }, 'child', 'subtle')).toEqual({
      root: 'strong',
      child: 'subtle'
    })
    expect(setProjectGroupTint(undefined, 'root', 'strong')).toEqual({ root: 'strong' })
  })

  it('reads a group color from its first copy with a valid hex', () => {
    const copies = [
      { ...PLAIN, color: 'not-a-color' },
      { ...PLAIN, color: '#22C55E' },
      { ...PLAIN, color: '#ef4444' }
    ]
    expect(projectGroupOwnerColor(copies, 'plain')).toBe('#22c55e')
    expect(projectGroupOwnerColor([PLAIN], 'plain')).toBeNull()
  })
})

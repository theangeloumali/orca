import { describe, expect, it } from 'vitest'
import { buildGroupFolds, isSubtreeFolded } from './project-group-fold'
import type { GroupTreePlacement } from './project-group-tree-sections'
import type { Worktree } from '../workspace-list/workspace-list-types'

const row = (id: string, needsYou = false) => ({ id, needsYou }) as unknown as Worktree
const at = (...ancestorKeys: string[]): GroupTreePlacement => ({ ancestorKeys, rowView: {} })

describe('buildGroupFolds', () => {
  const sections = [
    { key: 'group:a', isProjectGroup: true, data: [] },
    { key: 'repo:1', data: [row('1', true), row('2')] },
    { key: 'group:b', isProjectGroup: true, data: [] },
    { key: 'repo:2', data: [row('3', true)] },
    { key: 'repo:3', data: [row('4')] }
  ]
  const placements = new Map([
    ['group:a', at()],
    ['repo:1', at('group:a')],
    ['group:b', at('group:a')],
    ['repo:2', at('group:a', 'group:b')],
    ['repo:3', at()]
  ])
  const folds = buildGroupFolds(
    sections,
    placements,
    (r) => (r as unknown as { needsYou: boolean }).needsYou
  )

  it('counts every project and needs-you row beneath a group, subgroups included', () => {
    expect(folds.get('group:a')).toMatchObject({ projects: 2, needsYou: 2 })
    expect(folds.get('group:b')).toMatchObject({ projects: 1, needsYou: 1 })
  })

  it('lists the keys beneath a group so its whole subtree can fold at once', () => {
    expect(folds.get('group:a')?.subtreeKeys).toEqual(['repo:1', 'group:b', 'repo:2'])
  })

  it('gives root projects no fold', () => {
    expect(folds.has('repo:3')).toBe(false)
  })
})

describe('isSubtreeFolded', () => {
  it('is true only when everything beneath is already folded, as the desktop toggle reads it', () => {
    expect(isSubtreeFolded(['x', 'y'], new Set(['x', 'y']))).toBe(true)
    expect(isSubtreeFolded(['x', 'y'], new Set(['x']))).toBe(false)
    expect(isSubtreeFolded([], new Set())).toBe(false)
  })
})

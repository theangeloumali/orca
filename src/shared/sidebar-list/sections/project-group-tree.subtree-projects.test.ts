import { describe, expect, it } from 'vitest'
import { countProjectGroupSubtreeProjects } from './project-group-tree'

describe('countProjectGroupSubtreeProjects', () => {
  it('counts projects filed anywhere in the subtree and leaves hidden ones out', () => {
    const repos = [
      { projectGroupId: 'client' },
      { projectGroupId: 'nested' },
      { projectGroupId: 'nested', hiddenAt: 5 },
      { projectGroupId: 'elsewhere' },
      { projectGroupId: undefined }
    ]
    expect(countProjectGroupSubtreeProjects(new Set(['client', 'nested']), repos)).toBe(2)
  })
})

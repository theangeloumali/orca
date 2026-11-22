import { describe, expect, it } from 'vitest'
import { countProjectGroupSubtreeProjects } from './project-group-tree'

describe('countProjectGroupSubtreeProjects', () => {
  it('counts projects filed anywhere in the subtree and leaves hidden ones out', () => {
    const repos = [
      { id: 'a', projectGroupId: 'client' },
      { id: 'b', projectGroupId: 'nested' },
      { id: 'c', projectGroupId: 'nested', hiddenAt: 5 },
      { id: 'd', projectGroupId: 'elsewhere' },
      { id: 'e', projectGroupId: undefined }
    ]
    expect(countProjectGroupSubtreeProjects(new Set(['client', 'nested']), repos)).toBe(2)
  })

  it("counts a project once when two machines' copies are filed in the group", () => {
    const repos = [
      { id: 'orca', projectGroupId: 'client' },
      { id: 'orca', projectGroupId: 'client', executionHostId: 'runtime:m1' },
      { id: 'docs', projectGroupId: 'nested' }
    ]
    expect(countProjectGroupSubtreeProjects(new Set(['client', 'nested']), repos)).toBe(2)
  })
})

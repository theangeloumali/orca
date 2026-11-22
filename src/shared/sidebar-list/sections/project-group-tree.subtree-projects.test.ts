import { describe, expect, it } from 'vitest'
import { getProjectGroupSubtreeProjectKeys } from './project-group-tree'
import type { ProjectSectionModel } from './project-section-grouping'

const subtree = new Set(['client', 'nested'])
const repo = (id: string, projectGroupId?: string, extra: { hiddenAt?: number } = {}) => ({
  id,
  displayName: id,
  projectGroupId,
  ...extra
})
const noProjects: ProjectSectionModel = { projects: [], projectHostSetups: [] }
const setup = (repoId: string, hostId: 'local' | 'ssh:box') => ({
  id: `setup-${repoId}`,
  projectId: 'orca',
  hostId,
  repoId,
  path: `/${repoId}`,
  displayName: repoId,
  setupMethod: 'legacy-repo' as const
})

describe('getProjectGroupSubtreeProjectKeys', () => {
  it('lists projects filed anywhere in the subtree and leaves hidden ones out', () => {
    const repos = [
      repo('a', 'client'),
      repo('b', 'nested'),
      repo('c', 'nested', { hiddenAt: 5 }),
      repo('d', 'elsewhere'),
      repo('e')
    ]
    expect(getProjectGroupSubtreeProjectKeys(subtree, repos, noProjects).size).toBe(2)
  })

  it("counts a project once when two machines' copies are filed in the group", () => {
    const repos = [repo('orca', 'client'), repo('orca', 'client'), repo('docs', 'nested')]
    expect(getProjectGroupSubtreeProjectKeys(subtree, repos, noProjects).size).toBe(2)
  })

  it('counts two repos of one project once, as the sidebar draws one header', () => {
    const repos = [repo('orca-mac', 'client'), repo('orca-box', 'nested'), repo('docs', 'client')]
    const grouping: ProjectSectionModel = {
      projects: [{ id: 'orca', displayName: 'Orca' }],
      projectHostSetups: [setup('orca-mac', 'local'), setup('orca-box', 'ssh:box')]
    }
    expect([...getProjectGroupSubtreeProjectKeys(subtree, repos, grouping)]).toEqual([
      'project:orca',
      'repo:docs'
    ])
  })
})

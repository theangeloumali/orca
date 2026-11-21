import { describe, expect, it } from 'vitest'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { Repo } from '../../../../shared/repository/repo-types'
import { buildPaletteFilterModel } from './palette-filter-options'
import { searchCmdJProjectResults } from './palette-project-results'

const remote = {
  canonicalKey: 'github.com/acme/picklebook',
  remoteName: 'origin',
  remoteUrl: 'git@github.com:acme/picklebook.git'
}
const repo = (id: string, executionHostId?: Repo['executionHostId']): Repo => ({
  id,
  path: '/pb',
  displayName: 'PickleBook',
  badgeColor: '#000',
  addedAt: 1,
  gitRemoteIdentity: remote,
  executionHostId
})
const repos = [repo('pb-m5'), repo('pb-m1', 'runtime:m1')]
const { projects, setups } = getProjectHostSetupProjectionFromState({ repos })

// Cmd-J must key projects exactly as the sidebar draws them (#29535).
describe('Cmd-J project rows with machine sections', () => {
  it("returns one result per machine's copy when machine sections are on", () => {
    const search = (showMachineSections: boolean) =>
      searchCmdJProjectResults({
        query: 'pickle',
        projectGroups: [],
        repos,
        projects,
        projectHostSetups: setups,
        showMachineSections
      }).map((result) => result.rowKey)
    expect(search(true)).toEqual(['repo:pb-m5', 'repo:pb-m1'])
    expect(search(false)).toHaveLength(1)
  })

  it("filters by each machine's own project row key", () => {
    const model = buildPaletteFilterModel({
      repos,
      worktrees: [],
      hostOptions: [],
      projects,
      projectHostSetups: setups,
      showMachineSections: true
    })
    expect(Object.fromEntries(model.repoIdsByProjectKey)).toEqual({
      'repo:pb-m5': ['pb-m5'],
      'repo:pb-m1': ['pb-m1']
    })
  })
})

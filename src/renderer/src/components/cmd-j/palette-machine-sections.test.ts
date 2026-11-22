import { describe, expect, it } from 'vitest'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import type { Repo } from '../../../../shared/repository/repo-types'
import { makeProjectGroup } from '../../../../shared/folder-workspaces/folder-workspace-host-routing.test-fixture'
import { buildPaletteFilterModel } from './palette-filter-options'
import { getPaletteHostBadge } from './palette-host-badge'
import { getProjectTargetHostId, searchCmdJProjectResults } from './palette-project-results'

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
        showMachineSections,
        defaultHostId: 'local'
      }).map((result) => result.rowKey)
    expect(search(true)).toEqual(['project:github:acme/picklebook', 'repo:pb-m1'])
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
      'project:github:acme/picklebook': ['pb-m5'],
      'repo:pb-m1': ['pb-m1']
    })
  })
})

describe('Cmd-J project-group rows', () => {
  it("carry the group's own machine so the row can show its device chip", () => {
    const results = searchCmdJProjectResults({
      query: 'clients',
      projectGroups: [
        makeProjectGroup({ id: 'g1', name: 'Clients', executionHostId: 'runtime:m1' }),
        makeProjectGroup({ id: 'g2', name: 'Clients two' })
      ],
      repos: [],
      projects: [],
      projectHostSetups: [],
      showMachineSections: false,
      defaultHostId: 'local'
    })
    expect(
      results.map((result) => (result.kind === 'project-group' ? result.hostId : null))
    ).toEqual(['runtime:m1', 'local'])
  })

  it('give a remote group row its device chip and leave a local one bare', () => {
    const results = searchCmdJProjectResults({
      query: 'clients',
      projectGroups: [
        makeProjectGroup({ id: 'g1', name: 'Clients', executionHostId: 'runtime:m1' }),
        makeProjectGroup({ id: 'g2', name: 'Clients two' })
      ],
      repos: [],
      projects: [],
      projectHostSetups: [],
      showMachineSections: false,
      defaultHostId: 'local'
    })
    const hostOptions = [
      {
        id: 'local' as const,
        label: 'This Mac',
        detail: '',
        kind: 'local' as const,
        health: 'local' as const,
        presence: 'local' as const
      },
      {
        id: 'runtime:m1' as const,
        label: 'M1',
        detail: '',
        kind: 'runtime' as const,
        health: 'available' as const,
        presence: 'project' as const
      }
    ]
    const context = { hostOptions, hostFilterActive: false, machineCount: 2 }
    expect(
      results.map(
        (result) => getPaletteHostBadge(getProjectTargetHostId(result), context)?.label ?? null
      )
    ).toEqual(['M1', null])
  })

  it("use a project row's repo machine", () => {
    const m1Repos = [repo('pb-m1', 'runtime:m1')]
    const projection = getProjectHostSetupProjectionFromState({ repos: m1Repos })
    const [result] = searchCmdJProjectResults({
      query: 'pickle',
      projectGroups: [],
      repos: m1Repos,
      projects: projection.projects,
      projectHostSetups: projection.setups,
      showMachineSections: false,
      defaultHostId: 'local'
    })
    expect(getProjectTargetHostId(result)).toBe('runtime:m1')
  })
})

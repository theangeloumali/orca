import { describe, expect, it, vi } from 'vitest'
import {
  applyAllChip,
  clientGroupRepoIds,
  countRepoMachines,
  findActiveClientGroupId,
  followClientMembership,
  isThisMachineChipOn,
  listClientChoices,
  toggleThisMachineChip,
  type QuickFilterChipState,
  type QuickFilterChipSetters
} from './quick-filter-chips'

function spySetters(): QuickFilterChipSetters {
  return {
    setShowOnlyRunningTerminals: vi.fn(),
    setShowOnlyNeedsYou: vi.fn(),
    setVisibleWorkspaceHostIds: vi.fn(),
    setHostIdsBeforeThisMachineChip: vi.fn(),
    setFilterRepoIds: vi.fn()
  }
}

const idle: QuickFilterChipState = {
  showOnlyRunningTerminals: false,
  showOnlyNeedsYou: false,
  visibleWorkspaceHostIds: null,
  hostIdsBeforeThisMachineChip: null,
  filterRepoIds: []
}

const groups = [
  { id: 'acme', parentGroupId: null },
  { id: 'acme-web', parentGroupId: 'acme' },
  { id: 'globex', parentGroupId: null }
]
const repos = [
  { id: 'r-api', projectGroupId: 'acme' },
  { id: 'r-site', projectGroupId: 'acme-web' },
  { id: 'r-billing', projectGroupId: 'globex' },
  { id: 'r-loose', projectGroupId: null }
]

describe('This machine chip', () => {
  it('narrows to the local machine and remembers the previous list', () => {
    const store = spySetters()
    toggleThisMachineChip({ ...idle, visibleWorkspaceHostIds: ['ssh:box'] }, store)
    expect(store.setHostIdsBeforeThisMachineChip).toHaveBeenCalledWith(['ssh:box'])
    expect(store.setVisibleWorkspaceHostIds).toHaveBeenCalledWith(['local'])
  })

  it('restores the previous host list when turned off', () => {
    const store = spySetters()
    const on = {
      ...idle,
      visibleWorkspaceHostIds: ['local' as const],
      hostIdsBeforeThisMachineChip: ['ssh:box' as const]
    }
    expect(isThisMachineChipOn(on.visibleWorkspaceHostIds)).toBe(true)
    toggleThisMachineChip(on, store)
    expect(store.setVisibleWorkspaceHostIds).toHaveBeenCalledWith(['ssh:box'])
    expect(store.setHostIdsBeforeThisMachineChip).toHaveBeenCalledWith(null)
  })
})

describe('Client chip', () => {
  it('maps a client to the projects in its group and subgroups', () => {
    expect(clientGroupRepoIds('acme', groups, repos)).toEqual(['r-api', 'r-site'])
  })

  it('names the client whose projects are the current project filter', () => {
    expect(findActiveClientGroupId(['r-site', 'r-api'], groups, repos)).toBe('acme')
    expect(findActiveClientGroupId(['r-api'], groups, repos)).toBeNull()
    expect(findActiveClientGroupId([], groups, repos)).toBeNull()
  })

  it('still names the client when a repo id appears twice', () => {
    const twice = [...repos, { id: 'r-api', projectGroupId: 'acme' }]
    expect(findActiveClientGroupId(['r-site', 'r-api', 'r-api'], groups, twice)).toBe('acme')
  })

  it('lists a client with no projects as empty so the menu can disable it', () => {
    const withEmpty = [...groups, { id: 'initech', parentGroupId: null, name: 'Initech' }]
    const choices = listClientChoices(withEmpty, repos)
    expect(choices.map((choice) => [choice.group.id, choice.repoIds])).toEqual([
      ['acme', ['r-api', 'r-site']],
      ['globex', ['r-billing']],
      ['initech', []]
    ])
  })

  it('leaves archived projects out of a client so an all-archived one reads as empty', () => {
    const archived = repos.map((entry) =>
      entry.id === 'r-site' || entry.id === 'r-billing' ? { ...entry, hiddenAt: 1 } : entry
    )
    expect(
      listClientChoices(groups, archived).map((choice) => [choice.group.id, choice.repoIds])
    ).toEqual([
      ['acme', ['r-api']],
      ['globex', []]
    ])
    expect(findActiveClientGroupId(['r-api'], groups, archived)).toBe('acme')
  })

  it('lists a client once when several machines hold a copy of its group', () => {
    const hostCopies = [...groups, { id: 'acme', parentGroupId: null }]
    expect(listClientChoices(hostCopies, repos).map((choice) => choice.group.id)).toEqual([
      'acme',
      'globex'
    ])
  })

  it('follows the selected client when a project joins it later', () => {
    const joined = [...repos, { id: 'r-new', projectGroupId: 'acme-web' }]
    const before = { filterRepoIds: ['r-api', 'r-site'], projectGroups: groups, repos }
    expect(followClientMembership(before, { ...before, repos: joined })).toEqual([
      'r-api',
      'r-site',
      'r-new'
    ])
  })

  it('leaves a hand-picked project filter and an emptied client alone', () => {
    const picked = { filterRepoIds: ['r-api'], projectGroups: groups, repos }
    const joined = [...repos, { id: 'r-new', projectGroupId: 'acme' }]
    expect(followClientMembership(picked, { ...picked, repos: joined })).toBeNull()
    const before = { filterRepoIds: ['r-billing'], projectGroups: groups, repos }
    const emptied = repos.filter((repo) => repo.id !== 'r-billing')
    expect(followClientMembership(before, { ...before, repos: emptied })).toBeNull()
  })
})

describe('All chip', () => {
  it('clears Live, Needs you, This machine and Client', () => {
    const store = spySetters()
    applyAllChip(
      {
        showOnlyRunningTerminals: true,
        showOnlyNeedsYou: true,
        visibleWorkspaceHostIds: ['local'],
        hostIdsBeforeThisMachineChip: null,
        filterRepoIds: ['r-api']
      },
      store
    )
    expect(store.setShowOnlyRunningTerminals).toHaveBeenCalledWith(false)
    expect(store.setShowOnlyNeedsYou).toHaveBeenCalledWith(false)
    expect(store.setVisibleWorkspaceHostIds).toHaveBeenCalledWith(null)
    expect(store.setFilterRepoIds).toHaveBeenCalledWith([])
  })

  it('writes nothing while no chip filter is on', () => {
    const store = spySetters()
    applyAllChip(idle, store)
    expect(Object.values(store).every((spy) => vi.mocked(spy).mock.calls.length === 0)).toBe(true)
  })
})

describe('chip row visibility', () => {
  it('counts the distinct machines the projects live on', () => {
    expect(countRepoMachines([{ connectionId: null }, { connectionId: null }])).toBe(1)
    expect(countRepoMachines([{ connectionId: null }, { executionHostId: 'runtime:mini' }])).toBe(2)
  })
})

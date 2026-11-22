import { describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import {
  createGroupFromRepos,
  moveReposToGroup,
  splitSelectionByMachine
} from './project-group-batch'

const local = (id: string, projectGroupId?: string): Repo => ({
  id,
  path: `/tmp/${id}`,
  displayName: id,
  badgeColor: '#000000',
  addedAt: 0,
  projectGroupId
})
const remote = (id: string): Repo => ({ ...local(id), connectionId: 'gpu-vm' })

describe('splitSelectionByMachine', () => {
  it('returns null for an empty selection', () => {
    expect(splitSelectionByMachine([])).toBeNull()
  })

  it("keeps only projects on the first-selected project's machine", () => {
    const split = splitSelectionByMachine([remote('r1'), local('a'), remote('r2'), local('b')])
    expect(split?.groupable.map((repo) => repo.id)).toEqual(['r1', 'r2'])
    expect(split?.stayPut.map((repo) => repo.id)).toEqual(['a', 'b'])
    expect(split?.hostId).toBe('ssh:gpu-vm')
  })

  it('groups everything when all projects share a machine', () => {
    const split = splitSelectionByMachine([local('a'), local('b')])
    expect(split?.groupable).toHaveLength(2)
    expect(split?.stayPut).toEqual([])
  })
})

describe('moveReposToGroup', () => {
  it('moves each project in order and skips ones already in the group', async () => {
    const move = vi.fn(async () => {})
    const a = local('a')
    const b = local('b', 'g1')
    const c = local('c', 'other')
    await moveReposToGroup([a, b, c], 'g1', move)
    expect(move.mock.calls).toEqual([
      [a, 'g1'],
      [c, 'g1']
    ])
  })
})

describe('createGroupFromRepos', () => {
  it("creates the group on the first project's machine, then moves only that machine's projects", async () => {
    const createProjectGroup = vi.fn(async () => ({ id: 'new-group' }))
    const moveProjectToGroup = vi.fn(async () => {})
    const r1 = remote('r1')
    const a = local('a')
    const r2 = remote('r2')
    await createGroupFromRepos('Infra', [r1, a, r2], { createProjectGroup, moveProjectToGroup })
    expect(createProjectGroup).toHaveBeenCalledWith('Infra', 'ssh:gpu-vm')
    expect(moveProjectToGroup.mock.calls).toEqual([
      [r1, 'new-group'],
      [r2, 'new-group']
    ])
  })

  it('moves nothing when the group could not be created', async () => {
    const moveProjectToGroup = vi.fn(async () => {})
    await createGroupFromRepos('Infra', [local('a')], {
      createProjectGroup: async () => null,
      moveProjectToGroup
    })
    expect(moveProjectToGroup).not.toHaveBeenCalled()
  })
})

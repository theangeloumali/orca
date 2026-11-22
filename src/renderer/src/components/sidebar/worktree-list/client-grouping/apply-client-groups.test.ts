import { describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { applyClientGroups } from './apply-client-groups'

function project(id: string): Repo {
  return { id, path: `/Users/me/Work/ZKidz/${id}`, displayName: id, badgeColor: '#000', addedAt: 0 }
}

function store(overrides: { created?: { id: string } | null; moved?: boolean } = {}) {
  const calls: string[] = []
  return {
    calls,
    createProjectGroup: vi.fn(async (name: string) => {
      calls.push(`create:${name}`)
      return overrides.created === undefined ? { id: `g-${name}` } : overrides.created
    }),
    moveProjectToGroup: vi.fn(async (repo: Repo, groupId: string | null) => {
      calls.push(`move:${repo.id}->${groupId}`)
      return overrides.moved ?? true
    })
  }
}

describe('applyClientGroups', () => {
  it('creates a new group on its machine, then moves each project into it in order', async () => {
    const deps = store()
    const result = await applyClientGroups(
      [
        {
          clientName: 'ZKidz',
          existingGroupId: null,
          hostId: 'ssh:box',
          projects: [project('a'), project('b')]
        }
      ],
      deps
    )
    expect(deps.calls).toEqual(['create:ZKidz', 'move:a->g-ZKidz', 'move:b->g-ZKidz'])
    expect(deps.createProjectGroup).toHaveBeenCalledWith('ZKidz', 'ssh:box')
    expect(result).toEqual({ filedCount: 2, createdCount: 1, failedGroups: [] })
  })

  it('files into an existing group without creating one, and skips empty selections', async () => {
    const deps = store()
    const result = await applyClientGroups(
      [
        {
          clientName: 'Acme',
          existingGroupId: 'g-acme',
          hostId: 'local',
          projects: [project('a')]
        },
        { clientName: 'Empty', existingGroupId: null, hostId: 'local', projects: [] }
      ],
      deps
    )
    expect(deps.calls).toEqual(['move:a->g-acme'])
    expect(result).toEqual({ filedCount: 1, createdCount: 0, failedGroups: [] })
  })

  it('reports a group whose creation or moves failed', async () => {
    const noGroup = store({ created: null })
    expect(
      await applyClientGroups(
        [{ clientName: 'ZKidz', existingGroupId: null, hostId: 'local', projects: [project('a')] }],
        noGroup
      )
    ).toEqual({ filedCount: 0, createdCount: 0, failedGroups: ['ZKidz'] })
    expect(noGroup.moveProjectToGroup).not.toHaveBeenCalled()

    const refused = store({ moved: false })
    expect(
      await applyClientGroups(
        [
          {
            clientName: 'Acme',
            existingGroupId: 'g-acme',
            hostId: 'local',
            projects: [project('a'), project('b')]
          }
        ],
        refused
      )
    ).toEqual({ filedCount: 0, createdCount: 0, failedGroups: ['Acme'] })
  })
})

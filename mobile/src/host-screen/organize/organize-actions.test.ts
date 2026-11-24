import { describe, expect, it } from 'vitest'
import type { SectionRepo } from '../../worktree/workspace-list/workspace-list-types'
import { archiveProjects, fileClientSuggestions } from './organize-actions'

const repo = (id: string, extra: Partial<SectionRepo> = {}): SectionRepo => ({
  id,
  displayName: id,
  path: `/w/${id}`,
  ...extra
})

describe('archiveProjects', () => {
  it("hides each project on its own machine's copy and counts what stuck", async () => {
    const calls: unknown[] = []
    const archived = await archiveProjects(
      [repo('a'), repo('b', { connectionId: 'nas' })],
      async (params) => {
        calls.push(params)
        return params.repo !== 'id:b'
      }
    )
    expect(calls).toEqual([
      { repo: 'id:a', repoHostId: 'local', hidden: true },
      { repo: 'id:b', repoHostId: 'ssh:nas', hidden: true }
    ])
    expect(archived).toBe(1)
  })
})

describe('fileClientSuggestions', () => {
  it('creates a missing client group, reuses an existing one, and files each project', async () => {
    const created: unknown[] = []
    const moved: unknown[] = []
    const result = await fileClientSuggestions(
      [
        { clientName: 'Acme', existingGroupId: null, projects: [repo('a'), repo('b')] },
        { clientName: 'Globex', existingGroupId: 'g-globex', projects: [repo('c')] }
      ],
      {
        createGroup: async (params) => {
          created.push(params)
          return 'g-acme'
        },
        moveProject: async (params) => {
          moved.push(params)
          return true
        }
      }
    )
    expect(created).toEqual([{ name: 'Acme', connectionId: null }])
    expect(moved).toEqual([
      { repo: 'id:a', groupId: 'g-acme', connectionId: null },
      { repo: 'id:b', groupId: 'g-acme', connectionId: null },
      { repo: 'id:c', groupId: 'g-globex', connectionId: null }
    ])
    expect(result).toEqual({ filed: 3, failedClients: [] })
  })

  it('reports a client whose group could not be made and files none of it', async () => {
    const result = await fileClientSuggestions(
      [{ clientName: 'Acme', existingGroupId: null, projects: [repo('a')] }],
      { createGroup: async () => null, moveProject: async () => true }
    )
    expect(result).toEqual({ filed: 0, failedClients: ['Acme'] })
  })

  it('reports a client when one of its projects fails to move, keeping the ones that did', async () => {
    const result = await fileClientSuggestions(
      [{ clientName: 'Acme', existingGroupId: 'g-acme', projects: [repo('a'), repo('b')] }],
      { createGroup: async () => 'unused', moveProject: async ({ repo: id }) => id === 'id:a' }
    )
    expect(result).toEqual({ filed: 1, failedClients: ['Acme'] })
  })
})

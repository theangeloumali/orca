import { describe, expect, it } from 'vitest'
import type { LiveAgentWorktreeStatus } from '../feed-facts/workspace-activity-facts'
import { countHostAgentActivity, collectHostWorkspaceIds } from './host-agent-activity'

describe('countHostAgentActivity', () => {
  it('counts working and monitoring agents as working and permission prompts as needing you', () => {
    const live = new Map<string, LiveAgentWorktreeStatus>([
      ['a', 'working'],
      ['b', 'monitoring'],
      ['c', 'permission'],
      ['on-another-host', 'permission']
    ])

    expect(countHostAgentActivity(['a', 'b', 'c', 'idle'], live)).toEqual({
      working: 2,
      needsYou: 1
    })
  })
})

describe('collectHostWorkspaceIds', () => {
  it('lists every workspace on one machine, whatever the sidebar collapsed, folders included', () => {
    const sources = {
      worktreesByRepo: {
        app: [
          { id: 'app::/m5', repoId: 'app' },
          { id: 'app::/m1', repoId: 'app', hostId: 'runtime:m1' as const }
        ],
        api: [{ id: 'api::/box', repoId: 'api' }]
      },
      repos: [
        { id: 'app', connectionId: null },
        { id: 'api', connectionId: 'box' }
      ],
      folderWorkspaces: [
        { id: 'notes', projectGroupId: 'work', connectionId: null },
        { id: 'logs', projectGroupId: 'server', connectionId: null }
      ],
      projectGroups: [
        { id: 'work', connectionId: null },
        { id: 'server', connectionId: 'box' }
      ]
    }
    expect(collectHostWorkspaceIds(sources, 'local', 'local')).toEqual(['app::/m5', 'folder:notes'])
    expect(collectHostWorkspaceIds(sources, 'runtime:m1', 'local')).toEqual(['app::/m1'])
    expect(collectHostWorkspaceIds(sources, 'ssh:box', 'local')).toEqual([
      'api::/box',
      'folder:logs'
    ])
  })
})

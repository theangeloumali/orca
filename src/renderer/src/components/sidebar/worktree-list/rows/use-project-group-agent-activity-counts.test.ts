import { describe, expect, it } from 'vitest'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import { countHostAgentActivity } from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'
import { collectProjectGroupWorkspaceIds } from './use-project-group-agent-activity-counts'

const subtree = new Set(['client', 'nested'])
const sources = {
  repos: [
    { id: 'r-top', projectGroupId: 'client' },
    { id: 'r-nested', projectGroupId: 'nested' },
    { id: 'r-hidden', projectGroupId: 'nested', hiddenAt: 1 },
    { id: 'r-out', projectGroupId: 'other' }
  ],
  worktreesByRepo: {
    'r-top': [{ id: 'wt-top', repoId: 'r-top' }],
    'r-nested': [{ id: 'wt-nested', repoId: 'r-nested' }],
    'r-hidden': [{ id: 'wt-hidden', repoId: 'r-hidden' }],
    'r-out': [{ id: 'wt-out', repoId: 'r-out' }]
  },
  folderWorkspaces: [
    { id: 'fw-nested', projectGroupId: 'nested' },
    { id: 'fw-out', projectGroupId: 'other' }
  ]
}

describe('collectProjectGroupWorkspaceIds', () => {
  it('collects worktrees of listed repos and folder workspaces across the subtree', () => {
    expect(collectProjectGroupWorkspaceIds(subtree, sources)).toEqual([
      'wt-top',
      'wt-nested',
      folderWorkspaceKey('fw-nested')
    ])
  })

  it('counts needs-you from live agent status inside the subtree only', () => {
    const live = new Map([
      ['wt-nested', 'permission' as const],
      [folderWorkspaceKey('fw-nested'), 'permission' as const],
      ['wt-out', 'permission' as const],
      ['wt-hidden', 'permission' as const],
      ['wt-top', 'working' as const]
    ])
    const ids = collectProjectGroupWorkspaceIds(subtree, sources)
    expect(countHostAgentActivity(ids, live)).toEqual({ working: 1, needsYou: 2 })
  })
})

import { describe, expect, it } from 'vitest'
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { countHeaderActivity } from './use-project-activity-counts'

const NOW = 1_000_000
const remoteRepo: Repo = {
  ...repo,
  id: 'repo-gpu',
  connectionId: 'gpu-vm',
  executionHostId: 'ssh:gpu-vm'
}
const shared = { ...worktree, id: 'wt-shared' }
const paneState = {
  repos: [repo, remoteRepo],
  worktreesByRepo: {
    [repo.id]: [{ ...shared, repoId: repo.id, hostId: 'local' as const }],
    [remoteRepo.id]: [{ ...shared, repoId: remoteRepo.id, hostId: 'ssh:gpu-vm' as const }]
  },
  unifiedTabsByWorktree: {},
  terminalLayoutsByTabId: {},
  ptyIdsByTabId: {}
}
const remoteAgent: AgentStatusEntry = {
  paneKey: 'tab-remote:leaf-1',
  worktreeId: shared.id,
  connectionId: 'gpu-vm',
  state: 'waiting',
  prompt: '',
  updatedAt: NOW,
  stateStartedAt: NOW,
  stateHistory: []
}

describe('countHeaderActivity', () => {
  it("credits an agent only to its own machine's copy of a shared workspace id", () => {
    const count = (scope: Map<'local' | 'ssh:gpu-vm', string[]>) =>
      countHeaderActivity(
        paneState,
        new Map([[remoteAgent.paneKey, remoteAgent]]),
        scope,
        {},
        {},
        NOW
      )
    expect(count(new Map([['local', [shared.id]]]))).toEqual({
      needsYou: 0,
      working: 0,
      terminals: 0
    })
    expect(
      count(
        new Map([
          ['local', [shared.id]],
          ['ssh:gpu-vm', [shared.id]]
        ])
      )
    ).toEqual({ needsYou: 1, working: 0, terminals: 0 })
  })
})

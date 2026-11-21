import { describe, expect, it } from 'vitest'
import { summarizeActiveOnlyProjects } from './active-only-project-summary'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'

const repos = [{ id: 'busy' }, { id: 'idle' }, { id: 'waiting' }, { id: 'gone', hiddenAt: 1 }]
const workspacesByRepoId = {
  busy: [makeWorktree({ id: 'busy-1', repoId: 'busy' })],
  idle: [makeWorktree({ id: 'idle-1', repoId: 'idle' })],
  waiting: [makeWorktree({ id: 'waiting-1', repoId: 'waiting' })],
  gone: [makeWorktree({ id: 'gone-1', repoId: 'gone' })]
}

describe('summarizeActiveOnlyProjects', () => {
  it('counts listed projects, the ones running, and hidden ones that need you', () => {
    const summary = summarizeActiveOnlyProjects({
      repos,
      workspacesByRepoId,
      hasRunningTerminal: (worktreeId) => worktreeId === 'busy-1' || worktreeId === 'gone-1',
      needsYouWorktreeIds: new Set(['waiting-1', 'busy-1'])
    })
    expect(summary).toEqual({ shownCount: 1, totalCount: 3, hiddenNeedsYouCount: 1 })
  })

  it('counts a project once however many copies or workspaces it has', () => {
    const summary = summarizeActiveOnlyProjects({
      repos: [{ id: 'busy' }, { id: 'busy' }],
      workspacesByRepoId: {
        busy: [makeWorktree({ id: 'a', repoId: 'busy' }), makeWorktree({ id: 'b', repoId: 'busy' })]
      },
      hasRunningTerminal: () => true,
      needsYouWorktreeIds: new Set()
    })
    expect(summary).toEqual({ shownCount: 1, totalCount: 1, hiddenNeedsYouCount: 0 })
  })

  it('ignores archived workspaces', () => {
    const summary = summarizeActiveOnlyProjects({
      repos: [{ id: 'busy' }],
      workspacesByRepoId: { busy: [makeWorktree({ id: 'a', repoId: 'busy', isArchived: true })] },
      hasRunningTerminal: () => true,
      needsYouWorktreeIds: new Set(['a'])
    })
    expect(summary).toEqual({ shownCount: 0, totalCount: 1, hiddenNeedsYouCount: 0 })
  })
})

import { describe, expect, it } from 'vitest'
import { buildDesktopWorkspaceRowFactReader } from './desktop-workspace-row-facts'
import { NO_HIDDEN_PROJECTS } from '../../../../../../shared/project/catalog/hidden-projects'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'

function readerFor(ptyIdsByTabId: Record<string, string[]>) {
  return buildDesktopWorkspaceRowFactReader({
    repoMap: new Map(),
    hiddenProjects: NO_HIDDEN_PROJECTS,
    defaultHostId: 'local',
    pairedDeviceIdsByEnvironment: new Map(),
    tabsByWorktree: { 'wt-1': [{ id: 'tab-1' }, { id: 'tab-2' }] },
    ptyIdsByTabId,
    worktreeIdsWithLiveAgent: new Set()
  })
}

describe('hasRunningTerminal', () => {
  it('reads true when any of the workspace tabs has a live PTY', () => {
    const worktree = makeWorktree({ id: 'wt-1', repoId: 'repo-1' })
    expect(readerFor({ 'tab-2': ['pty-1'] }).hasRunningTerminal(worktree)).toBe(true)
  })

  it('reads false for an exited PTY or a workspace with no tabs', () => {
    expect(
      readerFor({ 'tab-1': [] }).hasRunningTerminal(makeWorktree({ id: 'wt-1', repoId: 'r' }))
    ).toBe(false)
    expect(readerFor({}).hasRunningTerminal(makeWorktree({ id: 'wt-2', repoId: 'r' }))).toBe(false)
  })
})

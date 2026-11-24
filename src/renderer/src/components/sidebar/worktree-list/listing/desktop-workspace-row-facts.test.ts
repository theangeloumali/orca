import { describe, expect, it } from 'vitest'
import { buildDesktopWorkspaceRowFactReader } from './desktop-workspace-row-facts'
import { NO_HIDDEN_PROJECTS } from '../../../../../../shared/project/catalog/hidden-projects'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { repo } from '../grouping/worktree-list-groups-test-fixtures'

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

  it('reads a twin workspace id as live only on the machine its PTY runs on', () => {
    const remoteRepo: Repo = {
      ...repo,
      id: 'repo-gpu',
      connectionId: 'gpu-vm',
      executionHostId: 'ssh:gpu-vm'
    }
    const local = makeWorktree({ id: 'wt-shared', repoId: repo.id, hostId: 'local' })
    const remote = makeWorktree({ id: 'wt-shared', repoId: remoteRepo.id, hostId: 'ssh:gpu-vm' })
    const repos = [repo, remoteRepo]
    const reader = buildDesktopWorkspaceRowFactReader({
      repoMap: new Map(repos.map((entry) => [entry.id, entry])),
      hiddenProjects: NO_HIDDEN_PROJECTS,
      defaultHostId: 'local',
      pairedDeviceIdsByEnvironment: new Map(),
      tabsByWorktree: { 'wt-shared': [{ id: 'tab-remote' }] },
      ptyIdsByTabId: { 'tab-remote': [toAppSshPtyId('gpu-vm', 'pty-1')] },
      worktreeIdsWithLiveAgent: new Set(),
      terminalHostState: {
        repos,
        worktreesByRepo: { [repo.id]: [local], [remoteRepo.id]: [remote] },
        folderWorkspaces: [],
        projectGroups: [],
        wslHostStatuses: {}
      }
    })
    expect(reader.hasRunningTerminal(local)).toBe(false)
    expect(reader.hasRunningTerminal(remote)).toBe(true)
  })
})

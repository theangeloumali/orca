// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import type * as HostActivityModule from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'
import { collectRepoRegistrationWorkspaceIds } from './use-project-group-agent-activity-counts'
import { countProjectActivity, useProjectActivityCounts } from './use-project-activity-counts'

const counting = vi.hoisted(() => ({ calls: 0 }))
vi.mock(
  '../../../../../../shared/sidebar-list/hosts/host-agent-activity',
  async (importOriginal) => {
    const actual = await importOriginal<typeof HostActivityModule>()
    return {
      ...actual,
      countHostAgentActivity: (
        ...args: Parameters<typeof actual.countHostAgentActivity>
      ): ReturnType<typeof actual.countHostAgentActivity> => {
        counting.calls += 1
        return actual.countHostAgentActivity(...args)
      }
    }
  }
)

describe('collectRepoRegistrationWorkspaceIds', () => {
  it("keeps only the registration's own-host workspaces, not its twin on another machine", () => {
    const local = { id: 'r-twin' }
    const remote = { id: 'r-twin', connectionId: 'gpu-vm' }
    const sources = {
      repos: [local, remote],
      workspacesByRepoId: {
        'r-twin': [
          { id: 'wt-local', hostId: 'local' as const },
          { id: 'wt-remote', hostId: 'ssh:gpu-vm' as const }
        ]
      }
    }
    expect(collectRepoRegistrationWorkspaceIds(local, sources)).toEqual(['wt-local'])
    expect(collectRepoRegistrationWorkspaceIds(remote, sources)).toEqual(['wt-remote'])
  })
})

describe('countProjectActivity', () => {
  it('counts needs-you, working and workspaces whose terminal PTY is still live', () => {
    const live = new Map([
      ['wt-ask', 'permission' as const],
      ['wt-run', 'working' as const],
      ['wt-elsewhere', 'working' as const]
    ])
    const terminalTabs = {
      'wt-run': [{ id: 'tab-live' }],
      'wt-dead': [{ id: 'tab-dead' }]
    }
    const ptyIdsByTabId = { 'tab-live': ['pty-1'], 'tab-dead': [] }
    expect(
      countProjectActivity(['wt-ask', 'wt-run', 'wt-dead'], live, terminalTabs, ptyIdsByTabId)
    ).toEqual({ needsYou: 1, working: 1, terminals: 1 })
  })
})

describe('useProjectActivityCounts', () => {
  afterEach(() => {
    cleanup()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('recounts on a PTY change but not on a terminal title write', () => {
    useAppStore.setState({
      repos: [repo],
      worktreesByRepo: { [repo.id]: [worktree] },
      tabsByWorktree: { [worktree.id]: [makeTab({ id: 'tab-1', worktreeId: worktree.id })] },
      ptyIdsByTabId: {}
    })
    const { result } = renderHook(() => useProjectActivityCounts(repo))
    expect(result.current).toEqual({ needsYou: 0, working: 0, terminals: 0 })
    const callsAfterMount = counting.calls

    act(() => {
      useAppStore.setState({
        tabsByWorktree: {
          [worktree.id]: [makeTab({ id: 'tab-1', worktreeId: worktree.id, title: 'vim' })]
        }
      })
    })
    expect(counting.calls).toBe(callsAfterMount)

    act(() => {
      useAppStore.setState({ ptyIdsByTabId: { 'tab-1': ['pty-1'] } })
    })
    expect(result.current.terminals).toBe(1)
  })
})

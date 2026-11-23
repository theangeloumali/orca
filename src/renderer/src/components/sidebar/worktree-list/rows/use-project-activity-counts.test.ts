// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { makeLayout, makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { acceptedAgentStatuses } from '@/store/slices/agent-status/status-ownership/accepted-agent-statuses'
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import {
  toRuntimeExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { composeWorktreeId } from '../../../../../../shared/worktree/id'
import { toRemoteRuntimePtyId } from '../../../../../../shared/remote-runtime/remote-runtime-pty-id'
import type { WslHostConnectionState } from '../../../../../../shared/remote-runtime/wsl-hosts/wsl-host-types'
import { toAppSshPtyId } from '../../../../../../shared/remote-runtime/ssh/ssh-pty-id'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import {
  countHeaderActivity,
  getHeaderWorkspaceScope,
  useProjectActivityCounts
} from './use-project-activity-counts'

const NOW = 1_000_000
const LEAF_ID = '11111111-1111-4111-8111-111111111111'
const remoteRepo: Repo = {
  ...repo,
  id: 'repo-gpu',
  connectionId: 'gpu-vm',
  executionHostId: 'ssh:gpu-vm'
}
const shared = { ...worktree, id: 'wt-shared' }
const twinWorkspaces = {
  [repo.id]: [{ ...shared, repoId: repo.id, hostId: 'local' as const }],
  [remoteRepo.id]: [{ ...shared, repoId: remoteRepo.id, hostId: 'ssh:gpu-vm' as const }]
}
const paneState = {
  repos: [repo, remoteRepo],
  worktreesByRepo: twinWorkspaces,
  unifiedTabsByWorktree: {},
  terminalLayoutsByTabId: {},
  ptyIdsByTabId: {},
  folderWorkspaces: [],
  projectGroups: [],
  wslHostStatuses: {}
}
const agent = (overrides: Partial<AgentStatusEntry>): AgentStatusEntry => ({
  paneKey: 'tab-remote:leaf-1',
  worktreeId: shared.id,
  state: 'waiting',
  prompt: '',
  updatedAt: NOW,
  stateStartedAt: NOW,
  stateHistory: [],
  ...overrides
})
const BOTH_MACHINES = new Map<ExecutionHostId, string[]>([
  ['local', [shared.id]],
  ['ssh:gpu-vm', [shared.id]]
])
const LOCAL_ONLY = new Map<ExecutionHostId, string[]>([['local', [shared.id]]])
const REMOTE_ONLY = new Map<ExecutionHostId, string[]>([['ssh:gpu-vm', [shared.id]]])
// One live tab in the shared id, its PTY on the SSH machine.
const remoteTerminal = {
  terminalTabs: { [shared.id]: [{ id: 'tab-remote' }] },
  ptyIdsByTabId: { 'tab-remote': [toAppSshPtyId('gpu-vm', 'pty-1')] }
}
const WSL_ENV = 'wsl-ubuntu'
const WSL_HOST = toRuntimeExecutionHostId(WSL_ENV)
const wslRepo: Repo = { ...repo, id: 'repo-wsl', executionHostId: WSL_HOST }
const wslWorkspace = {
  ...worktree,
  id: composeWorktreeId('repo-wsl', '/home/dev/app'),
  repoId: wslRepo.id
}
const WSL_ONLY = new Map<ExecutionHostId, string[]>([[WSL_HOST, [wslWorkspace.id]]])
// A retained PTY on the WSL server, plus one whose create never reached a server.
const wslTerminals = {
  terminalTabs: { [wslWorkspace.id]: [{ id: 'tab-wsl' }, { id: 'tab-unstarted' }] },
  ptyIdsByTabId: {
    'tab-wsl': [toRemoteRuntimePtyId('pty-7', WSL_ENV)],
    'tab-unstarted': ['pty-local']
  }
}
const wslStatus = (state: WslHostConnectionState) => ({
  [WSL_ENV]: { environmentId: WSL_ENV, distro: 'Ubuntu', state, detail: null }
})
const countTerminals = (scope: ReadonlyMap<ExecutionHostId, readonly string[]>) =>
  countHeaderActivity(
    paneState,
    new Map(),
    scope,
    remoteTerminal.terminalTabs,
    remoteTerminal.ptyIdsByTabId,
    NOW
  ).terminals

describe('countHeaderActivity', () => {
  it("credits an agent only to its own machine's copy of a shared workspace id", () => {
    const remoteAgent = agent({ connectionId: 'gpu-vm' })
    const count = (scope: ReadonlyMap<ExecutionHostId, readonly string[]>) =>
      countHeaderActivity(
        paneState,
        new Map([[remoteAgent.paneKey, remoteAgent]]),
        scope,
        {},
        {},
        NOW
      )
    expect(count(LOCAL_ONLY)).toEqual({ needsYou: 0, working: 0, terminals: 0 })
    expect(count(BOTH_MACHINES)).toEqual({ needsYou: 1, working: 0, terminals: 0 })
  })

  it("counts a twin workspace's live terminal only on the machine its PTY runs on", () => {
    expect(countTerminals(BOTH_MACHINES)).toBe(1)
    expect(countTerminals(LOCAL_ONLY)).toBe(0)
    expect(countTerminals(REMOTE_ONLY)).toBe(1)
  })

  it("counts a twin's live terminal only under its own machine section", () => {
    const row = { hostWorktreeIds: BOTH_MACHINES, worktreeIds: [shared.id] }
    expect(countTerminals(getHeaderWorkspaceScope({ ...row, hostId: 'local' }))).toBe(0)
    expect(countTerminals(getHeaderWorkspaceScope({ ...row, hostId: 'ssh:gpu-vm' }))).toBe(1)
  })
})

describe('countHeaderActivity on a WSL host', () => {
  const countOnWsl = (state: WslHostConnectionState) =>
    countHeaderActivity(
      {
        ...paneState,
        repos: [wslRepo],
        worktreesByRepo: { [wslRepo.id]: [wslWorkspace] },
        wslHostStatuses: wslStatus(state)
      },
      new Map(),
      WSL_ONLY,
      wslTerminals.terminalTabs,
      wslTerminals.ptyIdsByTabId,
      NOW
    ).terminals

  it('counts no live terminal on a stopped distro, as the workspace card does', () => {
    expect(countOnWsl('ready')).toBe(1)
    expect(countOnWsl('distro-stopped')).toBe(0)
  })
})

describe('useProjectActivityCounts', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it("recounts when an agent's pane moves to another machine", () => {
    vi.useFakeTimers({ now: NOW })
    const paneAgent = agent({ paneKey: `tab-1:${LEAF_ID}` })
    const layoutOn = (ptyId: string) => ({
      'tab-1': { ...makeLayout(), ptyIdsByLeafId: { [LEAF_ID]: ptyId } }
    })
    useAppStore.setState({
      repos: [repo, remoteRepo],
      worktreesByRepo: twinWorkspaces,
      agentStatusByPaneKey: acceptedAgentStatuses([[paneAgent.paneKey, paneAgent]]),
      terminalLayoutsByTabId: layoutOn('pty-local')
    })
    const { result } = renderHook(() => useProjectActivityCounts(LOCAL_ONLY))
    expect(result.current.needsYou).toBe(1)

    act(() => {
      useAppStore.setState({ terminalLayoutsByTabId: layoutOn(toAppSshPtyId('gpu-vm', 'pty-9')) })
    })
    expect(result.current.needsYou).toBe(0)
  })

  it('recounts terminals when the WSL distro stops', () => {
    vi.useFakeTimers({ now: NOW })
    useAppStore.setState({
      repos: [wslRepo],
      worktreesByRepo: { [wslRepo.id]: [wslWorkspace] },
      tabsByWorktree: {
        [wslWorkspace.id]: [makeTab({ id: 'tab-wsl', worktreeId: wslWorkspace.id })]
      },
      ptyIdsByTabId: { 'tab-wsl': wslTerminals.ptyIdsByTabId['tab-wsl'] },
      wslHostStatuses: wslStatus('ready')
    })
    const { result } = renderHook(() => useProjectActivityCounts(WSL_ONLY))
    expect(result.current.terminals).toBe(1)

    act(() => {
      useAppStore.setState({ wslHostStatuses: wslStatus('distro-stopped') })
    })
    expect(result.current.terminals).toBe(0)
  })
})

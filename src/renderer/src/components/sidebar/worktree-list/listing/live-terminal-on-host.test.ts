import { describe, expect, it } from 'vitest'
import {
  LOCAL_EXECUTION_HOST_ID,
  toRuntimeExecutionHostId,
  toSshExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { toRemoteRuntimePtyId } from '../../../../../../shared/remote-runtime/remote-runtime-pty-id'
import type { WslHostConnectionState } from '../../../../../../shared/remote-runtime/wsl-hosts/wsl-host-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { repo, worktree } from '../grouping/worktree-list-groups-test-fixtures'
import { hasLiveTerminalOnHost, type TerminalHostState } from './live-terminal-on-host'

const WSL_ENV = 'wsl-ubuntu'
const WSL_HOST = toRuntimeExecutionHostId(WSL_ENV)
const wslRepo: Repo = { ...repo, id: 'repo-wsl', executionHostId: WSL_HOST }
const shared = { ...worktree, id: 'wt-shared' }
// The WSL twin is listed first, so an id-only owner lookup lands on it.
const stateWithDistro = (state: WslHostConnectionState): TerminalHostState => ({
  repos: [wslRepo, repo],
  worktreesByRepo: {
    [wslRepo.id]: [{ ...shared, repoId: wslRepo.id, hostId: WSL_HOST }],
    [repo.id]: [{ ...shared, repoId: repo.id, hostId: LOCAL_EXECUTION_HOST_ID }]
  },
  wslHostStatuses: {
    [WSL_ENV]: { environmentId: WSL_ENV, distro: 'Ubuntu', state, detail: null }
  }
})
const terminalTabs = { [shared.id]: [{ id: 'tab-local' }, { id: 'tab-wsl' }] }
const ptyIdsByTabId = {
  'tab-local': ['pty-local'],
  'tab-wsl': [toRemoteRuntimePtyId('pty-7', WSL_ENV)]
}
const isLiveOn = (state: WslHostConnectionState, hostId: typeof WSL_HOST | 'local') =>
  hasLiveTerminalOnHost(stateWithDistro(state), terminalTabs, ptyIdsByTabId, shared.id, hostId)

describe('hasLiveTerminalOnHost', () => {
  it("keeps a twin's local terminal live while its WSL twin's distro is stopped", () => {
    expect(isLiveOn('distro-stopped', LOCAL_EXECUTION_HOST_ID)).toBe(true)
    expect(isLiveOn('distro-stopped', WSL_HOST)).toBe(false)
    expect(isLiveOn('ready', WSL_HOST)).toBe(true)
  })

  it("ends an SSH alias host's terminals when the WSL distro behind it stops", () => {
    const aliasHost = toSshExecutionHostId('box')
    const aliasRepo: Repo = {
      ...repo,
      id: 'repo-alias',
      connectionId: 'box',
      executionHostId: WSL_HOST
    }
    const state: TerminalHostState = {
      ...stateWithDistro('distro-stopped'),
      repos: [aliasRepo, repo],
      worktreesByRepo: {
        [aliasRepo.id]: [
          { ...shared, repoId: aliasRepo.id, hostId: aliasHost, runtimeOwnerEnvironmentId: WSL_ENV }
        ],
        [repo.id]: [{ ...shared, repoId: repo.id, hostId: LOCAL_EXECUTION_HOST_ID }]
      }
    }
    const isLive = (hostId: typeof aliasHost | 'local') =>
      hasLiveTerminalOnHost(state, terminalTabs, ptyIdsByTabId, shared.id, hostId)

    expect(isLive(aliasHost)).toBe(false)
    expect(isLive(LOCAL_EXECUTION_HOST_ID)).toBe(true)
  })
})

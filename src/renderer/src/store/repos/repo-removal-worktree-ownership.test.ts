// Removal files worktrees as the sidebar does: an unstamped worktree takes its repo row's host.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestStore } from '../testing/app-store-test-fixture'
import { makeWorktree } from '../slices/worktrees/worktree.test-fixture'
import type { Repo } from '../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { countOpenRepoTerminalTabs, getKnownRepoWorktreeIds } from './repo-removal'
import { countLinkedRepoWorkspaces } from './repo-worktree-ownership'

const REPO_ID = 'same-repo'
const SSH_HOST = 'ssh:target-1'
const baseRepo: Repo = {
  id: REPO_ID,
  path: '/work/same',
  displayName: 'Same',
  badgeColor: '#000',
  addedAt: 1
}
const localRow: Repo = { ...baseRepo, executionHostId: 'local' }
const sshRow: Repo = {
  ...baseRepo,
  path: '/remote/same',
  connectionId: 'target-1',
  executionHostId: SSH_HOST
}

function worktree(path: string, hostId?: ExecutionHostId): Worktree {
  return makeWorktree({ id: `${REPO_ID}::${path}`, repoId: REPO_ID, path, hostId })
}

const unstamped = worktree('/remote/same/feature')
const localStamped = worktree('/work/same/local', 'local')
const sshStamped = worktree('/remote/same/ssh', SSH_HOST)
const legacyUnstamped = worktree('/work/same/legacy')
const secondSshRow: Repo = {
  ...sshRow,
  path: '/remote2/same',
  connectionId: 'target-2',
  executionHostId: 'ssh:target-2'
}

function catalog(repos: Repo[], worktrees: Worktree[]) {
  return {
    repos,
    worktreesByRepo: { [REPO_ID]: worktrees },
    detectedWorktreesByRepo: {},
    tabsByWorktree: Object.fromEntries(worktrees.map((w) => [w.id, [{ id: `tab-${w.id}` }]])),
    ptyIdsByTabId: Object.fromEntries(worktrees.map((w) => [`tab-${w.id}`, ['pty']]))
  }
}

describe('worktree ownership for an SSH project', () => {
  it('counts an unstamped worktree under its SSH repo row', () => {
    const state = catalog([sshRow], [unstamped])
    expect(getKnownRepoWorktreeIds(state, REPO_ID, SSH_HOST)).toEqual([unstamped.id])
    expect(countOpenRepoTerminalTabs(state, REPO_ID, SSH_HOST)).toBe(1)
    expect(countLinkedRepoWorkspaces(state, REPO_ID, SSH_HOST)).toBe(1)
  })

  it('still counts an unstamped worktree under a lone local repo row', () => {
    const state = catalog([localRow], [unstamped])
    expect(getKnownRepoWorktreeIds(state, REPO_ID, 'local')).toEqual([unstamped.id])
    expect(countLinkedRepoWorkspaces(state, REPO_ID, 'local')).toBe(1)
  })

  it('gives each host copy only its own worktrees when two rows share the id', () => {
    const state = catalog([localRow, sshRow], [localStamped, sshStamped, legacyUnstamped])
    expect(getKnownRepoWorktreeIds(state, REPO_ID, 'local')).toEqual([
      localStamped.id,
      legacyUnstamped.id
    ])
    expect(getKnownRepoWorktreeIds(state, REPO_ID, SSH_HOST)).toEqual([sshStamped.id])
    expect(countOpenRepoTerminalTabs(state, REPO_ID, SSH_HOST)).toBe(1)
    expect(countLinkedRepoWorkspaces(state, REPO_ID, SSH_HOST)).toBe(1)
  })
})

describe('removeProject worktree ownership', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: {
        repos: { removeForHost: vi.fn().mockResolvedValue(undefined) },
        pty: { kill: vi.fn() }
      }
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('drops an unstamped worktree with its SSH project', async () => {
    const store = createTestStore()
    store.setState({ repos: [sshRow], worktreesByRepo: { [REPO_ID]: [unstamped] } })

    await store.getState().removeProject(REPO_ID, { hostId: SSH_HOST })

    expect(store.getState().repos).toEqual([])
    expect(store.getState().worktreesByRepo[REPO_ID]).toBeUndefined()
  })

  it('keeps the removed row as owner when the repo list refetches during the host call', async () => {
    const store = createTestStore()
    store.setState({ repos: [sshRow], worktreesByRepo: { [REPO_ID]: [unstamped] } })
    // A repos:changed refetch lands while removeForHost is in flight and already lacks the row.
    vi.mocked(window.api.repos.removeForHost).mockImplementation(async () => {
      store.setState({ repos: [] })
    })

    await store.getState().removeProject(REPO_ID, { hostId: SSH_HOST })

    expect(store.getState().worktreesByRepo[REPO_ID]).toBeUndefined()
  })

  it('purges unstamped worktrees once the last row for the id is removed', async () => {
    const store = createTestStore()
    store.setState({
      repos: [sshRow, secondSshRow],
      worktreesByRepo: { [REPO_ID]: [unstamped] }
    })
    // The twin row leaves mid-call, so the start-of-removal snapshot owns the worktree on neither host.
    vi.mocked(window.api.repos.removeForHost).mockImplementation(async () => {
      store.setState({ repos: [sshRow] })
    })

    await store.getState().removeProject(REPO_ID, { hostId: SSH_HOST })

    expect(store.getState().repos).toEqual([])
    expect(store.getState().worktreesByRepo[REPO_ID]).toBeUndefined()
  })

  it('removing the local copy leaves only the SSH copy', async () => {
    const store = createTestStore()
    store.setState({
      repos: [localRow, sshRow],
      worktreesByRepo: { [REPO_ID]: [localStamped, sshStamped, legacyUnstamped] }
    })

    await store.getState().removeProject(REPO_ID, { hostId: 'local' })

    expect(store.getState().repos).toEqual([sshRow])
    expect(store.getState().worktreesByRepo[REPO_ID]?.map((w) => w.id)).toEqual([sshStamped.id])
  })

  it('removing the SSH copy leaves the local copy and its legacy worktree', async () => {
    const store = createTestStore()
    store.setState({
      repos: [localRow, sshRow],
      worktreesByRepo: { [REPO_ID]: [localStamped, sshStamped, legacyUnstamped] }
    })

    await store.getState().removeProject(REPO_ID, { hostId: SSH_HOST })

    expect(store.getState().repos).toEqual([localRow])
    expect(store.getState().worktreesByRepo[REPO_ID]?.map((w) => w.id)).toEqual([
      localStamped.id,
      legacyUnstamped.id
    ])
  })
})

import {
  createRepoRowExecutionHostLookup,
  resolveWorktreeExecutionHost,
  type ExecutionHostOwnerRow
} from '../../../../shared/execution-host/worktree-execution-host-resolution'
import { worktreeBelongsToHost } from './repo-host-identity'
import {
  selectDetectedWorktreesByRepo,
  selectWorktreesByRepo
} from '../workspaces/catalog/workspace-record-fields'

type HostScopedWorktree = { hostId?: string }
type HostScopedWorktreeRef = HostScopedWorktree & { id: string }

/** The sidebar's filing rule: an unstamped worktree takes its repo row's host.
 * Unresolved ones (twins that disagree, or no row) stay legacy-local, as before. */
export function createRepoWorktreeHostMatcher(
  repos: readonly ExecutionHostOwnerRow[],
  repoId: string,
  hostId: string
): (worktree: HostScopedWorktree) => boolean {
  const lookup = createRepoRowExecutionHostLookup(repos)
  return (worktree) => {
    const owner = resolveWorktreeExecutionHost(lookup, { repoId, hostId: worktree.hostId })
    return owner.kind === 'resolved'
      ? owner.hostId === hostId
      : worktreeBelongsToHost(worktree, hostId)
  }
}

/** Linked workspaces that leave Orca with this host's project row; the main checkout is the project itself (#17645). */
export function countLinkedRepoWorkspaces(
  state: {
    repos: readonly ExecutionHostOwnerRow[]
    worktreesByRepo: Readonly<
      Record<string, readonly (HostScopedWorktree & { isMainWorktree: boolean })[] | undefined>
    >
  },
  repoId: string,
  hostId: string
): number {
  const ownsWorktree = createRepoWorktreeHostMatcher(state.repos, repoId, hostId)
  return (selectWorktreesByRepo(state)[repoId] ?? []).filter(
    (worktree) => !worktree.isMainWorktree && ownsWorktree(worktree)
  ).length
}

type RepoWorktreeCatalog = {
  /** Decides the host of unstamped worktrees. */
  repos: readonly ExecutionHostOwnerRow[]
  worktreesByRepo: Readonly<Record<string, readonly HostScopedWorktreeRef[] | undefined>>
  detectedWorktreesByRepo: Readonly<
    Record<string, { worktrees: readonly HostScopedWorktreeRef[] } | undefined>
  >
}

export function getKnownRepoWorktreeIds(
  state: RepoWorktreeCatalog,
  projectId: string,
  hostId?: string
): string[] {
  return getOwnedRepoWorktreeIds(
    state,
    projectId,
    hostId ? createRepoWorktreeHostMatcher(state.repos, projectId, hostId) : () => true
  )
}

/** Listed and detected worktree ids for the project that `ownsWorktree` accepts. */
export function getOwnedRepoWorktreeIds(
  state: Omit<RepoWorktreeCatalog, 'repos'>,
  projectId: string,
  ownsWorktree: (worktree: HostScopedWorktree) => boolean
): string[] {
  const ids = new Set<string>()
  for (const worktree of selectWorktreesByRepo(state)[projectId] ?? []) {
    if (ownsWorktree(worktree)) {
      ids.add(worktree.id)
    }
  }
  for (const worktree of selectDetectedWorktreesByRepo(state)[projectId]?.worktrees ?? []) {
    if (ownsWorktree(worktree)) {
      ids.add(worktree.id)
    }
  }
  return [...ids]
}

/** Terminal tabs that removing this project's host row will close. */
export function countOpenRepoTerminalTabs(
  state: RepoWorktreeCatalog & {
    tabsByWorktree: Readonly<Record<string, readonly { id: string }[] | undefined>>
    ptyIdsByTabId: Readonly<Record<string, readonly string[] | undefined>>
  },
  projectId: string,
  hostId: string
): number {
  let count = 0
  for (const worktreeId of getKnownRepoWorktreeIds(state, projectId, hostId)) {
    for (const tab of state.tabsByWorktree[worktreeId] ?? []) {
      if ((state.ptyIdsByTabId[tab.id]?.length ?? 0) > 0) {
        count += 1
      }
    }
  }
  return count
}

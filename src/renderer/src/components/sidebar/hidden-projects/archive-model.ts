import {
  getRepoExecutionHostId,
  getWorktreeExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import { isRepoHidden } from '../../../../../shared/project/catalog/hidden-projects'
import {
  getProjectLastActiveAt,
  isIdleProject
} from '../../../../../shared/project/catalog/idle-projects'
import type { Repo } from '../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeVisitTimestamp } from '@/lib/workspace/activation/worktree-visit-recency'
import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'

export type ProjectActivityInputs = {
  worktreesByRepo: Readonly<
    Record<string, readonly Pick<Worktree, 'id' | 'hostId' | 'lastActivityAt'>[]>
  >
  visits: Readonly<Record<string, number>>
}

/** Idle ages are counted in days, so an hourly clock keeps them current. */
export const IDLE_AGE_TICK_MS = 60 * 60 * 1000

export type ArchiveGroup = { hostId: ExecutionHostId; repos: Repo[] }

/** Last activity of this host copy: its own machine's workspaces only, so a busy twin elsewhere does not count. */
export function getRepoLastActiveAt(repo: Repo, inputs: ProjectActivityInputs): number {
  const hostId = getRepoExecutionHostId(repo)
  const workspaces = (inputs.worktreesByRepo[repo.id] ?? [])
    .filter((workspace) => getWorktreeExecutionHostId(workspace, repo) === hostId)
    .map((workspace) => ({
      lastActivityAt: workspace.lastActivityAt,
      lastVisitedAt: getWorktreeVisitTimestamp(inputs.visits, workspace)
    }))
  return getProjectLastActiveAt(repo.addedAt, workspaces)
}

/** Archived projects per machine: this computer first, newest archive first within each. */
export function groupArchivedRepos(repos: readonly Repo[]): ArchiveGroup[] {
  const groupsByHostId = new Map<ExecutionHostId, Repo[]>()
  for (const entry of repos) {
    if (!isRepoHidden(entry)) {
      continue
    }
    const hostId = getRepoExecutionHostId(entry)
    const members = groupsByHostId.get(hostId)
    if (members) {
      members.push(entry)
    } else {
      groupsByHostId.set(hostId, [entry])
    }
  }
  return [...groupsByHostId]
    .map(([hostId, members]) => ({
      hostId,
      repos: members.sort(
        (a, b) =>
          (b.hiddenAt ?? 0) - (a.hiddenAt ?? 0) || a.displayName.localeCompare(b.displayName)
      )
    }))
    .sort(
      (a, b) =>
        Number(b.hostId === LOCAL_EXECUTION_HOST_ID) - Number(a.hostId === LOCAL_EXECUTION_HOST_ID)
    )
}

/** Last activity per project row, keyed by row identity: a stable, shallow-comparable store selection. */
export function getLastActiveAtByRow(
  repos: readonly Repo[],
  inputs: ProjectActivityInputs
): Record<string, number> {
  return Object.fromEntries(
    repos.map((entry) => [getRepoRowIdentity(entry), getRepoLastActiveAt(entry, inputs)])
  )
}

export function selectIdleListedRepos(
  repos: readonly Repo[],
  lastActiveAtByRow: Readonly<Record<string, number>>,
  now: number
): Repo[] {
  return repos.filter(
    (entry) =>
      !isRepoHidden(entry) &&
      isIdleProject(lastActiveAtByRow[getRepoRowIdentity(entry)] ?? entry.addedAt, now)
  )
}

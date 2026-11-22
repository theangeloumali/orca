import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import {
  createRepoRowExecutionHostLookup,
  resolveWorktreeExecutionHost,
  type ExecutionHostOwnerLookup
} from '../../../../../shared/execution-host/worktree-execution-host-resolution'
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
  workspacesByRepoId: Readonly<
    Record<string, readonly Pick<Worktree, 'id' | 'hostId' | 'lastActivityAt'>[]>
  >
  visits: Readonly<Record<string, number>>
}

/** Idle ages are counted in days, so an hourly clock keeps them current. */
export const IDLE_AGE_TICK_MS = 60 * 60 * 1000

export type ArchiveGroup = { hostId: ExecutionHostId; repos: Repo[] }

/** Last activity of this host copy: only workspaces the ownership rule resolves to its machine, so a busy twin
 * elsewhere (or an unstamped workspace two copies could own) does not count. */
function getRepoLastActiveAt(
  repo: Repo,
  inputs: ProjectActivityInputs,
  owners: ExecutionHostOwnerLookup<Repo>
): number {
  const hostId = getRepoExecutionHostId(repo)
  const workspaces: Parameters<typeof getProjectLastActiveAt>[1][number][] = []
  for (const workspace of inputs.workspacesByRepoId[repo.id] ?? []) {
    const owner = resolveWorktreeExecutionHost(owners, {
      repoId: repo.id,
      hostId: workspace.hostId
    })
    if (owner.kind === 'resolved' && owner.hostId === hostId) {
      workspaces.push({
        lastActivityAt: workspace.lastActivityAt,
        // Visits are written under the resolved host, so read them the same way.
        lastVisitedAt: getWorktreeVisitTimestamp(inputs.visits, { id: workspace.id, hostId })
      })
    }
  }
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
  inputs: ProjectActivityInputs,
  allRepos: readonly Repo[] = repos
): Record<string, number> {
  // Ownership needs every row: a twin left out of `repos` would make an unstamped workspace look resolved.
  const owners = createRepoRowExecutionHostLookup(allRepos)
  return Object.fromEntries(
    repos.map((entry) => [getRepoRowIdentity(entry), getRepoLastActiveAt(entry, inputs, owners)])
  )
}

type LastActiveAtSelector = (
  repos: readonly Repo[],
  inputs: ProjectActivityInputs,
  now: number
) => Record<string, number>

/** Runs on every store write: walks workspaces only for archived or possibly-idle rows, once per input change. */
export function createLastActiveAtSelector(): LastActiveAtSelector {
  let cached: { key: readonly unknown[]; result: Record<string, number> } | null = null
  return (repos, inputs, now) => {
    const key = [repos, inputs.workspacesByRepoId, inputs.visits, now]
    if (cached && key.every((input, index) => input === cached?.key[index])) {
      return cached.result
    }
    // Activity never predates addedAt, so a row added under the threshold ago cannot be idle.
    const candidates = repos.filter(
      (entry) => isRepoHidden(entry) || isIdleProject(entry.addedAt, now)
    )
    cached = { key, result: getLastActiveAtByRow(candidates, inputs, repos) }
    return cached.result
  }
}

/** Identifies an idle set, so a dismissal holds until a project joins or leaves it. */
export function getIdleProjectsKey(idleRepos: readonly Repo[]): string {
  return idleRepos.map(getRepoRowIdentity).sort().join('\n')
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

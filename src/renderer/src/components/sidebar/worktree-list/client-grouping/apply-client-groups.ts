import { getRepoRowIdentity } from '@/store/repos/repo-host-identity'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { isRepoHidden } from '../../../../../../shared/project/catalog/hidden-projects'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { moveReposToGroup } from '../rows/project-group-batch'

export type ClientGroupPlan = {
  clientName: string
  existingGroupId: string | null
  hostId: ExecutionHostId
  /** Only the projects the user left ticked. */
  projects: readonly Repo[]
}

export type ClientGroupStore = {
  createProjectGroup: (name: string, hostId: ExecutionHostId) => Promise<{ id: string } | null>
  moveProjectToGroup: (repo: Repo, groupId: string) => Promise<boolean>
}

export type ClientGroupsResult = {
  filedCount: number
  createdCount: number
  failedGroups: string[]
  /** Set when a store call threw; the counts still cover what was done before it. */
  error?: unknown
}

export type LiveClientGroupState = {
  repos: readonly Repo[]
  projectGroups: readonly ProjectGroup[]
}

/** Drops what changed since the review opened: projects grouped, hidden or removed, and deleted target groups. */
export function recheckClientGroupPlans(
  plans: readonly ClientGroupPlan[],
  live: LiveClientGroupState
): { plans: ClientGroupPlan[]; skippedCount: number } {
  const liveRepos = new Map(live.repos.map((repo) => [getRepoRowIdentity(repo), repo]))
  let skippedCount = 0
  const checked = plans.flatMap((plan) => {
    const groupExists =
      plan.existingGroupId === null ||
      live.projectGroups.some(
        (group) =>
          group.id === plan.existingGroupId && getRepoExecutionHostId(group) === plan.hostId
      )
    const projects = groupExists
      ? plan.projects.flatMap((project) => {
          const repo = liveRepos.get(getRepoRowIdentity(project))
          return repo && !repo.projectGroupId && !isRepoHidden(repo) ? [repo] : []
        })
      : []
    skippedCount += plan.projects.length - projects.length
    return projects.length > 0 ? [{ ...plan, projects }] : []
  })
  return { plans: checked, skippedCount }
}

/** Creates each new group on its machine, then files its projects; one group at a time, in order. */
export async function applyClientGroups(
  plans: readonly ClientGroupPlan[],
  store: ClientGroupStore
): Promise<ClientGroupsResult> {
  const result: ClientGroupsResult = { filedCount: 0, createdCount: 0, failedGroups: [] }
  try {
    await applyPlans(plans, store, result)
  } catch (error) {
    // Why: groups already filed stay filed, so the caller must still report them.
    result.error = error
  }
  return result
}

async function applyPlans(
  plans: readonly ClientGroupPlan[],
  store: ClientGroupStore,
  result: ClientGroupsResult
): Promise<void> {
  for (const plan of plans) {
    if (plan.projects.length === 0) {
      continue
    }
    const groupId =
      plan.existingGroupId ?? (await store.createProjectGroup(plan.clientName, plan.hostId))?.id
    if (!groupId) {
      result.failedGroups.push(plan.clientName)
      continue
    }
    if (!plan.existingGroupId) {
      result.createdCount += 1
    }
    let failed = false
    await moveReposToGroup(plan.projects, groupId, async (repo, id) => {
      const moved = await store.moveProjectToGroup(repo, id)
      if (moved) {
        result.filedCount += 1
      } else {
        failed = true
      }
    })
    if (failed) {
      result.failedGroups.push(plan.clientName)
    }
  }
}

import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
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
}

/** Creates each new group on its machine, then files its projects; one group at a time, in order. */
export async function applyClientGroups(
  plans: readonly ClientGroupPlan[],
  store: ClientGroupStore
): Promise<ClientGroupsResult> {
  const result: ClientGroupsResult = { filedCount: 0, createdCount: 0, failedGroups: [] }
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
  return result
}

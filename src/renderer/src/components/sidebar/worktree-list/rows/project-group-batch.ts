import type { Repo } from '../../../../../../shared/repository/repo-types'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'

export type MachineSplit = {
  hostId: ExecutionHostId
  groupable: Repo[]
  stayPut: Repo[]
}

type MoveProjectToGroup = (repo: Repo, groupId: string) => Promise<unknown>

/** A group lives on one machine, so only the first-selected project's machine can join it. */
export function splitSelectionByMachine(repos: readonly Repo[]): MachineSplit | null {
  const [first] = repos
  if (!first) {
    return null
  }
  const hostId = getRepoExecutionHostId(first)
  const groupable: Repo[] = []
  const stayPut: Repo[] = []
  for (const repo of repos) {
    ;(getRepoExecutionHostId(repo) === hostId ? groupable : stayPut).push(repo)
  }
  return { hostId, groupable, stayPut }
}

// Sequential: the host orders moves as they arrive, so the group keeps selection order.
export async function moveReposToGroup(
  repos: readonly Repo[],
  groupId: string,
  move: MoveProjectToGroup
): Promise<void> {
  for (const repo of repos) {
    if (repo.projectGroupId !== groupId) {
      await move(repo, groupId)
    }
  }
}

export async function createGroupFromRepos(
  name: string,
  repos: readonly Repo[],
  store: {
    createProjectGroup: (name: string, hostId: ExecutionHostId) => Promise<{ id: string } | null>
    moveProjectToGroup: MoveProjectToGroup
  }
): Promise<void> {
  const split = splitSelectionByMachine(repos)
  if (!split) {
    return
  }
  const group = await store.createProjectGroup(name, split.hostId)
  if (group) {
    await moveReposToGroup(split.groupable, group.id, store.moveProjectToGroup)
  }
}

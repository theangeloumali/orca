import type { LiveAgentWorktreeStatus } from '../feed-facts/workspace-activity-facts'
import {
  getWorktreeExecutionHostId,
  type ExecutionHostId
} from '../../execution-host/execution-host'
import type { Repo } from '../../repository/repo-types'
import type { Worktree } from '../../worktree/types'
import type { FolderWorkspace } from '../../folder-workspaces/folder-workspace-types'
import type { ProjectGroup } from '../../project/groups/project-group-types'
import { folderWorkspaceKey } from '../../workspace/identity/workspace-scope'
import { getFolderWorkspaceExecutionHostIdForRows } from './host-filtering'

export type HostAgentActivityCounts = { working: number; needsYou: number }

type HostOwner = Pick<Repo, 'connectionId' | 'executionHostId'>

export type HostWorkspaceSources = {
  worktreesByRepo: Readonly<Record<string, readonly Pick<Worktree, 'id' | 'repoId' | 'hostId'>[]>>
  repos: readonly (HostOwner & Pick<Repo, 'id'>)[]
  folderWorkspaces: readonly Pick<
    FolderWorkspace,
    'id' | 'projectGroupId' | 'connectionId' | 'executionHostId'
  >[]
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'connectionId' | 'executionHostId'>[]
}

/** Every workspace on one machine, read from the catalog so collapsed or filtered rows still count. */
export function collectHostWorkspaceIds(
  sources: HostWorkspaceSources,
  hostId: ExecutionHostId,
  defaultHostId: ExecutionHostId
): string[] {
  const repoById = new Map(sources.repos.map((repo) => [repo.id, repo]))
  const groupById = new Map(sources.projectGroups.map((group) => [group.id, group]))
  const ids: string[] = []
  for (const worktrees of Object.values(sources.worktreesByRepo)) {
    for (const worktree of worktrees) {
      const repo = repoById.get(worktree.repoId)
      if (getWorktreeExecutionHostId(worktree, repo, defaultHostId) === hostId) {
        ids.push(worktree.id)
      }
    }
  }
  for (const folderWorkspace of sources.folderWorkspaces) {
    const projectGroup = groupById.get(folderWorkspace.projectGroupId)
    if (
      getFolderWorkspaceExecutionHostIdForRows({ folderWorkspace, projectGroup, defaultHostId }) ===
      hostId
    ) {
      ids.push(folderWorkspaceKey(folderWorkspace.id))
    }
  }
  return ids
}

/** A machine header's live agents; monitoring is still work in progress, a permission prompt waits on you. */
export function countHostAgentActivity(
  worktreeIds: readonly string[],
  liveByWorktreeId: ReadonlyMap<string, LiveAgentWorktreeStatus>
): HostAgentActivityCounts {
  let working = 0
  let needsYou = 0
  for (const worktreeId of worktreeIds) {
    const status = liveByWorktreeId.get(worktreeId)
    if (status === 'permission') {
      needsYou += 1
    } else if (status === 'working' || status === 'monitoring') {
      working += 1
    }
  }
  return { working, needsYou }
}

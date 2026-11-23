import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import { isRepoHidden } from '../../../../../../shared/project/catalog/hidden-projects'
import { folderWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import {
  countHostAgentActivity,
  type HostAgentActivityCounts
} from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'
import { getDescendantGroupIds } from '../listing/project-group-subtree-collapse'
import { getRepoExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import {
  createRepoRowExecutionHostLookup,
  resolveWorktreeExecutionHost,
  type RepoRowExecutionHostLookup
} from '../../../../../../shared/execution-host/worktree-execution-host-resolution'

type ProjectGroupWorkspaceSources = {
  repos: readonly (Pick<Repo, 'id'> &
    Partial<Pick<Repo, 'projectGroupId' | 'hiddenAt' | 'connectionId' | 'executionHostId'>>)[]
  workspacesByRepoId: Readonly<Record<string, readonly Pick<Worktree, 'id' | 'hostId'>[]>>
  folderEntries: readonly Pick<FolderWorkspace, 'id' | 'projectGroupId'>[]
}

/** The group and every subgroup beneath it, as the sidebar draws them. */
export function useProjectGroupSubtreeIds(groupId: string): ReadonlySet<string> {
  const projectGroups = useAppStore((state) => state.projectGroups)
  return useMemo(
    () => new Set([groupId, ...getDescendantGroupIds(groupId, projectGroups)]),
    [groupId, projectGroups]
  )
}

type RepoRegistration = ProjectGroupWorkspaceSources['repos'][number]

/** One registration's own workspaces, read from the catalog so collapsed rows still count. */
export function collectRepoRegistrationWorkspaceIds(
  repo: RepoRegistration,
  sources: Pick<ProjectGroupWorkspaceSources, 'repos' | 'workspacesByRepoId'>,
  ownerLookup: RepoRowExecutionHostLookup<RepoRegistration> = createRepoRowExecutionHostLookup(
    sources.repos
  )
): string[] {
  // Why per host: another machine's copy shares the id; an unstamped worktree takes its repo's host.
  const hostId = getRepoExecutionHostId(repo)
  return (sources.workspacesByRepoId[repo.id] ?? [])
    .filter((worktree) => {
      const owner = resolveWorktreeExecutionHost(ownerLookup, {
        repoId: repo.id,
        hostId: worktree.hostId
      })
      return owner.kind === 'resolved' && owner.hostId === hostId
    })
    .map((worktree) => worktree.id)
}

/** Workspace ids under a group subtree, read from the catalog so folded rows still count. */
export function collectProjectGroupWorkspaceIds(
  subtreeGroupIds: ReadonlySet<string>,
  sources: ProjectGroupWorkspaceSources
): string[] {
  const ids: string[] = []
  const ownerLookup = createRepoRowExecutionHostLookup(sources.repos)
  for (const repo of sources.repos) {
    if (!isRepoHidden(repo) && repo.projectGroupId && subtreeGroupIds.has(repo.projectGroupId)) {
      ids.push(...collectRepoRegistrationWorkspaceIds(repo, sources, ownerLookup))
    }
  }
  for (const folderWorkspace of sources.folderEntries) {
    if (subtreeGroupIds.has(folderWorkspace.projectGroupId)) {
      ids.push(folderWorkspaceKey(folderWorkspace.id))
    }
  }
  return ids
}

/** Live working / needs-you counts for a group subtree; recomputes on agent-status epochs and a 30s clock. */
export function useProjectGroupAgentActivityCounts(
  subtreeGroupIds: ReadonlySet<string>
): HostAgentActivityCounts {
  // Same freshness clock as the workspace cards, so the header and its rows expire stale agents together.
  const now = useNow(30_000)
  const select = useMemo(
    () =>
      createAgentStatusEpochSelector(
        (
          state: AppState,
          groupIds: ReadonlySet<string>,
          repos: AppState['repos'],
          worktreesByRepo: AppState['worktreesByRepo'],
          folderWorkspaces: AppState['folderWorkspaces'],
          tabsByWorktree: AppState['tabsByWorktree'],
          clock: number
        ) =>
          countHostAgentActivity(
            collectProjectGroupWorkspaceIds(groupIds, {
              repos,
              workspacesByRepoId: worktreesByRepo,
              folderEntries: folderWorkspaces
            }),
            getLiveAgentStatusByWorktreeId(state.agentStatusByPaneKey, tabsByWorktree, clock)
          )
      ),
    []
  )
  return useAppStore(
    useShallow((state) =>
      select(
        state,
        subtreeGroupIds,
        state.repos,
        selectWorktreesByRepo(state),
        selectFolderWorkspaces(state),
        state.tabsByWorktree,
        now
      )
    )
  )
}

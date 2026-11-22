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

type ProjectGroupWorkspaceSources = {
  repos: readonly (Pick<Repo, 'id'> & Partial<Pick<Repo, 'projectGroupId' | 'hiddenAt'>>)[]
  workspacesByRepoId: Readonly<Record<string, readonly Pick<Worktree, 'id'>[]>>
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

/** Workspace ids under a group subtree, read from the catalog so folded rows still count. */
export function collectProjectGroupWorkspaceIds(
  subtreeGroupIds: ReadonlySet<string>,
  sources: ProjectGroupWorkspaceSources
): string[] {
  const ids: string[] = []
  for (const repo of sources.repos) {
    if (!isRepoHidden(repo) && repo.projectGroupId && subtreeGroupIds.has(repo.projectGroupId)) {
      ids.push(...(sources.workspacesByRepoId[repo.id] ?? []).map((worktree) => worktree.id))
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

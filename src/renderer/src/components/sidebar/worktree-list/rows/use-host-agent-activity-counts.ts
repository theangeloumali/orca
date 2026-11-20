import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import {
  getSettingsFocusedExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import {
  collectHostWorkspaceIds,
  countHostAgentActivity,
  type HostAgentActivityCounts
} from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'

/** Live working / needs-you counts for one machine; recomputes on agent-status epochs and a 30s clock. */
export function useHostAgentActivityCounts(hostId: ExecutionHostId): HostAgentActivityCounts {
  // Same freshness clock as the workspace cards, so the header and its rows expire stale agents together.
  const now = useNow(30_000)
  const select = useMemo(
    () =>
      createAgentStatusEpochSelector(
        (
          state: AppState,
          host: ExecutionHostId,
          worktreesByRepo: AppState['worktreesByRepo'],
          folderWorkspaces: AppState['folderWorkspaces'],
          tabsByWorktree: AppState['tabsByWorktree'],
          clock: number
        ) =>
          countHostAgentActivity(
            collectHostWorkspaceIds(
              {
                worktreesByRepo,
                repos: state.repos,
                folderWorkspaces,
                projectGroups: state.projectGroups
              },
              host,
              getSettingsFocusedExecutionHostId(state.settings)
            ),
            getLiveAgentStatusByWorktreeId(state.agentStatusByPaneKey, tabsByWorktree, clock)
          )
      ),
    []
  )
  return useAppStore(
    useShallow((state) =>
      select(
        state,
        hostId,
        state.worktreesByRepo,
        state.folderWorkspaces,
        state.tabsByWorktree,
        now
      )
    )
  )
}

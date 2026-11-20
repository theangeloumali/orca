import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import {
  countHostAgentActivity,
  type HostAgentActivityCounts
} from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'

/** Live working / needs-you counts for one machine header; recomputes on agent-status epochs and a 30s clock. */
export function useHostAgentActivityCounts(
  worktreeIds: readonly string[]
): HostAgentActivityCounts {
  // Same freshness clock as the workspace cards, so the header and its rows expire stale agents together.
  const now = useNow(30_000)
  const select = useMemo(
    () =>
      createAgentStatusEpochSelector(
        (
          state: AppState,
          ids: readonly string[],
          tabsByWorktree: AppState['tabsByWorktree'],
          clock: number
        ) =>
          countHostAgentActivity(
            ids,
            getLiveAgentStatusByWorktreeId(state.agentStatusByPaneKey, tabsByWorktree, clock)
          )
      ),
    []
  )
  return useAppStore(useShallow((state) => select(state, worktreeIds, state.tabsByWorktree, now)))
}

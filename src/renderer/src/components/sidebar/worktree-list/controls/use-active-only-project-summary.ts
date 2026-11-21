import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { worktreeHasRunningTerminal } from '../listing/desktop-workspace-row-facts'
import {
  summarizeActiveOnlyProjects,
  type ActiveOnlyProjectSummary
} from './active-only-project-summary'

function computeSummary(
  state: AppState,
  repos: AppState['repos'],
  worktreesByRepo: AppState['worktreesByRepo'],
  tabsByWorktree: AppState['tabsByWorktree'],
  ptyIdsByTabId: AppState['ptyIdsByTabId'],
  now: number
): ActiveOnlyProjectSummary {
  const liveStatusByWorktreeId = getLiveAgentStatusByWorktreeId(
    state.agentStatusByPaneKey,
    tabsByWorktree,
    now
  )
  const needsYouWorktreeIds = new Set(
    [...liveStatusByWorktreeId].flatMap(([id, status]) => (status === 'permission' ? [id] : []))
  )
  return summarizeActiveOnlyProjects({
    repos,
    workspacesByRepoId: worktreesByRepo,
    hasRunningTerminal: (id) => worktreeHasRunningTerminal(tabsByWorktree, ptyIdsByTabId, id),
    needsYouWorktreeIds
  })
}

/** Counts for the Active only status line; same 30s clock as the agent badges so they expire together. */
export function useActiveOnlyProjectSummary(): ActiveOnlyProjectSummary {
  const now = useNow(30_000)
  const [select] = useState(() => createAgentStatusEpochSelector(computeSummary))
  return useAppStore(
    useShallow((state) =>
      select(
        state,
        state.repos,
        selectWorktreesByRepo(state),
        state.tabsByWorktree,
        state.ptyIdsByTabId,
        now
      )
    )
  )
}

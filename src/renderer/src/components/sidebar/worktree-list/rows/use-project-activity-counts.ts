import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { LiveAgentWorktreeStatus } from '../../../../../../shared/sidebar-list/feed-facts/workspace-activity-facts'
import {
  countHostAgentActivity,
  type HostAgentActivityCounts
} from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'
import { worktreeHasRunningTerminal } from '../listing/desktop-workspace-row-facts'
import {
  getVisibleWorktreeTerminalActivityTabs,
  type TerminalActivityTab
} from '../listing/visible-worktree-activity-inputs'
import { collectRepoRegistrationWorkspaceIds } from './use-project-group-agent-activity-counts'

export type ProjectActivityCounts = HostAgentActivityCounts & { terminals: number }

/** Agents by state, plus workspaces that still hold a live terminal. */
export function countProjectActivity(
  workspaceIds: readonly string[],
  liveByWorktreeId: ReadonlyMap<string, LiveAgentWorktreeStatus>,
  terminalTabs: Record<string, TerminalActivityTab[]>,
  ptyIdsByTabId: Record<string, string[]>
): ProjectActivityCounts {
  const terminals = workspaceIds.filter((id) =>
    worktreeHasRunningTerminal(terminalTabs, ptyIdsByTabId, id)
  ).length
  return { ...countHostAgentActivity(workspaceIds, liveByWorktreeId), terminals }
}

/** One repo registration's live activity; recomputes on agent-status epochs, PTY changes and a 30s clock. */
export function useProjectActivityCounts(repo: Repo): ProjectActivityCounts {
  // Same freshness clock as the workspace cards, so header and rows expire stale agents together.
  const now = useNow(30_000)
  const select = useMemo(
    () =>
      createAgentStatusEpochSelector(
        (
          state: AppState,
          registration: Repo,
          repos: AppState['repos'],
          worktreesByRepo: AppState['worktreesByRepo'],
          terminalTabs: Record<string, TerminalActivityTab[]>,
          ptyIdsByTabId: AppState['ptyIdsByTabId'],
          clock: number
        ) =>
          countProjectActivity(
            collectRepoRegistrationWorkspaceIds(registration, {
              repos,
              workspacesByRepoId: worktreesByRepo
            }),
            getLiveAgentStatusByWorktreeId(state.agentStatusByPaneKey, terminalTabs, clock),
            terminalTabs,
            ptyIdsByTabId
          )
      ),
    []
  )
  return useAppStore(
    useShallow((state) =>
      select(
        state,
        repo,
        state.repos,
        selectWorktreesByRepo(state),
        // Title writes replace the raw tab map; the id-only projection keeps its identity.
        getVisibleWorktreeTerminalActivityTabs(state.tabsByWorktree),
        state.ptyIdsByTabId,
        now
      )
    )
  )
}

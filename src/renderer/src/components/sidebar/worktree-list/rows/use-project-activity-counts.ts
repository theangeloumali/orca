import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { getLiveAgentStatusByWorktreeId } from '@/lib/workspace/activity/worktree-activity-state'
import { getTabIdToWorktreeId } from '@/lib/workspace/tabs/tab-worktree-index'
import { isExecutionHostForWorktree } from '@/lib/workspace/ownership/qualified-worktree-execution-owner'
import { getAgentPaneExecutionHost } from '@/store/slices/agent-status/pane-authority/agent-pane-execution-host'
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import { isFreshNonDoneAgentStatus } from '../../../../../../shared/agent-status/contracts/agent-status-freshness'
import { resolveAgentStatusWorktreeId } from '../../../../../../shared/agent-status/identity/agent-status-worktree-attribution'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import { getPtyExecutionHost } from '../../../../../../shared/terminal/pty/lifecycle/terminal-execution-host'
import type { GroupHeaderRow } from '../../../../../../shared/sidebar-list/row-types'
import {
  countHostAgentActivity,
  type HostAgentActivityCounts
} from '../../../../../../shared/sidebar-list/hosts/host-agent-activity'
import {
  getVisibleWorktreeTerminalActivityTabs,
  type TerminalActivityTab
} from '../listing/visible-worktree-activity-inputs'
import { createPaneOwnershipProjection } from './project-activity-ownership'

export type ProjectActivityCounts = HostAgentActivityCounts & { terminals: number }
/** The workspace ids a header draws, per machine. */
export type HeaderWorkspaceScope = ReadonlyMap<ExecutionHostId, readonly string[]>
type PaneHostState = Parameters<typeof getAgentPaneExecutionHost>[0] &
  Parameters<typeof isExecutionHostForWorktree>[0]
type TerminalTabs = Record<string, TerminalActivityTab[]>

const EMPTY_SCOPE: HeaderWorkspaceScope = new Map()

/** A machine section's header covers its own slice; any other header, every machine it lists. */
export function getHeaderWorkspaceScope(
  row: Pick<GroupHeaderRow, 'hostId' | 'hostWorktreeIds' | 'worktreeIds'>
): HeaderWorkspaceScope {
  if (row.hostId === undefined) {
    return row.hostWorktreeIds ?? EMPTY_SCOPE
  }
  return new Map([[row.hostId, row.hostWorktreeIds?.get(row.hostId) ?? row.worktreeIds ?? []]])
}

/** Workspace ids repeat across machines, so an agent counts only where its pane runs. */
function liveAgentsOnHost(
  state: PaneHostState,
  agents: readonly (readonly [string, AgentStatusEntry])[],
  hostId: ExecutionHostId,
  terminalTabs: TerminalTabs,
  now: number
) {
  const worktreeIdByTabId = getTabIdToWorktreeId(terminalTabs)
  const onHost = agents.filter(([paneKey, entry]) => {
    const worktreeId = resolveAgentStatusWorktreeId(entry, worktreeIdByTabId)
    return (
      worktreeId !== null &&
      isExecutionHostForWorktree(
        state,
        worktreeId,
        hostId,
        getAgentPaneExecutionHost(state, paneKey, entry)
      )
    )
  })
  return getLiveAgentStatusByWorktreeId(new Map(onHost), terminalTabs, now)
}

/** Hostless PTY ids are local; a malformed prefixed id ('foreign') matches no machine. */
function hasLiveTerminalOnHost(
  state: PaneHostState,
  terminalTabs: TerminalTabs,
  ptyIdsByTabId: Record<string, string[]>,
  worktreeId: string,
  hostId: ExecutionHostId
): boolean {
  return (terminalTabs[worktreeId] ?? []).some((tab) =>
    (ptyIdsByTabId[tab.id] ?? []).some((ptyId) =>
      isExecutionHostForWorktree(
        state,
        worktreeId,
        hostId,
        getPtyExecutionHost(ptyId) ?? LOCAL_EXECUTION_HOST_ID
      )
    )
  )
}

/** Agents by state, plus workspaces that still hold a live terminal, summed over the header's machines. */
export function countHeaderActivity(
  state: PaneHostState,
  agentStatusByPaneKey: ReadonlyMap<string, AgentStatusEntry>,
  scope: HeaderWorkspaceScope,
  terminalTabs: TerminalTabs,
  ptyIdsByTabId: Record<string, string[]>,
  now: number
): ProjectActivityCounts {
  const fresh = [...agentStatusByPaneKey].filter(([, entry]) =>
    isFreshNonDoneAgentStatus(entry, now)
  )
  const totals: ProjectActivityCounts = { needsYou: 0, working: 0, terminals: 0 }
  for (const [hostId, ids] of scope) {
    const agents = countHostAgentActivity(
      ids,
      liveAgentsOnHost(state, fresh, hostId, terminalTabs, now)
    )
    totals.needsYou += agents.needsYou
    totals.working += agents.working
    totals.terminals += ids.filter((id) =>
      hasLiveTerminalOnHost(state, terminalTabs, ptyIdsByTabId, id, hostId)
    ).length
  }
  return totals
}

/** A header's live activity; recomputes on agent-status epochs, scope, pane ownership or PTY changes and a 30s clock. */
export function useProjectActivityCounts(scope: HeaderWorkspaceScope): ProjectActivityCounts {
  // Same freshness clock as the workspace cards, so header and rows expire stale agents together.
  const now = useNow(30_000)
  const { selectOwnership, select } = useMemo(
    () => ({
      selectOwnership: createPaneOwnershipProjection(),
      select: createAgentStatusEpochSelector(
        (
          // Typed down to the epoch-keyed agent map; every other read goes through a cache input.
          state: Pick<AppState, 'agentStatusEpoch' | 'agentStatusByPaneKey'>,
          ownership: PaneHostState,
          headerScope: HeaderWorkspaceScope,
          terminalTabs: TerminalTabs,
          clock: number
        ) =>
          countHeaderActivity(
            ownership,
            state.agentStatusByPaneKey,
            headerScope,
            terminalTabs,
            ownership.ptyIdsByTabId,
            clock
          )
      )
    }),
    []
  )
  return useAppStore(
    useShallow((state) =>
      select(
        state,
        selectOwnership(state),
        scope,
        // Title writes replace the raw tab map; the id-only projection keeps its identity.
        getVisibleWorktreeTerminalActivityTabs(state.tabsByWorktree),
        now
      )
    )
  )
}

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import { hasAwakeStructuredChat } from '@/store/slices/agent-status/structured-sessions/structured-chat-slept-at'
import { resolveWorktreeStatus } from '@/lib/workspace/activity/worktree-status'
import type { WorktreeStatus } from '../../../../../../shared/worktree/row-display/worktree-status-rollup'
import { EMPTY_BROWSER_TABS, EMPTY_TABS } from './worktree-card-empty-inputs'
import {
  selectLivePtyIdsForWorktree,
  selectTerminalLayoutRootsForWorktree,
  selectRuntimePaneTitlesForWorktree
} from './worktree-card-status-inputs'
import { selectWorktreeAgentActivitySummary } from './worktree-agent-activity-summary'
import { selectStoppedWslDistro } from '@/runtime/hosts/wsl/wsl-host-stopped-status'
import { selectWorkspaceRuntimeEnvironmentId } from '../../../../lib/workspace/ownership/workspace-runtime-environment'
import { parseRemoteRuntimePtyId } from '../../../../../../shared/remote-runtime/remote-runtime-pty-id'

/** The Start card's rule: a pane with no server yet, or on the stopped one, ended with its distro. */
export function ptyOutlivesStoppedHost(
  ptyId: string,
  stoppedEnvironmentId: string | null
): boolean {
  if (stoppedEnvironmentId === null) {
    return true
  }
  const environmentId = parseRemoteRuntimePtyId(ptyId)?.environmentId
  return environmentId != null && environmentId !== stoppedEnvironmentId
}

function withoutStoppedHostPtys(
  ptyIdsByTabId: Record<string, string[]>,
  stoppedEnvironmentId: string
): Record<string, string[]> {
  const live: Record<string, string[]> = {}
  for (const [tabId, ptyIds] of Object.entries(ptyIdsByTabId)) {
    const kept = ptyIds.filter((ptyId) => ptyOutlivesStoppedHost(ptyId, stoppedEnvironmentId))
    // Same array when nothing dropped, so useShallow keeps the card from re-rendering.
    if (kept.length > 0) {
      live[tabId] = kept.length === ptyIds.length ? ptyIds : kept
    }
  }
  return live
}

// Why the cheap check first: every card's selector runs on each store update, and few hosts stop.
function hasStoppedWslHost(state: {
  wslHostStatuses?: Record<string, { state: string }>
}): boolean {
  for (const id in state.wslHostStatuses) {
    if (state.wslHostStatuses[id]?.state === 'distro-stopped') {
      return true
    }
  }
  return false
}

/** The workspace's own WSL host while its distro is known stopped; null otherwise. */
export function selectStoppedWorkspaceHost(
  state: Pick<AppState, 'wslHostStatuses'> &
    Parameters<typeof selectWorkspaceRuntimeEnvironmentId>[0],
  worktreeId: string
): string | null {
  if (!hasStoppedWslHost(state)) {
    return null
  }
  const owner = selectWorkspaceRuntimeEnvironmentId(state, worktreeId)
  return owner && selectStoppedWslDistro(state, owner) !== null ? owner : null
}

export function selectWorktreeActivityPtyIds(
  state: AppState,
  worktreeId: string
): Record<string, string[]> {
  const ptyIds = selectLivePtyIdsForWorktree(state, worktreeId)
  const stopped = selectStoppedWorkspaceHost(state, worktreeId)
  return stopped ? withoutStoppedHostPtys(ptyIds, stopped) : ptyIds
}

export function useWorktreeActivityStatus(worktreeId: string): WorktreeStatus {
  const tabs = useAppStore((s) => s.tabsByWorktree[worktreeId] ?? EMPTY_TABS)
  const browserTabs = useAppStore((s) => s.browserTabsByWorktree[worktreeId] ?? EMPTY_BROWSER_TABS)
  const hasStructuredChat = useAppStore((s) =>
    hasAwakeStructuredChat(s.unifiedTabsByWorktree[worktreeId], s.structuredChatSleptAtByPaneKey)
  )
  const runtimePaneTitlesForWorktree = useAppStore(
    useShallow((s) => selectRuntimePaneTitlesForWorktree(s, worktreeId))
  )
  const ptyIdsForWorktree = useAppStore(
    useShallow((s) => selectWorktreeActivityPtyIds(s, worktreeId))
  )
  const terminalLayoutRootsByTabId = useAppStore(
    useShallow((s) => selectTerminalLayoutRootsForWorktree(s, worktreeId))
  )
  const summary = useAppStore(useShallow((s) => selectWorktreeAgentActivitySummary(s, worktreeId)))

  // Use common liveness and agent-row precedence so compact and detailed cards show the same status.
  return useMemo(
    () =>
      resolveWorktreeStatus({
        tabs,
        browserTabs,
        hasStructuredChat,
        ptyIdsByTabId: ptyIdsForWorktree,
        runtimePaneTitlesByTabId: runtimePaneTitlesForWorktree,
        terminalLayoutRootsByTabId,
        ...summary
      }),
    [
      tabs,
      browserTabs,
      hasStructuredChat,
      ptyIdsForWorktree,
      runtimePaneTitlesForWorktree,
      terminalLayoutRootsByTabId,
      summary
    ]
  )
}

import { isWorktreeRetiredByRemoval } from '../../../../../../shared/worktree/removal/removal-visibility'
import {
  getWorktreeExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { TerminalTab } from '../../../../../../shared/workspace-layout/terminal-tab-types'
import type { WorkspaceRowFactReader } from '../../../../../../shared/workspace-view/workspace-row-filters'
import {
  isAutomationGeneratedWorkspace,
  isCliCreatedWorkspace,
  isDefaultBranchWorkspace,
  isDetachedHeadWorkspace
} from '../../../../../../shared/worktree/visibility/workspace-kinds'
import { isWorkspaceOwnedBySomeoneElse } from '../../../../../../shared/workspace-view/workspace-creator-visibility'
import { parseWorkspaceKey } from '../../../../../../shared/workspace/identity/workspace-scope'
import type { Worktree } from '../../../../../../shared/worktree/types'
import {
  hiddenProjectRowFacts,
  type HiddenProjects
} from '../../../../../../shared/project/catalog/hidden-projects'
import { isInactiveWorkspace } from '@/lib/workspace/activity/worktree-activity-state'
import { tabHasLivePty } from '../../../../../../shared/workspace-layout/terminal-surfaces/tab-has-live-pty'

export type DesktopWorkspaceRowFactInputs = {
  repoMap: ReadonlyMap<string, Repo>
  /** indexHiddenProjects over every repo row; repoMap keeps one row per id. */
  hiddenProjects: HiddenProjects
  defaultHostId: ExecutionHostId
  pairedDeviceIdsByEnvironment: ReadonlyMap<string, string>
  tabsByWorktree: Record<string, Pick<TerminalTab, 'id'>[]> | null
  ptyIdsByTabId: Record<string, string[]> | null
  browserTabsByWorktree?: Record<string, { id: string }[]> | null
  worktreeIdsWithLiveAgent: ReadonlySet<string>
  worktreeIdsWithStructuredChat?: ReadonlySet<string>
  /** Rows in a PTY-rebind grace window; read as unverifiable, never as asleep (#15996). */
  sleepingSweepExemptWorktreeIds?: ReadonlySet<string>
  /** Wired only while Needs you is on; absent keeps every row. */
  worktreeNeedsYou?: (worktree: Worktree) => boolean
}

/** The slice of the agent-status projection that ranks a workspace's attention. */
export type WorktreeAttentionSource = {
  attention: (worktreeId: string, lastActivityAt?: number, now?: number) => { cls: number }
}

// Smart sort's class 1 is the sidebar's own "needs you" (active-only-summary-selector.ts).
const NEEDS_YOU_ATTENTION_CLASS = 1

/** Reads a worktree or a folder: key; folders carry no lastActivityAt. */
export type WorkspaceNeedsYouReader = (
  workspace: Pick<Worktree, 'id'> & Partial<Pick<Worktree, 'lastActivityAt'>>
) => boolean

export function createWorktreeNeedsYouReader(
  projection: WorktreeAttentionSource,
  now: number
): WorkspaceNeedsYouReader {
  return (workspace) =>
    projection.attention(workspace.id, workspace.lastActivityAt, now).cls ===
    NEEDS_YOU_ATTENTION_CLASS
}

/** Whether any of the workspace's terminal tabs still has a live PTY. */
export function worktreeHasRunningTerminal(
  tabsByWorktree: DesktopWorkspaceRowFactInputs['tabsByWorktree'],
  ptyIdsByTabId: DesktopWorkspaceRowFactInputs['ptyIdsByTabId'],
  worktreeId: string
): boolean {
  const livePtyIds = ptyIdsByTabId ?? {}
  return (tabsByWorktree?.[worktreeId] ?? []).some((tab) => tabHasLivePty(livePtyIds, tab.id))
}

export function buildDesktopWorkspaceRowFactReader(
  inputs: DesktopWorkspaceRowFactInputs
): WorkspaceRowFactReader<Worktree> {
  const hostId = (worktree: Worktree): ExecutionHostId | null => {
    const repo = inputs.repoMap.get(worktree.repoId)
    return repo ? getWorktreeExecutionHostId(worktree, repo, inputs.defaultHostId) : null
  }
  return {
    isArchived: (worktree) => worktree.isArchived || isWorktreeRetiredByRemoval(worktree),
    ...hiddenProjectRowFacts(inputs.hiddenProjects),
    isFolderWorkspace: (worktree) => parseWorkspaceKey(worktree.id)?.type === 'folder',
    repoId: (worktree) => worktree.repoId,
    hostId,
    isOtherClient: (worktree) =>
      isWorkspaceOwnedBySomeoneElse(worktree, inputs.pairedDeviceIdsByEnvironment),
    isDefaultBranch: (worktree) =>
      isDefaultBranchWorkspace(worktree, inputs.repoMap.get(worktree.repoId)),
    isAutomationCreated: isAutomationGeneratedWorkspace,
    isCliCreated: isCliCreatedWorkspace,
    isDetachedHead: isDetachedHeadWorkspace,
    isMainWorktree: (worktree) => worktree.isMainWorktree,
    needsYou: inputs.worktreeNeedsYou,
    hasRunningTerminal: (worktree) =>
      worktreeHasRunningTerminal(inputs.tabsByWorktree, inputs.ptyIdsByTabId, worktree.id),
    isSleeping: (worktree) =>
      inputs.sleepingSweepExemptWorktreeIds?.has(worktree.id) !== true &&
      isInactiveWorkspace(
        worktree.id,
        inputs.tabsByWorktree,
        inputs.ptyIdsByTabId,
        inputs.browserTabsByWorktree,
        inputs.worktreeIdsWithLiveAgent,
        inputs.worktreeIdsWithStructuredChat
      )
  }
}

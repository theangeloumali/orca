import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/index'
import type { AppState } from '@/store/types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { useNow } from '@/lib/window-activity/use-now'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import { readRuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { getProjectHostSetupProjectionFromState } from '@/store/projects/project-host-setup-selector'
import {
  readHiddenVmCheckouts,
  withoutHiddenVmWorktrees
} from '@/runtime/ephemeral-vm/vm-create-hidden-checkouts'
import { getProjectHeaderRevealTarget } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import '../listing/visible-worktrees'
import { computeVisibleWorktrees } from '../listing/compute-visible-worktrees'
import { buildVisibleWorktreeOptionsFromState } from '../listing/visible-worktree-options-from-state'
import { getSidebarProjectGrouping } from '../listing/sidebar-project-grouping'
import { selectSidebarFilterState } from './sidebar-filter-actions'
import { summarizeActiveOnly, type ActiveOnlySummary } from './active-only-project-summary'

// Smart sort's class 1 is the sidebar's own "needs you".
const NEEDS_YOU_CLASS = 1

function selectNeedsYouIds(state: AppState, hidden: readonly Worktree[]): ReadonlySet<string> {
  const now = Date.now()
  const { projection } = state.agentStatusByPaneKey
  return new Set(
    hidden
      .filter(
        (worktree) =>
          projection.attention(worktree.id, worktree.lastActivityAt, now).cls === NEEDS_YOU_CLASS
      )
      .map((worktree) => worktree.id)
  )
}

/** Runs the list pipeline with and without Active only, so the counts match the drawn rows. */
function computeActiveOnlySummary(state: AppState): ActiveOnlySummary {
  const repoMap = getIndexedRepoMap(state.repos)
  const options = buildVisibleWorktreeOptionsFromState(state, readRuntimeStatuses(), repoMap)
  const worktreesByRepo = selectWorktreesByRepo(state)
  const hiddenVmCheckouts = readHiddenVmCheckouts()
  const listWith = (showOnlyRunningTerminals: boolean): Worktree[] =>
    withoutHiddenVmWorktrees(
      computeVisibleWorktrees(worktreesByRepo, [], { ...options, showOnlyRunningTerminals }),
      hiddenVmCheckouts
    )
  const grouping = getSidebarProjectGrouping(
    getProjectHostSetupProjectionFromState(state),
    state.showWorkspaceHostSections
  )
  return summarizeActiveOnly({
    shown: listWith(true),
    all: listWith(false),
    sectionKeyOf: (worktree) =>
      getProjectHeaderRevealTarget(worktree.repoId, repoMap, grouping).key,
    needsYouIds: (hidden) => selectNeedsYouIds(state, hidden)
  })
}

// Recompute keys: every store field the pipeline reads; agent status rides the epoch.
function summaryInputs(state: AppState): readonly unknown[] {
  return [
    selectWorktreesByRepo(state),
    state.repos,
    state.projects,
    state.projectHostSetups,
    state.tabsByWorktree,
    state.ptyIdsByTabId,
    state.browserTabsByWorktree,
    state.unifiedTabsByWorktree,
    state.structuredChatSleptAtByPaneKey,
    state.runtimeEnvironments,
    state.worktreeLineageById,
    state.settings,
    state.sortBy,
    state.showWorkspaceHostSections,
    ...Object.values(selectSidebarFilterState(state))
  ]
}

/** Counts for the Active only status line; same 30s clock as the agent badges so they expire together. */
export function useActiveOnlySummary(): ActiveOnlySummary {
  const now = useNow(30_000)
  const [select] = useState(() =>
    createAgentStatusEpochSelector<AppState, readonly unknown[], ActiveOnlySummary>(
      computeActiveOnlySummary
    )
  )
  return useAppStore(useShallow((state) => select(state, now, ...summaryInputs(state))))
}

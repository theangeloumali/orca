import type { AppState } from '@/store/types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceWorktree } from '../../../../../../shared/folder-workspaces/folder-workspace-worktree'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import { getIndexedRepoMap } from '@/store/repos/repository-catalog-index'
import type { RuntimeStatuses } from '@/store/slices/runtime-status/views/runtime-status-owner'
import { selectSidebarLineageParentIdentities } from '@/store/slices/worktrees/metadata/cross-store-lineage-parents'
import {
  withoutHiddenVmWorktrees,
  type readHiddenVmCheckouts
} from '@/runtime/ephemeral-vm/vm-create-hidden-checkouts'
import { getProjectHeaderRevealTarget } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import { getFolderLaneSectionKey } from '../../../../../../shared/sidebar-list/folders/folder-workspace-occurrences'
import {
  filterReposForVisibleHosts,
  getVisibleSidebarHostIdSet
} from '../../../../../../shared/sidebar-list/hosts/host-filtering'
import { getEmptyProjectPlaceholderRepoIds } from '../../../../../../shared/sidebar-list/catalog/empty-project-placeholder-repos'
import '../listing/visible-worktrees'
import {
  computeVisibleWorktrees,
  type VisibleWorktreeOptions
} from '../listing/compute-visible-worktrees'
import { buildVisibleWorktreeOptionsFromState } from '../listing/visible-worktree-options-from-state'
import {
  getVisibleWorktreeBrowserActivityTabs,
  getVisibleWorktreeTerminalActivityTabs,
  getWorktreeIdsWithStructuredChat
} from '../listing/visible-worktree-activity-inputs'
import { selectListedFolderWorkspaces } from '../listing/listed-folder-workspaces'
import { getSidebarProjectGroupingFromState } from '../listing/sidebar-project-grouping'
import { selectSidebarFilterState } from './sidebar-filter-actions'
import { summarizeActiveOnly, type ActiveOnlySummary } from './active-only-project-summary'

/** Facts read outside the store, each a recompute key. */
export type ActiveOnlySummaryContext = {
  now: number
  statuses: RuntimeStatuses
  hiddenVmCheckouts: ReturnType<typeof readHiddenVmCheckouts>
  botListed: ReadonlySet<string> | undefined
  agentSendTarget: string | null
}

// Smart sort's class 1 is the sidebar's own "needs you".
const NEEDS_YOU_CLASS = 1
const NO_FOLDERS: readonly FolderWorkspace[] = []

// Title and focus writes replace the raw tab maps, so key on the id-only projections the list uses.
function summaryKeys(state: AppState, context: ActiveOnlySummaryContext): readonly unknown[] {
  return [
    state.agentStatusEpoch,
    ...Object.values(context),
    selectWorktreesByRepo(state),
    state.repos,
    state.projects,
    state.projectHostSetups,
    getVisibleWorktreeTerminalActivityTabs(state.tabsByWorktree),
    state.ptyIdsByTabId,
    getVisibleWorktreeBrowserActivityTabs(state.browserTabsByWorktree),
    getWorktreeIdsWithStructuredChat(
      state.unifiedTabsByWorktree,
      state.structuredChatSleptAtByPaneKey
    ),
    state.runtimeEnvironments,
    state.worktreeLineageById,
    selectSidebarLineageParentIdentities(state, context.statuses),
    selectFolderWorkspaces(state),
    state.projectGroups,
    state.sortBy,
    state.showWorkspaceHostSections,
    state.groupBy,
    ...Object.values(selectSidebarFilterState(state))
  ]
}

function buildOptions(state: AppState, context: ActiveOnlySummaryContext): VisibleWorktreeOptions {
  const options = buildVisibleWorktreeOptionsFromState(
    state,
    context.statuses,
    getIndexedRepoMap(state.repos)
  )
  const tabsByWorktree = getVisibleWorktreeTerminalActivityTabs(state.tabsByWorktree)
  const browserTabsByWorktree = getVisibleWorktreeBrowserActivityTabs(state.browserTabsByWorktree)
  return {
    ...options,
    tabsByWorktree,
    browserTabsByWorktree,
    botListedWorktreeIdentities: context.botListed,
    // The drawn list forces the picker's target visible (use-visible-worktrees.ts).
    forcedVisibleWorktreeIds: context.agentSendTarget ? [context.agentSendTarget] : undefined
  }
}

function listFolderRows(
  state: AppState,
  options: VisibleWorktreeOptions,
  listed: { showOnlyRunningTerminals: boolean; worktrees: readonly Worktree[] }
): readonly FolderWorkspace[] {
  return selectListedFolderWorkspaces(
    { ...options, showOnlyRunningTerminals: listed.showOnlyRunningTerminals },
    {
      folders: selectFolderWorkspaces(state) ?? NO_FOLDERS,
      projectGroups: state.projectGroups,
      visibleHostIdSet: getVisibleSidebarHostIdSet(
        state.visibleWorkspaceHostIds,
        state.workspaceHostScope
      ),
      listedWorktrees: listed.worktrees
    }
  )
}

// Empty-project headers drawn with Active only off, as use-empty-project-placeholders.ts lists them.
function listPlaceholderRepoIds(
  state: AppState,
  options: VisibleWorktreeOptions,
  context: ActiveOnlySummaryContext,
  allWorktrees: readonly Worktree[]
): string[] {
  const visibleHostIdSet = getVisibleSidebarHostIdSet(
    state.visibleWorkspaceHostIds,
    state.workspaceHostScope
  )
  const placeholderRepoIds = getEmptyProjectPlaceholderRepoIds({
    groupBy: state.groupBy,
    repos: filterReposForVisibleHosts(state.repos, visibleHostIdSet, options.defaultHostId),
    worktreesByRepo: selectWorktreesByRepo(state),
    visibleWorktrees: allWorktrees,
    filterRepoIds: state.filterRepoIds,
    hiddenProjects: options.hiddenProjects,
    pendingVmRepoIds: context.hiddenVmCheckouts.repoIds
  })
  // The header builder skips ids with no repo row (project-section-grouping.ts).
  return [...placeholderRepoIds].filter((repoId) => options.repoMap.has(repoId))
}

/** Runs the list pipeline with and without Active only, so the counts match the drawn rows. */
function computeSummary(
  state: AppState,
  options: VisibleWorktreeOptions,
  context: ActiveOnlySummaryContext
): ActiveOnlySummary {
  const worktreesByRepo = selectWorktreesByRepo(state)
  const listWith = (showOnlyRunningTerminals: boolean): Worktree[] =>
    withoutHiddenVmWorktrees(
      computeVisibleWorktrees(worktreesByRepo, [], { ...options, showOnlyRunningTerminals }),
      context.hiddenVmCheckouts
    )
  const shownWorktrees = listWith(true)
  const allWorktrees = listWith(false)
  // One cached row per folder, so a folder in both lists is the same row.
  const folderSectionByRow = new Map<Worktree, string>()
  const folderRowsFor = (showOnlyRunningTerminals: boolean, worktrees: readonly Worktree[]) =>
    listFolderRows(state, options, { showOnlyRunningTerminals, worktrees }).map((folder) => {
      const row = getFolderWorkspaceWorktree(folder)
      folderSectionByRow.set(row, getFolderLaneSectionKey(folder.projectGroupId))
      return row
    })
  const grouping = getSidebarProjectGroupingFromState(state)
  const sectionKeyOfRepo = (repoId: string): string =>
    getProjectHeaderRevealTarget(repoId, options.repoMap, grouping).key
  const { projection } = state.agentStatusByPaneKey
  return summarizeActiveOnly({
    shown: [...shownWorktrees, ...folderRowsFor(true, shownWorktrees)],
    all: [...allWorktrees, ...folderRowsFor(false, allWorktrees)],
    sectionKeyOf: (row) => folderSectionByRow.get(row) ?? sectionKeyOfRepo(row.repoId),
    listedOnlySectionKeys: listPlaceholderRepoIds(state, options, context, allWorktrees).map(
      sectionKeyOfRepo
    ),
    needsYouIds: (hidden) =>
      new Set(
        hidden
          .filter(
            (row) =>
              projection.attention(row.id, row.lastActivityAt, context.now).cls === NEEDS_YOU_CLASS
          )
          .map((row) => row.id)
      )
  })
}

/** A per-reader cache: recomputes only when a key moves or a settings write changes the focused host. */
export function createActiveOnlySummarySelector() {
  let cached: {
    keys: readonly unknown[]
    settings: AppState['settings']
    defaultHostId: VisibleWorktreeOptions['defaultHostId']
    summary: ActiveOnlySummary
  } | null = null
  return (state: AppState, context: ActiveOnlySummaryContext): ActiveOnlySummary => {
    const keys = summaryKeys(state, context)
    const keysMatch =
      cached !== null &&
      cached.keys.length === keys.length &&
      cached.keys.every((key, index) => Object.is(key, keys[index]))
    if (cached && keysMatch && cached.settings === state.settings) {
      return cached.summary
    }
    const options = buildOptions(state, context)
    if (cached && keysMatch && cached.defaultHostId === options.defaultHostId) {
      cached.settings = state.settings
      return cached.summary
    }
    const summary = computeSummary(state, options, context)
    cached = { keys, settings: state.settings, defaultHostId: options.defaultHostId, summary }
    return summary
  }
}

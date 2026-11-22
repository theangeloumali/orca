import type { ExecutionHostId } from '../execution-host/execution-host'
import type { PersistedUIState } from '../orca-profiles/persisted-ui-state-types'
import {
  isHiddenByKindSwitch,
  type WorkspaceKind,
  type WorkspaceKindSwitches
} from '../worktree/visibility/workspace-kinds'

/** Persisted Workspace options filters shared across surfaces. */
export type WorkspaceRowFilters = WorkspaceKindSwitches & {
  hideSleepingWorkspaces: boolean
  /** Keeps each project's main workspace out of the "Hide sleeping" sweep. Absent means on (#8873). */
  alwaysShowDefaultBranchWorkspace?: boolean
  hideWorkspacesFromOtherDevices: boolean
  /** "Active only": keep just the workspaces with a live terminal. Absent means off. */
  showOnlyRunningTerminals?: boolean
  /** "Needs you": keep just the workspaces whose agent waits on you. Absent means off. */
  showOnlyNeedsYou?: boolean
  filterRepoIds: readonly string[]
  /** The hosts shown; null shows every host. */
  visibleHostIds: readonly ExecutionHostId[] | null
}

/** Exhaustive mapping from each filter to its PersistedUIState field. */
export const WORKSPACE_ROW_FILTER_UI_FIELDS = {
  hideSleepingWorkspaces: 'hideSleepingWorkspaces',
  alwaysShowDefaultBranchWorkspace: 'alwaysShowDefaultBranchWorkspace',
  hideDefaultBranchWorkspace: 'hideDefaultBranchWorkspace',
  hideAutomationGeneratedWorkspaces: 'hideAutomationGeneratedWorkspaces',
  hideCliCreatedWorkspaces: 'hideCliCreatedWorkspaces',
  hideDetachedHeadWorkspaces: 'hideDetachedHeadWorkspaces',
  hideWorkspacesFromOtherDevices: 'hideWorkspacesFromOtherDevices',
  showOnlyRunningTerminals: 'showOnlyRunningTerminals',
  showOnlyNeedsYou: 'showOnlyNeedsYou',
  filterRepoIds: 'filterRepoIds',
  visibleHostIds: 'visibleWorkspaceHostIds'
} as const satisfies { [Key in keyof WorkspaceRowFilters]: keyof PersistedUIState }

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the keys of a literal that satisfies a mapped type over WorkspaceRowFilters.
export const WORKSPACE_ROW_FILTER_KEYS = Object.keys(
  WORKSPACE_ROW_FILTER_UI_FIELDS
) as readonly (keyof WorkspaceRowFilters)[]

/** Every filter off, the default-branch exemption on, every project and host shown. */
export const NO_WORKSPACE_ROW_FILTERS: WorkspaceRowFilters = {
  hideSleepingWorkspaces: false,
  alwaysShowDefaultBranchWorkspace: true,
  hideDefaultBranchWorkspace: false,
  hideAutomationGeneratedWorkspaces: false,
  hideCliCreatedWorkspaces: false,
  hideDetachedHeadWorkspaces: false,
  hideWorkspacesFromOtherDevices: false,
  showOnlyRunningTerminals: false,
  showOnlyNeedsYou: false,
  filterRepoIds: [],
  visibleHostIds: null
}

/** Desktop derives facts from worktrees/tabs; mobile reads host-stamped facts. Missing older-host facts read so the row stays visible. */
export type WorkspaceRowFactReader<Row> = {
  isArchived: (row: Row) => boolean
  /** The row's own host copy of its project is hidden; not a filter, so Clear filters never lifts it. */
  isInHiddenProject: (row: Row) => boolean
  /** Every copy of the project is hidden; a filter naming it selects nothing visible, so it is ignored. */
  isProjectHidden: (repoId: string) => boolean
  /** A folder workspace follows only the host, other-client and Active only filters (useSidebarHostVisibleScope). */
  isFolderWorkspace: (row: Row) => boolean
  repoId: (row: Row) => string
  /** Null when the row's host cannot be resolved; a host filter then hides it. */
  hostId: (row: Row) => ExecutionHostId | null
  isOtherClient: (row: Row) => boolean
  isDefaultBranch: (row: Row) => boolean
  isAutomationCreated: (row: Row) => boolean
  isCliCreated: (row: Row) => boolean
  isDetachedHead: (row: Row) => boolean
  isMainWorktree: (row: Row) => boolean
  isSleeping: (row: Row) => boolean
  /** Desktop reads local live PTYs; the feed and phone read the host's count, lost contact included. */
  hasRunningTerminal: (row: Row) => boolean
  /** Desktop reads the agent attention class; a reader without it (phone, feed, older host) keeps the row. */
  needsYou?: (row: Row) => boolean
}

/** Exempt the main checkout from sleeping sweeps, including detached/offline mains that may be a project’s only entry point (#8873). */
export function isSleepingSweepExempt(
  isMainWorktree: boolean,
  alwaysShowDefaultBranchWorkspace: boolean | undefined
): boolean {
  return alwaysShowDefaultBranchWorkspace !== false && isMainWorktree
}

const KIND_READERS: Record<
  WorkspaceKind,
  <Row>(read: WorkspaceRowFactReader<Row>, row: Row) => boolean
> = {
  defaultBranch: (read, row) => read.isDefaultBranch(row),
  automationCreated: (read, row) => read.isAutomationCreated(row),
  cliCreated: (read, row) => read.isCliCreated(row),
  detachedHead: (read, row) => read.isDetachedHead(row)
}

/** Build host/project sets once for the whole row filter pass. */
function buildWorkspaceRowPredicate<Row>(
  filters: WorkspaceRowFilters,
  read: WorkspaceRowFactReader<Row>
): (row: Row) => boolean {
  const listedFilterIds = filters.filterRepoIds.filter((id) => !read.isProjectHidden(id))
  const repoIds = listedFilterIds.length > 0 ? new Set(listedFilterIds) : null
  const hostIds = filters.visibleHostIds ? new Set(filters.visibleHostIds) : null
  return (row) => {
    if (read.isArchived(row) || read.isInHiddenProject(row)) {
      return false
    }
    if (filters.hideWorkspacesFromOtherDevices && read.isOtherClient(row)) {
      return false
    }
    if (hostIds) {
      const hostId = read.hostId(row)
      if (hostId === null || !hostIds.has(hostId)) {
        return false
      }
    }
    // Before the folder exit: Active only hides idle folders and the main checkout too.
    if (filters.showOnlyRunningTerminals && !read.hasRunningTerminal(row)) {
      return false
    }
    if (read.isFolderWorkspace(row)) {
      return true
    }
    if (filters.showOnlyNeedsYou && read.needsYou && !read.needsYou(row)) {
      return false
    }
    if (isHiddenByKindSwitch(filters, (kind) => KIND_READERS[kind](read, row))) {
      return false
    }
    if (repoIds && !repoIds.has(read.repoId(row))) {
      return false
    }
    // Explicit hides still win; the exemption covers only the sleeping sweep.
    return (
      !filters.hideSleepingWorkspaces ||
      isSleepingSweepExempt(read.isMainWorktree(row), filters.alwaysShowDefaultBranchWorkspace) ||
      !read.isSleeping(row)
    )
  }
}

/** What the listing rules read to judge a folder workspace and the lineage drawn beneath it. */
export type FolderListingReader<Folder> = {
  hasRunningTerminal: (folder: Folder) => boolean
  /** Wired only while Needs you is on; absent keeps every folder, as for rows. */
  needsYou?: (folder: Folder) => boolean
  /** Wired only while a find query is typed. */
  matchesFind?: (folder: Folder) => boolean
  identityOf: (folder: Folder) => string
  /** Host identities of the rows the list keeps. */
  listedRowIdentities: Iterable<string>
  parentIdentityOf: (identity: string) => string | undefined
}

/** Folder workspaces skip the row filters, so Active only, Needs you and find drop them here; a folder
 *  above a listed row or folder stays, since the tree draws that row beneath it. */
export function filterFolderWorkspacesForListingRules<Folder>(
  folders: readonly Folder[],
  filters: Pick<WorkspaceRowFilters, 'showOnlyRunningTerminals' | 'showOnlyNeedsYou'>,
  read: FolderListingReader<Folder>
): readonly Folder[] {
  const rules = [
    filters.showOnlyRunningTerminals ? read.hasRunningTerminal : undefined,
    filters.showOnlyNeedsYou ? read.needsYou : undefined,
    read.matchesFind
  ].filter((rule) => rule !== undefined)
  if (rules.length === 0) {
    return folders
  }
  const kept = new Set<string>()
  // Stopping at a kept identity also ends a corrupt parent cycle.
  const keepWithAncestors = (identity: string): void => {
    for (let id: string | undefined = identity; id !== undefined && !kept.has(id);) {
      kept.add(id)
      id = read.parentIdentityOf(id)
    }
  }
  for (const folder of folders) {
    if (rules.every((rule) => rule(folder))) {
      keepWithAncestors(read.identityOf(folder))
    }
  }
  for (const identity of read.listedRowIdentities) {
    keepWithAncestors(identity)
  }
  return folders.filter((folder) => kept.has(read.identityOf(folder)))
}

/** The rows the Workspace options filters keep, in their given order. */
export function filterWorkspaceRows<Row>(
  rows: readonly Row[],
  filters: WorkspaceRowFilters,
  read: WorkspaceRowFactReader<Row>
): Row[] {
  return rows.filter(buildWorkspaceRowPredicate(filters, read))
}

/** The filters `target` sets differently from `current`; the exemption's absence means on. */
export function changedWorkspaceRowFilters(
  current: WorkspaceRowFilters,
  target: WorkspaceRowFilters
): Partial<WorkspaceRowFilters> {
  const changed: Partial<WorkspaceRowFilters> = {}
  for (const key of WORKSPACE_ROW_FILTER_KEYS) {
    const from = comparableFilterValue(current, key)
    const to = comparableFilterValue(target, key)
    const same =
      Array.isArray(from) && Array.isArray(to)
        ? from.length === to.length && from.every((value, i) => value === to[i])
        : from === to
    if (!same) {
      Object.assign(changed, { [key]: target[key] })
    }
  }
  return changed
}

function comparableFilterValue(
  filters: WorkspaceRowFilters,
  key: keyof WorkspaceRowFilters
): WorkspaceRowFilters[keyof WorkspaceRowFilters] {
  if (key === 'alwaysShowDefaultBranchWorkspace') {
    return filters.alwaysShowDefaultBranchWorkspace !== false
  }
  return key === 'showOnlyRunningTerminals' || key === 'showOnlyNeedsYou'
    ? filters[key] === true
    : filters[key]
}

/** The filters set away from their defaults: what Clear filters resets. */
export function activeWorkspaceRowFilterKeys(
  filters: WorkspaceRowFilters
): (keyof WorkspaceRowFilters)[] {
  return WORKSPACE_ROW_FILTER_KEYS.filter(
    (key) => key in changedWorkspaceRowFilters(filters, NO_WORKSPACE_ROW_FILTERS)
  )
}

/** Pluralized "N filter(s)" for an options trigger's tooltip and accessibility label. */
export function formatActiveFilterLabel(count: number): string {
  return `${count} ${count === 1 ? 'filter' : 'filters'}`
}

/** The active-filter count as an options trigger's corner badge shows it. */
export function formatActiveFilterBadge(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** Count narrowing filters plus selected known projects; stale repo IDs do not inflate the badge. */
export function countActiveWorkspaceFilters(
  filters: WorkspaceRowFilters,
  knownRepoIds: readonly string[]
): number {
  const counted = activeWorkspaceRowFilterKeys(filters).filter(
    (key) =>
      key !== 'filterRepoIds' &&
      // Disabling the exemption narrows only an active sleeping sweep.
      (key !== 'alwaysShowDefaultBranchWorkspace' || filters.hideSleepingWorkspaces)
  )
  const selectedRepoCount = knownRepoIds.filter((id) => filters.filterRepoIds.includes(id)).length
  return counted.length + selectedRepoCount
}

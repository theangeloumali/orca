import type { VisibleWorkspaceHostIds } from '../../../../../../shared/ui-chrome/ui-chrome-types'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getDescendantGroupIds } from '../listing/project-group-subtree-collapse'

export type QuickFilterChipState = {
  showOnlyRunningTerminals: boolean
  showOnlyNeedsYou: boolean
  visibleWorkspaceHostIds: VisibleWorkspaceHostIds
  hostIdsBeforeThisMachineChip: VisibleWorkspaceHostIds
  filterRepoIds: readonly string[]
}

export type QuickFilterChipSetters = {
  setShowOnlyRunningTerminals: (value: boolean) => void
  setShowOnlyNeedsYou: (value: boolean) => void
  setVisibleWorkspaceHostIds: (ids: VisibleWorkspaceHostIds) => void
  setHostIdsBeforeThisMachineChip: (ids: VisibleWorkspaceHostIds) => void
  setFilterRepoIds: (ids: string[]) => void
}

type GroupLink = Pick<ProjectGroup, 'id' | 'parentGroupId'>
type RepoLink = Pick<Repo, 'id' | 'projectGroupId'>

export function isThisMachineChipOn(visibleHostIds: VisibleWorkspaceHostIds): boolean {
  return visibleHostIds?.length === 1 && visibleHostIds[0] === LOCAL_EXECUTION_HOST_ID
}

export function toggleThisMachineChip(
  state: QuickFilterChipState,
  store: QuickFilterChipSetters
): void {
  if (isThisMachineChipOn(state.visibleWorkspaceHostIds)) {
    store.setVisibleWorkspaceHostIds(state.hostIdsBeforeThisMachineChip)
    store.setHostIdsBeforeThisMachineChip(null)
    return
  }
  store.setHostIdsBeforeThisMachineChip(state.visibleWorkspaceHostIds)
  store.setVisibleWorkspaceHostIds([LOCAL_EXECUTION_HOST_ID])
}

/** A client is a top-level group; picking it filters to every project in its subtree. */
export function clientGroupRepoIds(
  groupId: string,
  projectGroups: readonly GroupLink[],
  repos: readonly RepoLink[]
): string[] {
  const subtree = getDescendantGroupIds(groupId, projectGroups)
  subtree.add(groupId)
  return repos
    .filter((repo) => repo.projectGroupId != null && subtree.has(repo.projectGroupId))
    .map((repo) => repo.id)
}

export function findActiveClientGroupId(
  filterRepoIds: readonly string[],
  projectGroups: readonly GroupLink[],
  repos: readonly RepoLink[]
): string | null {
  if (filterRepoIds.length === 0) {
    return null
  }
  const filtered = new Set(filterRepoIds)
  const client = projectGroups.find((group) => {
    if (group.parentGroupId !== null) {
      return false
    }
    const ids = clientGroupRepoIds(group.id, projectGroups, repos)
    return ids.length === filtered.size && ids.every((id) => filtered.has(id))
  })
  return client?.id ?? null
}

export function hasQuickFilterChipOn(state: QuickFilterChipState): boolean {
  return (
    state.showOnlyRunningTerminals ||
    state.showOnlyNeedsYou ||
    isThisMachineChipOn(state.visibleWorkspaceHostIds) ||
    state.filterRepoIds.length > 0
  )
}

/** "All" turns every chip off; it writes only what is on, so an idle click is a no-op. */
export function applyAllChip(state: QuickFilterChipState, store: QuickFilterChipSetters): void {
  if (state.showOnlyRunningTerminals) {
    store.setShowOnlyRunningTerminals(false)
  }
  if (state.showOnlyNeedsYou) {
    store.setShowOnlyNeedsYou(false)
  }
  if (isThisMachineChipOn(state.visibleWorkspaceHostIds)) {
    toggleThisMachineChip(state, store)
  }
  if (state.filterRepoIds.length > 0) {
    store.setFilterRepoIds([])
  }
}

export function countRepoMachines(
  repos: readonly Pick<Repo, 'connectionId' | 'executionHostId'>[]
): number {
  return new Set(repos.map(getRepoExecutionHostId)).size
}

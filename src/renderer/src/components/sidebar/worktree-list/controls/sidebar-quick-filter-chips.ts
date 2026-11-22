import type { VisibleWorkspaceHostIds } from '../../../../../../shared/ui-chrome/ui-chrome-types'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import { getDistinctProjectGroups } from '../../../../../../shared/project/groups/project-groups'
import { isRepoHidden } from '../../../../../../shared/project/catalog/hidden-projects'
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
type RepoLink = Pick<Repo, 'id' | 'projectGroupId' | 'hiddenAt'>

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

/** A client is a top-level group; picking it filters to every listed (unarchived) project in its subtree. */
export function clientGroupRepoIds(
  groupId: string,
  projectGroups: readonly GroupLink[],
  repos: readonly RepoLink[]
): string[] {
  const subtree = getDescendantGroupIds(groupId, projectGroups)
  subtree.add(groupId)
  const ids = repos
    .filter(
      (repo) =>
        !isRepoHidden(repo) && repo.projectGroupId != null && subtree.has(repo.projectGroupId)
    )
    .map((repo) => repo.id)
  return [...new Set(ids)]
}

export type ClientChoice<G extends GroupLink> = { group: G; repoIds: string[] }

/** Top-level groups with their projects, one per id across host copies; an empty one stays listed so the menu can disable it. */
export function listClientChoices<G extends GroupLink>(
  projectGroups: readonly G[],
  repos: readonly RepoLink[]
): ClientChoice<G>[] {
  return getDistinctProjectGroups(projectGroups)
    .filter((group) => group.parentGroupId === null)
    .map((group) => ({ group, repoIds: clientGroupRepoIds(group.id, projectGroups, repos) }))
}

type ClientFilterInputs = {
  filterRepoIds: readonly string[]
  projectGroups: readonly GroupLink[]
  repos: readonly RepoLink[]
}

/** The filter stores ids, so a selected client's new projects only match once they are re-derived. */
export function followClientMembership(
  previous: ClientFilterInputs,
  next: ClientFilterInputs
): string[] | null {
  const clientId = findActiveClientGroupId(
    previous.filterRepoIds,
    previous.projectGroups,
    previous.repos
  )
  if (clientId === null || next.filterRepoIds !== previous.filterRepoIds) {
    return null
  }
  const ids = clientGroupRepoIds(clientId, next.projectGroups, next.repos)
  const current = new Set(next.filterRepoIds)
  const unchanged = ids.length === current.size && ids.every((id) => current.has(id))
  return ids.length === 0 || unchanged ? null : ids
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

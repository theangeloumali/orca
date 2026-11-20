import type { ProfileSaveDomains } from '../profile-save-domains'
import { WORKSPACE_SESSION_DOMAINS } from '../workspace-session-domains'
import type { PersistedState } from '../../../shared/orca-profiles/persisted-state-types'
import type {
  ProjectGroup,
  ProjectGroupMutation,
  ProjectGroupUpdate
} from '../../../shared/project/groups/project-group-types'
import {
  createProjectGroup,
  getProjectGroupSubtreeIds,
  normalizeProjectGroupName
} from '../../../shared/project/groups/project-groups'
import { getNextRootProjectOrder } from '../../../shared/sidebar-list/sections/root-project-order'
import { folderWorkspaceKey } from '../../../shared/workspace/identity/workspace-scope'
import { removeWorkspaceSessionOwnersEverywhere } from '../restoring-sessions/session-owner-removal'

export type ProjectGroupMutationOperations = {
  state: PersistedState
  scheduleSave: (domains: ProfileSaveDomains) => void
  removeWorkspaceLineageForRemovedFolder: (folderWorkspaceId: string) => void
  pruneMobileClientTabSelections: (matchesWorktreeId: (worktreeId: string) => boolean) => void
}

export class ProjectGroupPersistenceOperations {
  constructor(private readonly operations: ProjectGroupMutationOperations) {}

  private get state(): PersistedState {
    return this.operations.state
  }

  private scheduleSave(domains: ProfileSaveDomains): void {
    this.operations.scheduleSave(domains)
  }

  private removeWorkspaceLineageForRemovedFolder(folderWorkspaceId: string): void {
    this.operations.removeWorkspaceLineageForRemovedFolder(folderWorkspaceId)
  }

  private pruneMobileClientTabSelections(matchesWorktreeId: (worktreeId: string) => boolean): void {
    this.operations.pruneMobileClientTabSelections(matchesWorktreeId)
  }

  getProjectGroups(): ProjectGroup[] {
    return [...(this.state.projectGroups ?? [])].sort(
      (left, right) => left.tabOrder - right.tabOrder || left.name.localeCompare(right.name)
    )
  }

  createProjectGroup(input: {
    name: string
    parentPath?: string | null
    connectionId?: string | null
    parentGroupId?: string | null
    createdFrom: ProjectGroup['createdFrom']
  }): ProjectGroup {
    // A subgroup lives on its parent's machine: inherit the parent's SSH target when none is given.
    const parent = (this.state.projectGroups ?? []).find((g) => g.id === input.parentGroupId)
    input = { ...input, connectionId: input.connectionId ?? parent?.connectionId ?? null }
    this.assertValidParents([
      {
        groupId: null,
        parentGroupId: input.parentGroupId ?? null,
        connectionId: input.connectionId
      }
    ])
    let maxOrder = -1
    // Large persisted lists can exceed spread argument limits.
    for (const existingGroup of this.state.projectGroups ?? []) {
      maxOrder = Math.max(maxOrder, existingGroup.tabOrder)
    }
    const group = createProjectGroup({
      ...input,
      tabOrder: maxOrder + 1
    })
    const rootProjectOrder = !group.parentGroupId
      ? getNextRootProjectOrder(this.state.repos, this.state.projectGroups ?? [])
      : undefined
    if (rootProjectOrder !== undefined) {
      group.rootProjectOrder = rootProjectOrder
    }
    this.state.projectGroups = [...(this.state.projectGroups ?? []), group]
    this.scheduleSave(['projectGroups'])
    return group
  }

  updateProjectGroup(groupId: string, updates: ProjectGroupUpdate): ProjectGroup | null {
    const group = (this.state.projectGroups ?? []).find((entry) => entry.id === groupId)
    if (!group) {
      return null
    }
    if (updates.parentGroupId !== undefined) {
      this.assertValidParents([{ groupId, parentGroupId: updates.parentGroupId }])
    }
    this.applyGroupUpdate(group, updates)
    this.scheduleSave(['projectGroups'])
    return group
  }

  updateProjectGroups(mutations: readonly ProjectGroupMutation[]): ProjectGroup[] | null {
    const byId = new Map((this.state.projectGroups ?? []).map((group) => [group.id, group]))
    if (mutations.some(({ groupId }) => !byId.has(groupId))) {
      return null
    }
    // Check all moves together, before applying any, so a refused batch changes nothing.
    this.assertValidParents(
      mutations.flatMap(({ groupId, updates }) =>
        updates.parentGroupId !== undefined
          ? [{ groupId, parentGroupId: updates.parentGroupId }]
          : []
      )
    )
    const updated = mutations.map(({ groupId, updates }) => {
      const group = byId.get(groupId)!
      this.applyGroupUpdate(group, updates)
      return group
    })
    if (updated.length > 0) {
      this.scheduleSave(['projectGroups'])
    }
    return updated
  }

  /** With every move applied, each new parent must exist, share the group's machine and not sit inside its own child. */
  private assertValidParents(
    moves: readonly {
      groupId: string | null
      parentGroupId: string | null
      connectionId?: string | null
    }[]
  ): void {
    const groups = this.state.projectGroups ?? []
    const parentById = new Map(groups.map((entry) => [entry.id, entry.parentGroupId]))
    const connectionById = new Map(groups.map((entry) => [entry.id, entry.connectionId ?? null]))
    for (const move of moves) {
      if (move.groupId !== null) {
        parentById.set(move.groupId, move.parentGroupId)
      }
    }
    for (const { groupId, parentGroupId, connectionId } of moves) {
      if (parentGroupId !== null && !parentById.has(parentGroupId)) {
        throw new Error('invalid_project_group_parent')
      }
      const ownConnection = groupId === null ? (connectionId ?? null) : connectionById.get(groupId)
      if (parentGroupId !== null && connectionById.get(parentGroupId) !== (ownConnection ?? null)) {
        throw new Error('invalid_project_group_parent')
      }
      // Walk up from the new parent; meeting the moved group means a cycle. Orphan links end the walk.
      let cursor = parentGroupId
      for (let steps = 0; cursor !== null && parentById.has(cursor); steps += 1) {
        if (cursor === groupId || steps > parentById.size) {
          throw new Error('invalid_project_group_parent')
        }
        cursor = parentById.get(cursor) ?? null
      }
    }
  }

  private applyGroupParent(group: ProjectGroup, parentGroupId: string | null): void {
    const wasNested = group.parentGroupId !== null
    group.parentGroupId = parentGroupId
    if (parentGroupId !== null) {
      // Only top-level groups take part in root project order.
      delete group.rootProjectOrder
    } else if (wasNested) {
      // Same rule as createProjectGroup: only rejoin root order once manual root ordering is in use.
      const nextRootOrder = getNextRootProjectOrder(
        this.state.repos,
        this.state.projectGroups ?? []
      )
      if (nextRootOrder !== undefined) {
        group.rootProjectOrder = nextRootOrder
      }
    }
  }

  private applyGroupUpdate(group: ProjectGroup, updates: ProjectGroupUpdate): void {
    if (updates.parentGroupId !== undefined) {
      this.applyGroupParent(group, updates.parentGroupId)
    }
    if (updates.name !== undefined) {
      group.name = normalizeProjectGroupName(updates.name, group.name)
    }
    if (updates.isCollapsed !== undefined) {
      group.isCollapsed = updates.isCollapsed
    }
    if (updates.tabOrder !== undefined && Number.isFinite(updates.tabOrder)) {
      group.tabOrder = updates.tabOrder
    }
    if (updates.rootProjectOrder === null) {
      delete group.rootProjectOrder
    } else if (
      updates.rootProjectOrder !== undefined &&
      Number.isFinite(updates.rootProjectOrder) &&
      // A group nested by this same update leaves root order; a stale rank must not follow it.
      typeof updates.parentGroupId !== 'string'
    ) {
      group.rootProjectOrder = updates.rootProjectOrder
    }
    if (updates.color !== undefined) {
      group.color = typeof updates.color === 'string' ? updates.color : null
    }
    if (updates.hookSettings !== undefined) {
      group.hookSettings = updates.hookSettings
    }
    group.updatedAt = Date.now()
  }

  deleteProjectGroup(groupId: string): boolean {
    const before = this.state.projectGroups?.length ?? 0
    const deletedGroupIds = getProjectGroupSubtreeIds(this.state.projectGroups ?? [], groupId)
    this.state.projectGroups = (this.state.projectGroups ?? []).filter(
      (group) => !deletedGroupIds.has(group.id)
    )
    if ((this.state.projectGroups?.length ?? 0) === before) {
      return false
    }
    // Sidebar grouping does not own repos; ungroup them rather than delete them.
    this.state.repos = this.state.repos.map((repo) =>
      repo.projectGroupId && deletedGroupIds.has(repo.projectGroupId)
        ? { ...repo, projectGroupId: null }
        : repo
    )
    const removedFolderWorkspaceKeys = new Set<string>()
    for (const workspace of this.state.folderWorkspaces ?? []) {
      if (deletedGroupIds.has(workspace.projectGroupId)) {
        removedFolderWorkspaceKeys.add(folderWorkspaceKey(workspace.id))
        this.removeWorkspaceLineageForRemovedFolder(workspace.id)
      }
    }
    // Remove all partition copies or folder layouts could resurrect on load.
    removeWorkspaceSessionOwnersEverywhere(this.state, removedFolderWorkspaceKeys)
    this.state.folderWorkspaces = (this.state.folderWorkspaces ?? []).filter(
      (workspace) => !deletedGroupIds.has(workspace.projectGroupId)
    )
    this.pruneMobileClientTabSelections((worktreeId) => removedFolderWorkspaceKeys.has(worktreeId))
    this.scheduleSave([
      'projectGroups',
      'repos',
      'folderWorkspaces',
      'workspaceLineageByChildKey',
      'crossStoreLineageByChildKey',
      ...WORKSPACE_SESSION_DOMAINS,
      'mobileClientTabSelectionsByDeviceId'
    ])
    return true
  }
}

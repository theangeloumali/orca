import type { ProjectGroup } from '../../../../../shared/project/groups/project-group-types'
import { buildProjectGroupChildIndex } from '../../../../../shared/project/groups/project-groups'
import {
  indexProjectGroupColorOwners,
  resolveProjectGroupColor
} from '../../../../../shared/project/groups/project-group-appearance'

/** ownerGroupId is the group whose color the row shows (itself or a parent), for its background. */
export type SidebarColorGroup = { group: ProjectGroup; depth: number; ownerGroupId: string }

/** One entry per group id in sidebar tree order; a group on two machines keeps its colored copy. */
export function orderSidebarColorGroups(groups: readonly ProjectGroup[]): SidebarColorGroup[] {
  const byId = indexProjectGroupColorOwners(groups)
  const unique = [...byId.values()].sort((a, b) => a.tabOrder - b.tabOrder)
  const childIds = buildProjectGroupChildIndex(unique)
  const ordered: SidebarColorGroup[] = []
  const visited = new Set<string>()
  const visit = (group: ProjectGroup, depth: number): void => {
    if (visited.has(group.id)) {
      return
    }
    visited.add(group.id)
    const ownerGroupId = resolveProjectGroupColor(byId, group.id)?.groupId ?? group.id
    ordered.push({ group, depth, ownerGroupId })
    for (const childId of childIds.get(group.id) ?? []) {
      const child = byId.get(childId)
      if (child) {
        visit(child, depth + 1)
      }
    }
  }
  // A missing parent is treated as a root so no group drops out of the list.
  for (const group of unique) {
    if (!group.parentGroupId || !byId.has(group.parentGroupId)) {
      visit(group, 0)
    }
  }
  return ordered
}

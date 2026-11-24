import type { ProjectGroup } from '../../../../../shared/project/groups/project-group-types'
import { buildProjectGroupChildIndex } from '../../../../../shared/project/groups/project-groups'
import { normalizeRepoBadgeColor } from '../../../../../shared/repository/appearance/repo-badge-color'

export type SidebarColorGroup = { group: ProjectGroup; depth: number }

/** One entry per group id in sidebar tree order; a group on two machines keeps its colored copy. */
export function orderSidebarColorGroups(groups: readonly ProjectGroup[]): SidebarColorGroup[] {
  const byId = new Map<string, ProjectGroup>()
  for (const group of groups) {
    const kept = byId.get(group.id)
    if (!kept || (!normalizeRepoBadgeColor(kept.color) && normalizeRepoBadgeColor(group.color))) {
      byId.set(group.id, group)
    }
  }
  const unique = [...byId.values()].sort((a, b) => a.tabOrder - b.tabOrder)
  const childIds = buildProjectGroupChildIndex(unique)
  const ordered: SidebarColorGroup[] = []
  const visited = new Set<string>()
  const visit = (group: ProjectGroup, depth: number): void => {
    if (visited.has(group.id)) {
      return
    }
    visited.add(group.id)
    ordered.push({ group, depth })
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

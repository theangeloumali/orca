import { recordCollapsedGroupChanges } from '@/store/slices/ui/collapsed-group-toggle'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { getProjectGroupHeaderKey } from '../../../../../../shared/sidebar-list/sections/group-keys'
import type { ProjectGroupingModel } from '../../../../../../shared/sidebar-list/sections/project-section-grouping'
import { getProjectGroupSubtreeProjectKeys } from '../../../../../../shared/sidebar-list/sections/project-group-tree'
import { areAllProjectsCollapsed } from './project-collapse-all'
import { getDistinctProjectGroups } from '../../../../../../shared/project/groups/project-groups'

export function getDescendantGroupIds(
  groupId: string,
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'parentGroupId'>[]
): Set<string> {
  const descendants = new Set<string>()
  const pending = [groupId]
  // One entry per id, the last host copy winning, so the subtree matches the drawn tree.
  const distinctGroups = getDistinctProjectGroups(projectGroups)
  // The visited set also stops a corrupt parent cycle from looping forever.
  for (let parentId = pending.pop(); parentId !== undefined; parentId = pending.pop()) {
    for (const child of distinctGroups) {
      if (child.parentGroupId === parentId && child.id !== groupId && !descendants.has(child.id)) {
        descendants.add(child.id)
        pending.push(child.id)
      }
    }
  }
  return descendants
}

/** Collapse keys beneath a group as drawn; empty when it has neither subgroups nor listed projects. */
export function getProjectGroupSubtreeCollapseKeys(
  groupId: string,
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'parentGroupId'>[],
  repos: readonly Repo[],
  projectGrouping: ProjectGroupingModel
): string[] {
  const descendants = getDescendantGroupIds(groupId, projectGroups)
  const projectKeys = getProjectGroupSubtreeProjectKeys(
    new Set([groupId, ...descendants]),
    repos,
    projectGrouping
  )
  return [...[...descendants].map(getProjectGroupHeaderKey), ...projectKeys]
}

// Expands only when everything beneath is already collapsed, like the Projects toggle.
export function toggleProjectGroupSubtreeCollapsed(
  collapsedGroups: ReadonlySet<string>,
  subtreeKeys: readonly string[]
): Set<string> {
  const collapse = !areAllProjectsCollapsed(subtreeKeys, collapsedGroups)
  const next = new Set(collapsedGroups)
  for (const key of subtreeKeys) {
    if (collapse) {
      next.add(key)
    } else {
      next.delete(key)
    }
  }
  return recordCollapsedGroupChanges(collapsedGroups, next, subtreeKeys)
}

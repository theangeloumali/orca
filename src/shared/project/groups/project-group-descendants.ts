import type { ProjectGroup } from './project-group-types'
import { getDistinctProjectGroups } from './project-groups'

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

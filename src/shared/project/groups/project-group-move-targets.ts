import { LOCAL_EXECUTION_HOST_ID, type ExecutionHostId } from '../../execution-host/execution-host'
import { getProjectGroupExecutionHostIdForRows } from '../../sidebar-list/hosts/host-filtering'
import type { ProjectGroup } from './project-group-types'
import { getProjectGroupSubtreeIds } from './project-groups'

type MoveTargetGroup = Pick<ProjectGroup, 'id' | 'name' | 'parentGroupId' | 'tabOrder'>

export type ProjectGroupMoveTarget = {
  id: string
  name: string
  depth: number
  /** The moving group and its own subgroups: moving into them would make a cycle. */
  disabled: boolean
}

/** One machine's groups. Server groups are stamped on adoption, so an unstamped group is this computer's. */
export function filterProjectGroupsForOwnerHost<
  T extends Pick<ProjectGroup, 'connectionId' | 'executionHostId'>
>(groups: readonly T[], ownerHostId: ExecutionHostId): T[] {
  return groups.filter(
    (group) => getProjectGroupExecutionHostIdForRows(group, LOCAL_EXECUTION_HOST_ID) === ownerHostId
  )
}

/** One machine's groups as the "Move group to…" tree, in sidebar order. */
export function getProjectGroupMoveTargets(
  groups: readonly MoveTargetGroup[],
  movingGroupId: string
): ProjectGroupMoveTarget[] {
  const ids = new Set(groups.map((group) => group.id))
  const childrenByParent = new Map<string | null, MoveTargetGroup[]>()
  for (const group of groups) {
    // An orphaned parent id renders at the top level, as the sidebar does.
    const parent = group.parentGroupId && ids.has(group.parentGroupId) ? group.parentGroupId : null
    childrenByParent.set(parent, [...(childrenByParent.get(parent) ?? []), group])
  }
  const blocked = getProjectGroupSubtreeIds(groups, movingGroupId)
  const targets: ProjectGroupMoveTarget[] = []
  const visit = (parent: string | null, depth: number): void => {
    const children = [...(childrenByParent.get(parent) ?? [])].sort(
      (left, right) => left.tabOrder - right.tabOrder || left.name.localeCompare(right.name)
    )
    for (const child of children) {
      targets.push({ id: child.id, name: child.name, depth, disabled: blocked.has(child.id) })
      visit(child.id, depth + 1)
    }
  }
  visit(null, 0)
  return targets
}

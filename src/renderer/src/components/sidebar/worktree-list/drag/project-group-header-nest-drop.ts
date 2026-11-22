import type { ProjectGroupHeaderDragRect } from './project-group-header-drop'
import {
  getRepoExecutionHostId,
  type ExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { ProjectGroup } from '../../../../../../shared/project/groups/project-group-types'

export type ProjectGroupNestTarget = { groupId: string; top: number; bottom: number }

// Only the centre of a group header nests; its top and bottom edges still reorder.
const NEST_EDGE_FRACTION = 0.3

type NestBandRect = Pick<ProjectGroupHeaderDragRect, 'groupId' | 'top' | 'bottom'>

/** The group header whose middle band holds the pointer; groups and projects share this hit test. */
export function findHeaderInNestBand<TRect extends NestBandRect>(
  pointerContentY: number,
  rects: readonly TRect[]
): TRect | undefined {
  return rects.find((rect) => {
    const edge = (rect.bottom - rect.top) * NEST_EDGE_FRACTION
    return pointerContentY >= rect.top + edge && pointerContentY <= rect.bottom - edge
  })
}

function isOwnSubgroup(
  candidateId: string,
  draggedGroupId: string,
  parentById: ReadonlyMap<string, string | null>
): boolean {
  const seen = new Set<string>()
  let cursor: string | null | undefined = candidateId
  while (cursor && !seen.has(cursor)) {
    if (cursor === draggedGroupId) {
      return true
    }
    seen.add(cursor)
    cursor = parentById.get(cursor)
  }
  return false
}

/** The group a dragged group would move into, or null when the pointer is not over a valid one. */
export function findProjectGroupNestTarget(args: {
  pointerContentY: number
  rects: readonly NestBandRect[]
  draggedGroupId: string
  parentById: ReadonlyMap<string, string | null>
  /** null marks an id two machines share: it has no single owner to nest under. */
  ownerHostIdById: ReadonlyMap<string, string | null>
}): ProjectGroupNestTarget | null {
  const draggedHostId = args.ownerHostIdById.get(args.draggedGroupId)
  const rect = findHeaderInNestBand(args.pointerContentY, args.rects)
  const valid =
    rect !== undefined &&
    draggedHostId != null &&
    args.ownerHostIdById.get(rect.groupId) === draggedHostId &&
    args.parentById.get(args.draggedGroupId) !== rect.groupId &&
    !isOwnSubgroup(rect.groupId, args.draggedGroupId, args.parentById)
  return valid ? { groupId: rect.groupId, top: rect.top, bottom: rect.bottom } : null
}

/** Owner machine per group id; an id shared by two hosts has no single owner, so it maps to null. */
export function getProjectGroupOwnerHostIdByGroupId(
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'connectionId' | 'executionHostId'>[]
): Map<string, ExecutionHostId | null> {
  const byGroupId = new Map<string, ExecutionHostId | null>()
  for (const group of projectGroups) {
    const hostId = getRepoExecutionHostId(group)
    const existing = byGroupId.get(group.id)
    byGroupId.set(group.id, existing === undefined || existing === hostId ? hostId : null)
  }
  return byGroupId
}

/** True when some machine owns at least two groups, so one can be dragged into another. */
export function hasSameHostGroupPair(ownerHostIdById: ReadonlyMap<string, string | null>): boolean {
  const seen = new Set<string>()
  for (const hostId of ownerHostIdById.values()) {
    if (hostId === null) {
      continue
    }
    if (seen.has(hostId)) {
      return true
    }
    seen.add(hostId)
  }
  return false
}

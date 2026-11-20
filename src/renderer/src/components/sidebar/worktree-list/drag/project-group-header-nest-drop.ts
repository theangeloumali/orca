import type { ProjectGroupHeaderDragRect } from './project-group-header-drop'

export type ProjectGroupNestTarget = { groupId: string; top: number; bottom: number }

// Only the centre of a group header nests; its top and bottom edges still reorder.
const NEST_EDGE_FRACTION = 0.3

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
  rects: readonly Pick<ProjectGroupHeaderDragRect, 'groupId' | 'top' | 'bottom'>[]
  draggedGroupId: string
  parentById: ReadonlyMap<string, string | null>
  /** null marks an id two machines share: it has no single owner to nest under. */
  ownerHostIdById: ReadonlyMap<string, string | null>
}): ProjectGroupNestTarget | null {
  const draggedHostId = args.ownerHostIdById.get(args.draggedGroupId)
  for (const rect of args.rects) {
    const edge = (rect.bottom - rect.top) * NEST_EDGE_FRACTION
    if (args.pointerContentY < rect.top + edge || args.pointerContentY > rect.bottom - edge) {
      continue
    }
    const valid =
      draggedHostId != null &&
      args.ownerHostIdById.get(rect.groupId) === draggedHostId &&
      args.parentById.get(args.draggedGroupId) !== rect.groupId &&
      !isOwnSubgroup(rect.groupId, args.draggedGroupId, args.parentById)
    return valid ? { groupId: rect.groupId, top: rect.top, bottom: rect.bottom } : null
  }
  return null
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

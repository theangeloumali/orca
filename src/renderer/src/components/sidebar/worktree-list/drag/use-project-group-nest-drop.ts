import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import {
  findProjectGroupNestTarget,
  type ProjectGroupNestTarget
} from './project-group-header-nest-drop'
import type { ProjectGroupHeaderDragItem } from './project-group-header-drop'
import type { ProjectGroupHeaderDragSession } from './project-group-header-drag-contract'

type NestDropArgs = {
  projectGroupById: ReadonlyMap<string, ProjectGroupHeaderDragItem>
  /** Owner machine per group id; null when two machines share an id. */
  projectGroupOwnerHostIdByGroupId: ReadonlyMap<string, string | null>
  onCommitProjectGroupParent: (groupId: string, parentGroupId: string) => void
}

export type ProjectGroupNestDrop = ReturnType<typeof useProjectGroupNestDrop>

/** Drag-to-nest for group headers: tracks the group under the pointer's middle band and commits it. */
export function useProjectGroupNestDrop(args: NestDropArgs) {
  const argsRef = useRef(args)
  useLayoutEffect(() => {
    argsRef.current = args
  })
  const targetRef = useRef<ProjectGroupNestTarget | null>(null)

  /** True when the pointer is over a header's middle band and the drop would nest. */
  const resolve = useCallback((session: ProjectGroupHeaderDragSession, contentY: number) => {
    const { projectGroupById, projectGroupOwnerHostIdByGroupId } = argsRef.current
    targetRef.current = findProjectGroupNestTarget({
      pointerContentY: contentY,
      rects: session.nestRects ?? [],
      draggedGroupId: session.groupId,
      parentById: new Map([...projectGroupById].map(([id, group]) => [id, group.parentGroupId])),
      ownerHostIdById: projectGroupOwnerHostIdByGroupId
    })
    return targetRef.current !== null
  }, [])

  const current = useCallback(() => targetRef.current, [])

  /** Clears the target, then nests the dragged group into it when the drop commits. */
  const finish = useCallback((groupId: string, commit: boolean) => {
    const target = targetRef.current
    targetRef.current = null
    if (commit && target) {
      argsRef.current.onCommitProjectGroupParent(groupId, target.groupId)
      return true
    }
    return false
  }, [])

  return useMemo(() => ({ resolve, current, finish }), [current, finish, resolve])
}

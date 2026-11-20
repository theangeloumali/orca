import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import {
  findProjectGroupNestTarget,
  type ProjectGroupNestTarget
} from './project-group-header-nest-drop'
import type { ProjectGroupHeaderDragItem } from './project-group-header-drop'
import type {
  ProjectGroupHeaderDragSession,
  ProjectGroupNestDrop
} from './project-group-header-drag-contract'

type NestDropArgs = {
  projectGroupById: ReadonlyMap<string, ProjectGroupHeaderDragItem>
  /** Owner machine per group id; null when two machines share an id. */
  projectGroupOwnerHostIdByGroupId: ReadonlyMap<string, string | null>
  onCommitProjectGroupParent: (groupId: string, parentGroupId: string) => void
}

/** Drag-to-nest for group headers: tracks the group under the pointer's middle band and commits it. */
export function useProjectGroupNestDrop(args: NestDropArgs): ProjectGroupNestDrop {
  const parentById = useMemo(
    () => new Map([...args.projectGroupById].map(([id, group]) => [id, group.parentGroupId])),
    [args.projectGroupById]
  )
  const argsRef = useRef({ ...args, parentById })
  useLayoutEffect(() => {
    argsRef.current = { ...args, parentById }
  })
  const targetRef = useRef<ProjectGroupNestTarget | null>(null)

  const resolve = useCallback((session: ProjectGroupHeaderDragSession, contentY: number) => {
    const { parentById, projectGroupOwnerHostIdByGroupId } = argsRef.current
    targetRef.current = findProjectGroupNestTarget({
      pointerContentY: contentY,
      rects: session.nestRects ?? [],
      draggedGroupId: session.groupId,
      parentById,
      ownerHostIdById: projectGroupOwnerHostIdByGroupId
    })
    return targetRef.current !== null
  }, [])

  const current = useCallback(() => targetRef.current, [])

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

import {
  getRootProjectHeaderDragKeys,
  measureRootProjectHeaderDragRects
} from './root-project-header-drop'
import type { PointerEvent } from 'react'

import {
  getProjectHeaderDragBucketKey,
  measureProjectHeaderDragRects,
  type ProjectHeaderDragBucketKey
} from './project-header-drop'
import {
  isProjectHeaderDragHandleTarget,
  isRepoHeaderActionTarget,
  type ProjectHeaderDragSession
} from './project-header-drag-contract'
import type { Repo } from '../../../../../../shared/repository/repo-types'

/** Whether a project header arms a drag: it needs a sibling to pass, or a group to be filed into. */
export function canDragProjectHeader(args: {
  headerDrag: {
    canReorderRepoHeaders: boolean
    hasProjectGroups: boolean
    sidebarRepoHeaderIdsByBucket: ReadonlyMap<ProjectHeaderDragBucketKey, readonly string[]>
  }
  bucketKey: ProjectHeaderDragBucketKey | undefined
  rootProjectHeaderCount: number | undefined
}): boolean {
  const { headerDrag, bucketKey } = args
  if (!headerDrag.canReorderRepoHeaders || !bucketKey) {
    return false
  }
  const siblingCount =
    args.rootProjectHeaderCount ??
    headerDrag.sidebarRepoHeaderIdsByBucket.get(bucketKey)?.length ??
    0
  return siblingCount > 1 || headerDrag.hasProjectGroups
}

export function createProjectHeaderDragSession(args: {
  event: PointerEvent<HTMLElement>
  repo: Repo
  registration: Repo
  sidebarRepoHeaderIdsByBucket: ReadonlyMap<ProjectHeaderDragBucketKey, readonly string[]>
  rootProjectHeaderKeys?: readonly string[]
  /** With groups to file into, a project alone in its bucket still has somewhere to go. */
  allowLoneProject?: boolean
  getScrollContainer: () => HTMLElement | null
}): ProjectHeaderDragSession | null {
  if (args.event.button !== 0) {
    return null
  }
  if (!isProjectHeaderDragHandleTarget(args.event.target, args.event.currentTarget)) {
    return null
  }
  if (isRepoHeaderActionTarget(args.event.target, args.event.currentTarget)) {
    return null
  }
  const bucketKey = getProjectHeaderDragBucketKey(args.repo)
  const rootProjectHeaderHostId = args.rootProjectHeaderKeys?.some((key) => key.startsWith('host:'))
    ? args.event.currentTarget.dataset.rootProjectHeaderHost
    : undefined
  const rootProjectHeaderKeys = getRootProjectHeaderDragKeys(
    args.rootProjectHeaderKeys,
    `repo:${args.repo.id}`,
    rootProjectHeaderHostId
  )
  const sidebarRepoHeaderIds =
    rootProjectHeaderKeys ?? args.sidebarRepoHeaderIdsByBucket.get(bucketKey) ?? []
  // A lone project cannot move within its bucket; preserve the collapse click instead.
  if (sidebarRepoHeaderIds.length <= 1 && !args.allowLoneProject) {
    return null
  }
  const container = args.getScrollContainer()
  if (!container) {
    return null
  }
  const handleEl = args.event.currentTarget
  // Delay pointer capture until promotion so ordinary clicks can still toggle collapse.
  return {
    repo: args.repo,
    registration: args.registration,
    bucketKey,
    sidebarRepoHeaderIds,
    pointerId: args.event.pointerId,
    rootProjectHeaderKeys,
    rootProjectHeaderHostId,
    headerRects: rootProjectHeaderKeys
      ? measureRootProjectHeaderDragRects(
          container,
          rootProjectHeaderKeys,
          rootProjectHeaderHostId
        ).map((rect) => ({
          ...rect,
          repoId: rect.key
        }))
      : measureProjectHeaderDragRects(container, bucketKey),
    nestRects: [],
    handleEl,
    startX: args.event.clientX,
    startY: args.event.clientY,
    latestPointerY: args.event.clientY,
    promoted: false
  }
}

import type { RootProjectHeaderDrag } from './root-project-header-drop'
import type { PointerEvent } from 'react'

import type { ProjectHeaderDragBucketKey, ProjectHeaderDragRect } from './project-header-drop'
import type { ProjectGroupHeaderDragRect } from './project-group-header-drop'
import type { ProjectGroupNestTarget } from './project-group-header-nest-drop'
import type { Repo } from '../../../../../../shared/repository/repo-types'

export type RepoDragState = {
  draggingRepoId: string | null
  dropIndex: number | null
  dropIndicatorY: number | null
  /** The group the project would be filed into; set instead of a reorder slot. */
  nestTarget: ProjectGroupNestTarget | null
}

/** One pointer position's outcome: a reorder slot or a group to file into. */
export type RepoDrop = Omit<RepoDragState, 'draggingRepoId'>

export const INITIAL_REPO_DRAG_STATE: RepoDragState = {
  draggingRepoId: null,
  dropIndex: null,
  dropIndicatorY: null,
  nestTarget: null
}

export type UseRepoHeaderDragArgs = RootProjectHeaderDrag & {
  orderedRepoIds: string[]
  sidebarRepoHeaderIdsByBucket: ReadonlyMap<ProjectHeaderDragBucketKey, readonly string[]>
  repoById: ReadonlyMap<string, Repo>
  getLiveRepos: () => readonly Repo[]
  usesProjectGroupOrdering: boolean
  onCommitRepoOrder: (orderedIds: string[]) => void
  onCommitProjectGroupOrder: (project: Repo, projectGroupId: string | null, order: number) => void
  /** Owner machine per group id; null when two machines share an id. */
  projectGroupOwnerHostIdByGroupId: ReadonlyMap<string, string | null>
  getScrollContainer: () => HTMLElement | null
}

export type RepoHeaderDragController = {
  state: RepoDragState
  /** repo anchors the reorder; registration is the clicked row's own copy, which a nest files. */
  onHandlePointerDown: (event: PointerEvent<HTMLElement>, repo: Repo, registration: Repo) => void
}

export type ProjectHeaderDragSession = {
  // Why the row, not its id: a twin on another host shares the id.
  repo: Repo
  // Why apart from repo: a cross-host header's anchor may be another machine's copy.
  registration: Repo
  bucketKey: ProjectHeaderDragBucketKey
  sidebarRepoHeaderIds: readonly string[]
  rootProjectHeaderKeys?: readonly string[]
  rootProjectHeaderHostId?: string
  pointerId: number
  headerRects: ProjectHeaderDragRect[]
  /** Every group header, so the project can be filed into any visible group. */
  nestRects: ProjectGroupHeaderDragRect[]
  handleEl: HTMLElement
  startX: number
  startY: number
  latestPointerY: number
  promoted: boolean
}

export const PROJECT_HEADER_DRAG_THRESHOLD_PX = 4

const REPO_HEADER_DRAG_HANDLE_SELECTOR = '[data-repo-header-drag-handle]'

// Shared with project-group headers: both reuse ProjectHeaderActions markup.
export const REPO_HEADER_ACTION_SELECTOR =
  '[data-repo-header-actions], [data-repo-header-action], [data-repo-header-collapse-affordance], button, a, input, textarea, select, [contenteditable=""], [contenteditable="true"]'

export function isProjectHeaderDragHandleTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // SVG icons are Elements too; allow dragging by the project icon.
  if (!(target instanceof Element)) {
    return false
  }
  const dragHandle = target.closest(REPO_HEADER_DRAG_HANDLE_SELECTOR)
  return dragHandle !== null && currentTarget.contains(dragHandle)
}

export function isRepoHeaderActionTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // SVG action icons must not arm a header drag.
  if (!(target instanceof Element) || target === currentTarget) {
    return false
  }
  return currentTarget.contains(target) && target.closest(REPO_HEADER_ACTION_SELECTOR) !== null
}

import type React from 'react'
import '../drag/project-header-drag'
import { isRepoHeaderActionTarget } from '../drag/project-header-drag-contract'
import {
  isProjectOrPinnedSectionGroupKey,
  parseProjectGroupHeaderKey
} from '../../../../../../shared/sidebar-list/sections/group-keys'

export function stopRepoHeaderKeyboardToggle(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation()
  }
}

export function stopNestedWorktreeCardBubble(event: React.SyntheticEvent<HTMLElement>): void {
  event.stopPropagation()
}

export function handleRepoHeaderActionPointerDown(event: React.PointerEvent<HTMLElement>): void {
  event.stopPropagation()
}

export function handleRepoHeaderCollapseAffordancePointerDown(
  event: React.PointerEvent<HTMLElement>
): void {
  event.stopPropagation()
}

export function stopRepoHeaderMenuEvent(event: React.SyntheticEvent<HTMLElement>): void {
  event.stopPropagation()
}

export function shouldIgnoreRepoHeaderToggle(event: React.SyntheticEvent<HTMLElement>): boolean {
  return isRepoHeaderActionTarget(event.target, event.currentTarget)
}

// Alt/Option-click folds a group's whole subtree, or (also for an empty subtree) all projects and Pinned.
export function toggleSectionHeaderCollapse(
  event: Pick<React.MouseEvent | React.KeyboardEvent, 'altKey'>,
  collapseKey: string,
  ctx: {
    toggleGroupWithScrollAnchor: (key: string) => void
    toggleAllProjects?: () => void
    /** False when nothing listed sits beneath the group. */
    toggleProjectGroupSubtree?: (groupId: string) => boolean
  }
): void {
  const subtreeGroupId = event.altKey
    ? (parseProjectGroupHeaderKey(collapseKey)?.groupId ?? null)
    : null
  if (subtreeGroupId && ctx.toggleProjectGroupSubtree?.(subtreeGroupId)) {
    return
  }
  if (event.altKey && ctx.toggleAllProjects && isProjectOrPinnedSectionGroupKey(collapseKey)) {
    ctx.toggleAllProjects()
    return
  }
  ctx.toggleGroupWithScrollAnchor(collapseKey)
}

import type React from 'react'
import '../drag/project-header-drag'
import { isRepoHeaderActionTarget } from '../drag/project-header-drag-contract'
import {
  getProjectGroupHeaderKey,
  isProjectOrPinnedSectionGroupKey
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

const PROJECT_GROUP_KEY_PREFIX = 'project-group:'
const UNGROUPED_PROJECT_GROUP_KEY = getProjectGroupHeaderKey(null)

function getSubtreeGroupId(collapseKey: string): string | null {
  return collapseKey.startsWith(PROJECT_GROUP_KEY_PREFIX) &&
    collapseKey !== UNGROUPED_PROJECT_GROUP_KEY
    ? collapseKey.slice(PROJECT_GROUP_KEY_PREFIX.length)
    : null
}

// Alt/Option-click folds a group's whole subtree, or on other headers all projects and Pinned.
export function toggleSectionHeaderCollapse(
  event: Pick<React.MouseEvent | React.KeyboardEvent, 'altKey'>,
  collapseKey: string,
  ctx: {
    toggleGroupWithScrollAnchor: (key: string) => void
    toggleAllProjects?: () => void
    toggleProjectGroupSubtree?: (groupId: string) => void
  }
): void {
  const subtreeGroupId = event.altKey ? getSubtreeGroupId(collapseKey) : null
  if (subtreeGroupId && ctx.toggleProjectGroupSubtree) {
    ctx.toggleProjectGroupSubtree(subtreeGroupId)
    return
  }
  if (event.altKey && ctx.toggleAllProjects && isProjectOrPinnedSectionGroupKey(collapseKey)) {
    ctx.toggleAllProjects()
    return
  }
  ctx.toggleGroupWithScrollAnchor(collapseKey)
}

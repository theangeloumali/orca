import type { Worktree } from '../../worktree/types'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import { UNGROUPED_PROJECT_GROUP_KEY } from '../../project/groups/project-groups'

import '../../workspace-view/workspace-pr-groups'

export { UNGROUPED_PROJECT_GROUP_KEY }

const PROJECT_GROUP_KEY_PREFIX = 'project-group:'

export function getProjectGroupHeaderKey(groupId: string | null): string {
  return groupId ? `${PROJECT_GROUP_KEY_PREFIX}${groupId}` : UNGROUPED_PROJECT_GROUP_KEY
}

/** Inverse of getProjectGroupHeaderKey: null for other headers, groupId null for Ungrouped. */
export function parseProjectGroupHeaderKey(key: string): { groupId: string | null } | null {
  if (key === UNGROUPED_PROJECT_GROUP_KEY) {
    return { groupId: null }
  }
  return key.startsWith(PROJECT_GROUP_KEY_PREFIX)
    ? { groupId: key.slice(PROJECT_GROUP_KEY_PREFIX.length) }
    : null
}

export const PINNED_GROUP_KEY = 'pinned'

export const BOTS_GROUP_KEY = 'bots'

/** The whole Projects section, foldable while the Bots section sits above it. */
export const PROJECTS_SECTION_GROUP_KEY = 'projects-section'

/** Repo, project, and project-group headers; never status, PR, pinned, lineage, or host sections. */
export function isProjectSectionGroupKey(key: string): boolean {
  return (
    key.startsWith('repo:') ||
    key.startsWith('project:') ||
    key.startsWith(PROJECT_GROUP_KEY_PREFIX)
  )
}

export function isProjectOrPinnedSectionGroupKey(key: string): boolean {
  return key === PINNED_GROUP_KEY || isProjectSectionGroupKey(key)
}

export const ALL_GROUP_KEY = 'all'

export const LINEAGE_GROUP_PREFIX = 'lineage:'

export function getLineageGroupKey(worktreeId: string): string {
  return `${LINEAGE_GROUP_PREFIX}${worktreeId}`
}

export function getWorktreeLineageGroupKey(worktree: Pick<Worktree, 'id' | 'hostId'>): string {
  return getLineageGroupKey(worktree.hostId ? getWorktreeHostIdentity(worktree) : worktree.id)
}

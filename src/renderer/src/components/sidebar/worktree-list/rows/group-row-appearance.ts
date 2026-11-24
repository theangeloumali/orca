import type { CSSProperties } from 'react'
import {
  resolveProjectGroupColor,
  resolveProjectGroupTint,
  type ProjectGroupColorLink,
  type ProjectGroupTint,
  type ProjectGroupTints
} from '../../../../../../shared/project/groups/project-group-appearance'
import {
  SIDEBAR_CONTRAST_THEMES,
  hostTintPercents,
  type HostTintPercents,
  type SidebarContrastPalette
} from '../../../../../../shared/execution-host/host-tint-contrast'

export type GroupRowAppearance = {
  groupId: string
  color: string
  tint: ProjectGroupTint
  tintPercents: HostTintPercents
}

type GroupColorStyle = CSSProperties & {
  '--group-color': string
  '--group-tint-subtle': string
  '--group-tint-strong': string
}

type RepoGroupLink = { projectGroupId?: string | null }

/** The row shapes that can name a project group; RenderRow is assignable to this. */
type GroupLinkedRow =
  | { type: 'header'; projectGroup?: { id: string | null }; repo?: RepoGroupLink }
  | { type: 'folder-workspace'; projectGroup: { id: string } }
  | {
      type: 'item' | 'pending-creation' | 'new-external-worktrees-inbox' | 'imported-worktrees-card'
      repo?: RepoGroupLink
    }
  | { type: 'host-header' | 'client-grouping-hint' }

function rowProjectGroupId(row: GroupLinkedRow): string | null {
  if (row.type === 'header') {
    return row.projectGroup?.id ?? row.repo?.projectGroupId ?? null
  }
  if (row.type === 'folder-workspace') {
    return row.projectGroup.id
  }
  return 'repo' in row ? (row.repo?.projectGroupId ?? null) : null
}

/** A group checked out on several hosts has one copy per host; the colored copy speaks for it. */
function indexColoredCopies(
  groups: readonly ProjectGroupColorLink[]
): Map<string, ProjectGroupColorLink> {
  const groupsById = new Map<string, ProjectGroupColorLink>()
  for (const group of groups) {
    if (!groupsById.get(group.id)?.color) {
      groupsById.set(group.id, group)
    }
  }
  return groupsById
}

/** One pass; rows that resolve to the same colored group share one appearance object. */
export function buildGroupRowAppearance(
  rows: readonly GroupLinkedRow[],
  groups: readonly ProjectGroupColorLink[],
  tints: ProjectGroupTints | undefined,
  palettes: readonly SidebarContrastPalette[] | null = SIDEBAR_CONTRAST_THEMES
): (GroupRowAppearance | null)[] {
  const groupsById = indexColoredCopies(groups)
  const byGroupId = new Map<string, GroupRowAppearance | null>()
  const appearanceFor = (groupId: string): GroupRowAppearance | null => {
    if (byGroupId.has(groupId)) {
      return byGroupId.get(groupId) ?? null
    }
    const resolved = resolveProjectGroupColor(groupsById, groupId)
    const owner = resolved ? byGroupId.get(resolved.groupId) : undefined
    const appearance =
      owner ??
      (resolved && {
        groupId: resolved.groupId,
        color: resolved.color,
        tint: resolveProjectGroupTint(tints, resolved.groupId),
        tintPercents: hostTintPercents(resolved.color, palettes)
      })
    byGroupId.set(groupId, appearance)
    if (appearance) {
      byGroupId.set(appearance.groupId, appearance)
    }
    return appearance
  }
  return rows.map((row) => {
    const groupId = rowProjectGroupId(row)
    return groupId ? appearanceFor(groupId) : null
  })
}

export function groupColorStyle(
  appearance: GroupRowAppearance | null | undefined
): GroupColorStyle | undefined {
  if (!appearance) {
    return undefined
  }
  return {
    '--group-color': appearance.color,
    '--group-tint-subtle': `${appearance.tintPercents.subtle}%`,
    '--group-tint-strong': `${appearance.tintPercents.strong}%`
  }
}

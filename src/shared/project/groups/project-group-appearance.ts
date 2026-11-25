import type { ProjectGroup } from './project-group-types'
import { normalizeRepoBadgeColor } from '../../repository/appearance/repo-badge-color'
import { DEFAULT_HOST_SECTION_TINT, HOST_SECTION_TINTS } from '../../execution-host/host-appearance'
import type { HostSectionTint } from '../../execution-host/host-setting-overrides'

export type ProjectGroupTint = HostSectionTint
/** Per-computer sidebar background strength by group id; group colors sync on the group. */
export type ProjectGroupTintSettings = {
  projectGroupTints?: Partial<Record<string, ProjectGroupTint>>
}
/** Every explicit choice is stored; a group with no key follows the group that owns its color. */
export type ProjectGroupTints = NonNullable<ProjectGroupTintSettings['projectGroupTints']>
export type ProjectGroupColorLink = Pick<ProjectGroup, 'id' | 'parentGroupId' | 'color'>
export type ResolvedProjectGroupColor = { groupId: string; color: string }
/** One host's copy of a group; updatedAt picks the latest write across hosts. */
export type ProjectGroupColorCopy = ProjectGroupColorLink & Pick<ProjectGroup, 'updatedAt'>

/** The nearest group up the parent chain with a valid color; null lets the machine tint show. */
export function resolveProjectGroupColor(
  groupsById: ReadonlyMap<string, ProjectGroupColorLink>,
  groupId: string | null | undefined
): ResolvedProjectGroupColor | null {
  const visited = new Set<string>()
  let current = groupId ? groupsById.get(groupId) : undefined
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    const color = normalizeRepoBadgeColor(current.color)
    if (color) {
      return { groupId: current.id, color }
    }
    current = current.parentGroupId ? groupsById.get(current.parentGroupId) : undefined
  }
  return null
}

const holdsColorChoice = (copy: ProjectGroupColorLink): boolean =>
  copy.color === null || normalizeRepoBadgeColor(copy.color) !== null

function outranks(candidate: ProjectGroupColorCopy, current: ProjectGroupColorCopy): boolean {
  if (!holdsColorChoice(candidate)) {
    return false
  }
  if (!holdsColorChoice(current)) {
    return true
  }
  if (candidate.updatedAt !== current.updatedAt) {
    return candidate.updatedAt > current.updatedAt
  }
  return (
    !normalizeRepoBadgeColor(current.color) && normalizeRepoBadgeColor(candidate.color) !== null
  )
}

/** Last write wins across a group's host copies, so a copy that missed a save can't mask it.
    An invalid hex is no choice; on a tie, the copy holding a color wins. */
export function indexProjectGroupColorOwners<T extends ProjectGroupColorCopy>(
  groups: readonly T[]
): Map<string, T> {
  const ownersById = new Map<string, T>()
  for (const group of groups) {
    const current = ownersById.get(group.id)
    if (!current || outranks(group, current)) {
      ownersById.set(group.id, group)
    }
  }
  return ownersById
}

/** The color a group shows from its own copies, under the same owner rule as the sidebar. */
export function projectGroupOwnerColor(
  groups: readonly ProjectGroupColorCopy[],
  groupId: string
): string | null {
  return normalizeRepoBadgeColor(indexProjectGroupColorOwners(groups).get(groupId)?.color)
}

export function resolveProjectGroupTint(
  tints: ProjectGroupTints | undefined,
  groupId: string
): ProjectGroupTint {
  const stored = tints?.[groupId]
  return HOST_SECTION_TINTS.find((tint) => tint === stored) ?? DEFAULT_HOST_SECTION_TINT
}

/** A nested group's own Background wins; otherwise it follows the group that owns its color. */
export function resolveProjectGroupRowTint(
  tints: ProjectGroupTints | undefined,
  groupId: string,
  ownerGroupId: string
): ProjectGroupTint {
  return resolveProjectGroupTint(tints, tints?.[groupId] ? groupId : ownerGroupId)
}

export function setProjectGroupTint(
  tints: ProjectGroupTints | undefined,
  groupId: string,
  tint: ProjectGroupTint
): ProjectGroupTints {
  return { ...tints, [groupId]: tint }
}

/** Drops the backgrounds of removed groups; null when none had one, so callers skip the write. */
export function withoutProjectGroupTints(
  tints: ProjectGroupTints | undefined,
  removedGroupIds: ReadonlySet<string>
): ProjectGroupTints | null {
  const entries = Object.entries(tints ?? {})
  const kept = entries.filter(([groupId]) => !removedGroupIds.has(groupId))
  return kept.length === entries.length ? null : Object.fromEntries(kept)
}

/** null (None) clears the synced color; an invalid hex yields no update at all. */
export function projectGroupColorUpdate(color: string | null): { color: string | null } | null {
  if (color === null) {
    return { color: null }
  }
  const normalized = normalizeRepoBadgeColor(color)
  return normalized ? { color: normalized } : null
}

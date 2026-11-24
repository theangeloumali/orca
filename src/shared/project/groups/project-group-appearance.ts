import type { ProjectGroup } from './project-group-types'
import { normalizeRepoBadgeColor } from '../../repository/appearance/repo-badge-color'
import { DEFAULT_HOST_SECTION_TINT, HOST_SECTION_TINTS } from '../../execution-host/host-appearance'
import type { HostSectionTint } from '../../execution-host/host-setting-overrides'
import type { GlobalSettings } from '../../settings/global-settings-types'

export type ProjectGroupTint = HostSectionTint
/** Subtle (the default) stores no key. */
export type ProjectGroupTints = NonNullable<GlobalSettings['projectGroupTints']>
export type ProjectGroupColorLink = Pick<ProjectGroup, 'id' | 'parentGroupId' | 'color'>
export type ResolvedProjectGroupColor = { groupId: string; color: string }

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

export function resolveProjectGroupTint(
  tints: ProjectGroupTints | undefined,
  groupId: string
): ProjectGroupTint {
  const stored = tints?.[groupId]
  return HOST_SECTION_TINTS.find((tint) => tint === stored) ?? DEFAULT_HOST_SECTION_TINT
}

export function setProjectGroupTint(
  tints: ProjectGroupTints | undefined,
  groupId: string,
  tint: ProjectGroupTint
): ProjectGroupTints {
  const { [groupId]: _previous, ...rest } = tints ?? {}
  return tint === DEFAULT_HOST_SECTION_TINT ? rest : { ...rest, [groupId]: tint }
}

/** null (None) clears the synced color; an invalid hex yields no update at all. */
export function projectGroupColorUpdate(color: string | null): { color: string | null } | null {
  if (color === null) {
    return { color: null }
  }
  const normalized = normalizeRepoBadgeColor(color)
  return normalized ? { color: normalized } : null
}
